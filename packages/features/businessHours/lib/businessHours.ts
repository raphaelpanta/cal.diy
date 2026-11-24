import dayjs from "@calcom/dayjs";

/**
 * Horário comercial (feature exercicio-003). Regras em CLAUDE.md:
 * - Intervalos semanais em minutos locais, interpretados com o offset UTC FIXO salvo (não acompanha DST).
 * - Expedientes que passam da meia-noite são armazenados divididos por dia; pedaços contíguos formam uma janela.
 * - Override por data substitui por completo o dia local do organizador (fuso atual do perfil).
 * - Um slot só está dentro do horário se couber inteiro em uma janela.
 */

export const MINUTES_IN_DAY = 1440;
const MINUTE_MS = 60_000;
const DAY_MS = MINUTES_IN_DAY * MINUTE_MS;

export type DayInterval = { day: number; start: number; end: number };
export type TimeInterval = { start: number; end: number };
export type DateOverride = { date: string; intervals: TimeInterval[] };

export type BusinessHoursConfig = {
  offsetMinutes: number;
  intervals: DayInterval[];
  overrides: DateOverride[];
};

/** Entrada do usuário: `end <= start` significa que o expediente passa da meia-noite. */
export type DayIntervalInput = { day: number; start: number; end: number };

export class BusinessHoursValidationError extends Error {}

const isValidMinute = (m: number) => Number.isInteger(m) && m >= 0 && m <= MINUTES_IN_DAY;

/** Divide expedientes que passam da meia-noite em pedaços por dia (ex.: seg 22h–06h → seg 22h–24h + ter 0h–06h). */
export function splitOvernight(input: DayIntervalInput[]): DayInterval[] {
  const result: DayInterval[] = [];
  for (const { day, start, end } of input) {
    if (!Number.isInteger(day) || day < 0 || day > 6 || !isValidMinute(start) || !isValidMinute(end)) {
      throw new BusinessHoursValidationError("invalid_business_hours_interval");
    }
    if (start === end) throw new BusinessHoursValidationError("invalid_business_hours_interval");
    if (end > start) {
      result.push({ day, start, end });
    } else {
      if (start < MINUTES_IN_DAY) result.push({ day, start, end: MINUTES_IN_DAY });
      if (end > 0) result.push({ day: (day + 1) % 7, start: 0, end });
    }
  }
  return result;
}

function assertNoOverlap(intervals: TimeInterval[]) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      throw new BusinessHoursValidationError("business_hours_overlapping_intervals");
    }
  }
}

/** Valida e normaliza os intervalos semanais. Sobreposição no mesmo dia é rejeitada (sem mescla automática). */
export function normalizeWeeklyIntervals(input: DayIntervalInput[]): DayInterval[] {
  const split = splitOvernight(input);
  for (let day = 0; day < 7; day++) assertNoOverlap(split.filter((i) => i.day === day));
  return split.sort((a, b) => a.day - b.day || a.start - b.start);
}

export function normalizeOverride(override: DateOverride): DateOverride {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(override.date) || !dayjs(override.date, "YYYY-MM-DD", true).isValid()) {
    throw new BusinessHoursValidationError("invalid_business_hours_override_date");
  }
  for (const { start, end } of override.intervals) {
    if (!isValidMinute(start) || !isValidMinute(end) || end <= start) {
      throw new BusinessHoursValidationError("invalid_business_hours_interval");
    }
  }
  assertNoOverlap(override.intervals);
  return { date: override.date, intervals: [...override.intervals].sort((a, b) => a.start - b.start) };
}

type Window = { start: number; end: number }; // epoch ms

function subtract(windows: Window[], cut: Window): Window[] {
  const out: Window[] = [];
  for (const w of windows) {
    if (w.end <= cut.start || w.start >= cut.end) {
      out.push(w);
      continue;
    }
    if (w.start < cut.start) out.push({ start: w.start, end: cut.start });
    if (w.end > cut.end) out.push({ start: cut.end, end: w.end });
  }
  return out;
}

function mergeContiguous(windows: Window[]): Window[] {
  const sorted = [...windows].sort((a, b) => a.start - b.start);
  const out: Window[] = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
    else out.push({ ...w });
  }
  return out;
}

/** Janelas absolutas (UTC) de horário comercial que cobrem [from, to]. */
export function getBusinessWindows(
  config: BusinessHoursConfig,
  organizerTimeZone: string,
  from: Date,
  to: Date
): Window[] {
  const offsetMs = config.offsetMinutes * MINUTE_MS;
  // Regra semanal no referencial de offset fixo.
  const firstDay = Math.floor((from.getTime() + offsetMs) / DAY_MS) - 1;
  const lastDay = Math.floor((to.getTime() + offsetMs) / DAY_MS) + 1;
  let windows: Window[] = [];
  for (let d = firstDay; d <= lastDay; d++) {
    const weekday = (((d + 4) % 7) + 7) % 7; // 1970-01-01 foi quinta-feira (4)
    const dayStartUtc = d * DAY_MS - offsetMs;
    for (const i of config.intervals) {
      if (i.day !== weekday) continue;
      windows.push({ start: dayStartUtc + i.start * MINUTE_MS, end: dayStartUtc + i.end * MINUTE_MS });
    }
  }

  // Overrides: o dia local do organizador é substituído por completo.
  const fromLocal = dayjs(from).tz(organizerTimeZone).subtract(1, "day").format("YYYY-MM-DD");
  const toLocal = dayjs(to).tz(organizerTimeZone).add(1, "day").format("YYYY-MM-DD");
  for (const o of config.overrides) {
    if (o.date < fromLocal || o.date > toLocal) continue;
    const dayStart = dayjs.tz(o.date, organizerTimeZone);
    const dayEnd = dayStart.add(1, "day");
    windows = subtract(windows, { start: dayStart.valueOf(), end: dayEnd.valueOf() });
    for (const i of o.intervals) {
      windows.push({
        start: dayStart.add(i.start, "minute").valueOf(),
        end: i.end === MINUTES_IN_DAY ? dayEnd.valueOf() : dayStart.add(i.end, "minute").valueOf(),
      });
    }
  }

  return mergeContiguous(windows);
}

/** true se o intervalo [start, end] cabe inteiro em uma janela de horário comercial. */
export function isWithinBusinessHours(
  config: BusinessHoursConfig,
  organizerTimeZone: string,
  start: Date,
  end: Date
): boolean {
  const s = start.getTime();
  const e = end.getTime();
  return getBusinessWindows(config, organizerTimeZone, start, end).some((w) => w.start <= s && e <= w.end);
}

/** Offset UTC atual (minutos) de um fuso — gravado no momento do salvamento. */
export function getCurrentOffsetMinutes(timeZone: string, now: Date = new Date()): number {
  return dayjs(now).tz(timeZone).utcOffset();
}
