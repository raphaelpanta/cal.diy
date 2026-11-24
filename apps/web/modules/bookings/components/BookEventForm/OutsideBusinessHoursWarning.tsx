import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { useSession } from "next-auth/react";

/**
 * Aviso apenas visual exibido ao ORGANIZADOR quando ele reserva ou reagenda em um horário
 * fora do seu horário comercial (feature exercicio-003). Não bloqueia a reserva.
 */
export const OutsideBusinessHoursWarning = ({
  timeslot,
  defaultLength,
}: {
  timeslot: string;
  defaultLength?: number;
}) => {
  const { t } = useLocale();
  const { status } = useSession();
  const eventId = useBookerStoreContext((state) => state.eventId);
  const selectedDuration = useBookerStoreContext((state) => state.selectedDuration);
  const rescheduleUid = useBookerStoreContext((state) => state.rescheduleUid);
  const length = selectedDuration || defaultLength;

  const start = dayjs(timeslot);
  const enabled = status === "authenticated" && !!eventId && !!length && start.isValid();

  const { data } = trpc.viewer.businessHours.checkSlot.useQuery(
    {
      eventTypeId: eventId ?? 0,
      start: start.toISOString(),
      end: start.add(length ?? 0, "minute").toISOString(),
      rescheduleUid,
    },
    { enabled, retry: false, refetchOnWindowFocus: false }
  );

  if (!enabled || !data?.outsideBusinessHours) return null;

  return (
    <div className="mb-4" data-testid="outside-business-hours-warning">
      <Alert
        severity="warning"
        title={t("outside_business_hours_title")}
        message={t("outside_business_hours_description")}
      />
    </div>
  );
};
