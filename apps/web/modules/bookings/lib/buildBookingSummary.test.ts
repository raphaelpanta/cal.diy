import dayjs from "@calcom/dayjs";
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import type { BookingSummaryInput } from "./buildBookingSummary";
import { buildBookingSummary } from "./buildBookingSummary";

const EN_LABELS: Record<string, string> = {
  title: "Title",
  date: "Date",
  time: "Time",
  timezone: "Timezone",
  location: "Location",
};

const PT_BR_LABELS: Record<string, string> = {
  title: "Título",
  date: "Data",
  time: "Hora",
  timezone: "Fuso Horário",
  location: "Local",
};

const translateWith = (labels: Record<string, string>): TFunction =>
  ((key: string) => labels[key] ?? key) as unknown as TFunction;

// Some ICU versions (e.g. the one bundled with Node 20) put a narrow no-break space before AM/PM.
const normalizeSpaces = (text: string): string => text.replace(/[^\S\n]/g, " ");

// 2026-11-25 14:00-14:30 in São Paulo
const START_TIME = "2026-11-25T17:00:00.000Z";
const END_TIME = "2026-11-25T17:30:00.000Z";

const baseInput: BookingSummaryInput = {
  title: "30 min meeting between Pro Example and Test Testson",
  startTime: START_TIME,
  endTime: END_TIME,
  timeZone: "America/Sao_Paulo",
  locale: "en",
  is24h: false,
  location: "https://cal.com/video/abc123",
  t: translateWith(EN_LABELS),
};

describe("buildBookingSummary", () => {
  it("lists title, date, time, time zone and location, one per line", () => {
    const summary = buildBookingSummary(baseInput);

    expect(normalizeSpaces(summary)).toBe(
      [
        "Title: 30 min meeting between Pro Example and Test Testson",
        "Date: Wednesday, November 25, 2026",
        "Time: 2:00 PM - 2:30 PM",
        "Timezone: Brasilia Standard Time",
        "Location: https://cal.com/video/abc123",
      ].join("\n")
    );
  });

  it("expresses the date and times in the given time zone", () => {
    const summary = buildBookingSummary({
      ...baseInput,
      startTime: "2026-11-25T23:30:00.000Z",
      endTime: "2026-11-26T00:00:00.000Z",
      timeZone: "Asia/Tokyo",
    });

    expect(normalizeSpaces(summary)).toContain(
      ["Date: Thursday, November 26, 2026", "Time: 8:30 AM - 9:00 AM", "Timezone: Japan Standard Time"].join(
        "\n"
      )
    );
  });

  it("ignores the time zone the start and end values carry", () => {
    const summary = buildBookingSummary({
      ...baseInput,
      startTime: dayjs.utc(START_TIME).tz("Asia/Tokyo"),
      endTime: new Date(END_TIME),
    });

    expect(summary).toBe(buildBookingSummary(baseInput));
  });

  it("uses the 24-hour clock when requested", () => {
    const summary = buildBookingSummary({ ...baseInput, is24h: true });

    expect(summary).toContain("Time: 14:00 - 14:30");
  });

  it("translates the labels and localizes the values", () => {
    const summary = buildBookingSummary({
      ...baseInput,
      locale: "pt-BR",
      is24h: true,
      t: translateWith(PT_BR_LABELS),
    });

    expect(normalizeSpaces(summary)).toBe(
      [
        "Título: 30 min meeting between Pro Example and Test Testson",
        "Data: quarta-feira, 25 de novembro de 2026",
        "Hora: 14:00 - 14:30",
        "Fuso Horário: Horário Padrão de Brasília",
        "Local: https://cal.com/video/abc123",
      ].join("\n")
    );
  });

  it("keeps a non-link location as it is shown on the page", () => {
    const summary = buildBookingSummary({ ...baseInput, location: "Av. Paulista, 1000 - São Paulo" });

    expect(summary.split("\n").at(-1)).toBe("Location: Av. Paulista, 1000 - São Paulo");
  });

  it.each([null, undefined, ""])("omits the location line when the location is %j", (location) => {
    const summary = buildBookingSummary({ ...baseInput, location });

    expect(summary.split("\n")).toHaveLength(4);
    expect(summary).not.toContain("Location");
  });
});
