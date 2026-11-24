import type { ConfigType, Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { formatToLocalizedDate, formatToLocalizedTime, formatToLocalizedTimezone } from "@calcom/lib/dayjs";
import type { TFunction } from "i18next";

export type BookingSummaryInput = {
  title: string;
  startTime: ConfigType;
  endTime: ConfigType;
  /** IANA time zone the date and times are expressed in, e.g. "America/Sao_Paulo". */
  timeZone: string;
  locale: string;
  is24h: boolean;
  location?: string | null;
  t: TFunction;
};

/**
 * Builds the plain-text summary copied from the booking success page.
 *
 * Date, time and time zone are formatted exactly like the page's "When" section, so the copied
 * text matches what the user is looking at. The location line is omitted when there is none.
 */
export function buildBookingSummary({
  title,
  startTime,
  endTime,
  timeZone,
  locale,
  is24h,
  location,
  t,
}: BookingSummaryInput): string {
  const start = dayjs(startTime);
  const end = dayjs(endTime);
  const formatTime = (date: Dayjs): string =>
    formatToLocalizedTime({ date, locale, hour12: !is24h, timeZone });

  const lines = [
    `${t("title")}: ${title}`,
    `${t("date")}: ${formatToLocalizedDate(start, locale, "full", timeZone)}`,
    `${t("time")}: ${formatTime(start)} - ${formatTime(end)}`,
    `${t("timezone")}: ${formatToLocalizedTimezone(start, locale, timeZone) ?? timeZone}`,
  ];

  if (location) {
    lines.push(`${t("location")}: ${location}`);
  }

  return lines.join("\n");
}
