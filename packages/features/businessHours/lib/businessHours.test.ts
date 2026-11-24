import { describe, expect, it } from "vitest";

import {
  BusinessHoursValidationError,
  getCurrentOffsetMinutes,
  isWithinBusinessHours,
  normalizeOverride,
  normalizeWeeklyIntervals,
} from "./businessHours";

const h = (n: number) => n * 60;
const TZ = "America/New_York";
// Salvo no inverno: EST = UTC-5
const winterConfig = (intervals = normalizeWeeklyIntervals([{ day: 1, start: h(9), end: h(18) }])) => ({
  offsetMinutes: -300,
  intervals,
  overrides: [] as { date: string; intervals: { start: number; end: number }[] }[],
});

describe("normalizeWeeklyIntervals", () => {
  it("divide expediente que passa da meia-noite", () => {
    expect(normalizeWeeklyIntervals([{ day: 1, start: h(22), end: h(6) }])).toEqual([
      { day: 1, start: h(22), end: 1440 },
      { day: 2, start: 0, end: h(6) },
    ]);
  });
  it("aceita vários intervalos no dia", () => {
    expect(
      normalizeWeeklyIntervals([
        { day: 1, start: h(14), end: h(18) },
        { day: 1, start: h(9), end: h(12) },
      ])
    ).toHaveLength(2);
  });
  it("rejeita sobreposição", () => {
    expect(() =>
      normalizeWeeklyIntervals([
        { day: 1, start: h(9), end: h(12) },
        { day: 1, start: h(11), end: h(13) },
      ])
    ).toThrow(BusinessHoursValidationError);
  });
  it("rejeita sobreposição criada pela divisão da meia-noite", () => {
    expect(() =>
      normalizeWeeklyIntervals([
        { day: 1, start: h(22), end: h(6) },
        { day: 2, start: h(5), end: h(9) },
      ])
    ).toThrow(BusinessHoursValidationError);
  });
  it("rejeita override com data inválida", () => {
    expect(() => normalizeOverride({ date: "2026-13-01", intervals: [] })).toThrow();
  });
});

describe("isWithinBusinessHours", () => {
  it("slot dentro do expediente", () => {
    // seg 2026-01-05 10:00 EST = 15:00Z
    expect(
      isWithinBusinessHours(winterConfig(), TZ, new Date("2026-01-05T15:00:00Z"), new Date("2026-01-05T16:00:00Z"))
    ).toBe(true);
  });
  it("slot que não cabe inteiro (17h30–18h30) fica fora", () => {
    expect(
      isWithinBusinessHours(winterConfig(), TZ, new Date("2026-01-05T22:30:00Z"), new Date("2026-01-05T23:30:00Z"))
    ).toBe(false);
  });
  it("offset fixo: após DST, 9h salvo no inverno vira 10h local", () => {
    // seg 2026-06-01 09:00 EDT = 13:00Z = 08:00 no offset fixo -05 → fora
    expect(
      isWithinBusinessHours(winterConfig(), TZ, new Date("2026-06-01T13:00:00Z"), new Date("2026-06-01T14:00:00Z"))
    ).toBe(false);
    // 10:00 EDT = 14:00Z = 09:00 fixo → dentro
    expect(
      isWithinBusinessHours(winterConfig(), TZ, new Date("2026-06-01T14:00:00Z"), new Date("2026-06-01T15:00:00Z"))
    ).toBe(true);
  });
  it("troca de fuso mantém os instantes absolutos", () => {
    const config = winterConfig();
    const start = new Date("2026-01-05T15:00:00Z");
    const end = new Date("2026-01-05T16:00:00Z");
    expect(isWithinBusinessHours(config, "Asia/Tokyo", start, end)).toBe(
      isWithinBusinessHours(config, TZ, start, end)
    );
  });
  it("slot 23h30–00h30 permitido em expediente que passa da meia-noite", () => {
    const config = winterConfig(normalizeWeeklyIntervals([{ day: 1, start: h(22), end: h(6) }]));
    // seg 23:30 EST = ter 04:30Z
    expect(
      isWithinBusinessHours(config, TZ, new Date("2026-01-06T04:30:00Z"), new Date("2026-01-06T05:30:00Z"))
    ).toBe(true);
  });
  it("override substitui a regra semanal do dia local", () => {
    const config = winterConfig();
    config.overrides = [{ date: "2026-01-05", intervals: [{ start: h(13), end: h(15) }] }];
    expect(
      isWithinBusinessHours(config, TZ, new Date("2026-01-05T15:00:00Z"), new Date("2026-01-05T16:00:00Z"))
    ).toBe(false);
    expect(
      isWithinBusinessHours(config, TZ, new Date("2026-01-05T18:00:00Z"), new Date("2026-01-05T19:00:00Z"))
    ).toBe(true);
  });
  it("override vazio fecha o dia (feriado)", () => {
    const config = winterConfig();
    config.overrides = [{ date: "2026-01-05", intervals: [] }];
    expect(
      isWithinBusinessHours(config, TZ, new Date("2026-01-05T15:00:00Z"), new Date("2026-01-05T16:00:00Z"))
    ).toBe(false);
  });
  it("offset atual do fuso", () => {
    expect(getCurrentOffsetMinutes(TZ, new Date("2026-01-05T00:00:00Z"))).toBe(-300);
  });
});
