import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCheckSlotInputSchema, ZUpdateBusinessHoursInputSchema } from "./businessHours.schema";

export const businessHoursRouter = router({
  get: authedProcedure.query(async ({ ctx }) => {
    const { getBusinessHoursHandler } = await import("./get.handler");
    return getBusinessHoursHandler({ ctx });
  }),
  update: authedProcedure.input(ZUpdateBusinessHoursInputSchema).mutation(async ({ ctx, input }) => {
    const { updateBusinessHoursHandler } = await import("./update.handler");
    return updateBusinessHoursHandler({ ctx, input });
  }),
  checkSlot: authedProcedure.input(ZCheckSlotInputSchema).query(async ({ ctx, input }) => {
    const { checkSlotHandler } = await import("./checkSlot.handler");
    return checkSlotHandler({ ctx, input });
  }),
});
