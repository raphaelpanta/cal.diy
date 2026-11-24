import {
  BusinessHoursValidationError,
  getCurrentOffsetMinutes,
  normalizeOverride,
  normalizeWeeklyIntervals,
} from "@calcom/features/businessHours/lib/businessHours";
import { BusinessHoursRepository } from "@calcom/features/businessHours/repositories/BusinessHoursRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";

import type { TUpdateBusinessHoursInputSchema } from "./businessHours.schema";

type Options = { ctx: { user: NonNullable<TrpcSessionUser> }; input: TUpdateBusinessHoursInputSchema };

export const updateBusinessHoursHandler = async ({ ctx, input }: Options) => {
  try {
    const intervals = normalizeWeeklyIntervals(input.intervals);
    const overrides = input.overrides.map(normalizeOverride);
    if (new Set(overrides.map((o) => o.date)).size !== overrides.length) {
      throw new BusinessHoursValidationError("business_hours_duplicate_override_date");
    }
    // Offset fixo: o do fuso do organizador no momento do salvamento (não acompanha DST).
    const timeZone = ctx.user.timeZone;
    await BusinessHoursRepository.upsert(ctx.user.id, {
      timeZone,
      offsetMinutes: getCurrentOffsetMinutes(timeZone),
      intervals,
      overrides,
    });
    return BusinessHoursRepository.findByUserId(ctx.user.id);
  } catch (e) {
    if (e instanceof BusinessHoursValidationError) throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
    throw e;
  }
};
