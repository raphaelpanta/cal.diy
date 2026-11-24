import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { formatToLocalizedDate, formatToLocalizedTime, formatToLocalizedTimezone } from "@calcom/lib/dayjs";

export type BuildBookingSummaryInput = {
  title: string;
  start: Dayjs;
  durationMinutes: number;
  timeZone: string;
  locale: string;
  is24h: boolean;
  location?: string | null;
  labels: { what: string; when: string; timezone: string; where: string };
};

export function buildBookingSummary({
  title,
  start,
  durationMinutes,
  timeZone,
  locale,
  is24h,
  location,
  labels,
}: BuildBookingSummaryInput): string {
  const end = dayjs(start).add(durationMinutes, "m");
  const fmtTime = (d: Dayjs) => formatToLocalizedTime({ date: d, locale, hour12: !is24h, timeZone });
  const lines = [
    `${labels.what}: ${title}`,
    `${labels.when}: ${formatToLocalizedDate(start, locale, "full", timeZone)}, ${fmtTime(start)} - ${fmtTime(end)}`,
    `${labels.timezone}: ${timeZone} (${formatToLocalizedTimezone(start, locale, timeZone)})`,
  ];
  if (location) lines.push(`${labels.where}: ${location}`);
  return lines.join("\n");
}
