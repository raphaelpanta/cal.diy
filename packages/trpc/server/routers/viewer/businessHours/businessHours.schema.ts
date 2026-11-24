import { z } from "zod";

const minute = z.number().int().min(0).max(1440);

export const ZUpdateBusinessHoursInputSchema = z.object({
  /** `end <= start` = expediente que passa da meia-noite */
  intervals: z.array(z.object({ day: z.number().int().min(0).max(6), start: minute, end: minute })),
  overrides: z
    .array(z.object({ date: z.string(), intervals: z.array(z.object({ start: minute, end: minute })) }))
    .default([]),
});
export type TUpdateBusinessHoursInputSchema = z.infer<typeof ZUpdateBusinessHoursInputSchema>;

export const ZCheckSlotInputSchema = z.object({
  eventTypeId: z.number().int(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  rescheduleUid: z.string().nullish(),
});
export type TCheckSlotInputSchema = z.infer<typeof ZCheckSlotInputSchema>;
