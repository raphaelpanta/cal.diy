import { isWithinBusinessHours } from "@calcom/features/businessHours/lib/businessHours";
import { BusinessHoursRepository } from "@calcom/features/businessHours/repositories/BusinessHoursRepository";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCheckSlotInputSchema } from "./businessHours.schema";

type Options = { ctx: { user: NonNullable<TrpcSessionUser> }; input: TCheckSlotInputSchema };

/**
 * Indica se o horário escolhido está fora do horário comercial do organizador.
 * Só responde ao próprio organizador (dono/host do event type ou organizador da reserva reagendada);
 * para qualquer outro usuário retorna `outsideBusinessHours: false` para não expor o horário comercial.
 */
export const checkSlotHandler = async ({ ctx, input }: Options) => {
  const userId = ctx.user.id;
  const notApplicable = { outsideBusinessHours: false };

  let isOrganizer = false;
  if (input.rescheduleUid) {
    const booking = await prisma.booking.findUnique({
      where: { uid: input.rescheduleUid },
      select: { userId: true },
    });
    isOrganizer = booking?.userId === userId;
  } else {
    const eventType = await prisma.eventType.findFirst({
      where: {
        id: input.eventTypeId,
        OR: [{ userId }, { owner: { id: userId } }, { hosts: { some: { userId } } }, { users: { some: { id: userId } } }],
      },
      select: { id: true },
    });
    isOrganizer = !!eventType;
  }
  if (!isOrganizer) return notApplicable;

  const config = await BusinessHoursRepository.findByUserId(userId);
  if (!config) return notApplicable;

  return {
    outsideBusinessHours: !isWithinBusinessHours(
      config,
      ctx.user.timeZone,
      new Date(input.start),
      new Date(input.end)
    ),
  };
};
