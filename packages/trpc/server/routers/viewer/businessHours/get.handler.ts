import { BusinessHoursRepository } from "@calcom/features/businessHours/repositories/BusinessHoursRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const getBusinessHoursHandler = async ({ ctx }: { ctx: { user: NonNullable<TrpcSessionUser> } }) => {
  return BusinessHoursRepository.findByUserId(ctx.user.id);
};
