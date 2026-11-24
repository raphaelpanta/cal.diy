import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { buildBookingSummary } from "./buildBookingSummary";

const labels = { what: "What", when: "When", timezone: "Timezone", where: "Where" };
const base = {
  title: "30 min meeting between Alice and Bob",
  start: dayjs.utc("2026-12-01T14:00:00Z"),
  durationMinutes: 30,
  timeZone: "America/Sao_Paulo",
  locale: "en",
  is24h: true,
  labels,
};

describe("buildBookingSummary", () => {
  it("includes title, date, time range, timezone and location", () => {
    const lines = buildBookingSummary({ ...base, location: "https://meet.example.com/abc" }).split("\n");
    expect(lines[0]).toBe("What: 30 min meeting between Alice and Bob");
    expect(lines[1]).toContain("When: ");
    expect(lines[1]).toContain("December 1, 2026");
    expect(lines[1]).toContain("11:00 - 11:30");
    expect(lines[2]).toMatch(/^Timezone: America\/Sao_Paulo \(.+\)$/);
    expect(lines[3]).toBe("Where: https://meet.example.com/abc");
  });

  it("omits the location line when there is no location", () => {
    const summary = buildBookingSummary({ ...base, location: "" });
    expect(summary.split("\n")).toHaveLength(3);
    expect(summary).not.toContain("Where");
  });

  it("respects 12h format", () => {
    const summary = buildBookingSummary({ ...base, is24h: false });
    expect(summary).toMatch(/11:00\s?AM - 11:30\s?AM/);
  });
});
