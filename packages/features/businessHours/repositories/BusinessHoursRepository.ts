import type { BusinessHoursConfig, DateOverride, DayInterval } from "@calcom/features/businessHours/lib/businessHours";
import { prisma } from "@calcom/prisma";

export class BusinessHoursRepository {
  static async findByUserId(userId: number) {
    const row = await prisma.businessHours.findUnique({
      where: { userId },
      include: { overrides: { orderBy: { date: "asc" } } },
    });
    if (!row) return null;
    return {
      timeZone: row.timeZone,
      offsetMinutes: row.offsetMinutes,
      intervals: row.intervals as DayInterval[],
      overrides: row.overrides.map((o) => ({ date: o.date, intervals: o.intervals as DateOverride["intervals"] })),
    } satisfies BusinessHoursConfig & { timeZone: string };
  }

  static async upsert(
    userId: number,
    data: { timeZone: string; offsetMinutes: number; intervals: DayInterval[]; overrides: DateOverride[] }
  ) {
    return prisma.$transaction(async (tx) => {
      const bh = await tx.businessHours.upsert({
        where: { userId },
        create: { userId, timeZone: data.timeZone, offsetMinutes: data.offsetMinutes, intervals: data.intervals },
        update: { timeZone: data.timeZone, offsetMinutes: data.offsetMinutes, intervals: data.intervals },
      });
      await tx.businessHoursOverride.deleteMany({ where: { businessHoursId: bh.id } });
      if (data.overrides.length) {
        await tx.businessHoursOverride.createMany({
          data: data.overrides.map((o) => ({ businessHoursId: bh.id, date: o.date, intervals: o.intervals })),
        });
      }
      return bh;
    });
  }
}
