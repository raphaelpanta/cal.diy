import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Success from "./bookings-single-view";
import type { PageProps } from "./bookings-single-view.getServerSideProps";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/booking/booking-uid",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("@calcom/lib/hooks/useRouterQuery", () => ({
  useRouterQuery: () => ({ uid: "booking-uid", isSuccessBookingPage: "true" }),
}));

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams: () => new URLSearchParams(),
}));

vi.mock("@calcom/lib/hooks/useTheme", () => ({ default: vi.fn() }));

vi.mock("@calcom/lib/getBrandColours", () => ({ default: vi.fn() }));

vi.mock("@calcom/ui/styles", () => ({ useCalcomTheme: vi.fn() }));

vi.mock("@calcom/ui/components/toast", () => ({ showToast: vi.fn() }));

vi.mock("@calcom/embed-core/embed-iframe", () => ({
  useIsEmbed: vi.fn(),
  useIsBackgroundTransparent: () => false,
  useEmbedNonStylesConfig: () => undefined,
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      public: {
        submitRating: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        markHostAsNoShow: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
  },
}));

// Location messages are covered by the app-store tests; here the stored location is displayed as-is.
vi.mock("@calcom/app-store/locations", () => ({
  getSuccessPageLocationMessage: (location: string) => location,
  guessEventLocationType: () => undefined,
}));

vi.mock("@calcom/app-store/BookingPageTagManager", () => ({ default: () => null }));

vi.mock("@calcom/app-store/utils", () => ({ getEventTypeAppData: () => undefined }));

vi.mock("@calcom/app-store/zod-utils", () => ({
  eventTypeMetaDataSchemaWithTypedApps: { parse: (metadata: unknown) => metadata },
}));

vi.mock("@calcom/features/eventtypes/lib/eventNaming", () => ({
  getEventName: () => "Intro call between Pro Example and Test Testson",
}));

vi.mock("@calcom/features/bookings/lib/getCalendarLinks", () => ({
  getCalendarLinks: () => [],
  CalendarLinkType: {
    GOOGLE_CALENDAR: "googleCalendar",
    MICROSOFT_OFFICE: "microsoftOffice",
    MICROSOFT_OUTLOOK: "microsoftOutlook",
    ICS: "ics",
  },
}));

vi.mock("@calcom/web/components/booking/CancelBooking", () => ({ default: () => null }));

vi.mock("@calcom/web/components/schemas/EventReservationSchema", () => ({ default: () => null }));

// 2026-11-25 14:00-14:30 in São Paulo
const START_TIME: Date = new Date("2026-11-25T17:00:00.000Z");
const END_TIME: Date = new Date("2026-11-25T17:30:00.000Z");

type Overrides = {
  eventType?: Record<string, unknown>;
  bookingInfo?: Record<string, unknown>;
};

function buildProps({ eventType, bookingInfo }: Overrides = {}): PageProps {
  return {
    tz: "America/Sao_Paulo",
    userTimeFormat: 12,
    hideBranding: true,
    requiresLoginToUpdate: false,
    rescheduledToUid: null,
    previousBooking: null,
    paymentStatus: null,
    recurringBookings: null,
    isLoggedInUserHost: false,
    canViewHiddenData: false,
    internalNotePresets: [],
    profile: { name: "Pro Example", slug: "pro", theme: null, brandColor: null, darkBrandColor: null },
    eventType: {
      id: 1,
      title: "Intro call",
      eventName: null,
      isDynamic: false,
      metadata: null,
      schedulingType: null,
      requiresConfirmation: false,
      recurringEvent: null,
      owner: null,
      team: null,
      teamId: null,
      hosts: [],
      users: [],
      bookingFields: [],
      ...eventType,
    },
    bookingInfo: {
      id: 1,
      uid: "booking-uid",
      title: "Intro call between Pro Example and Test Testson",
      description: null,
      startTime: START_TIME,
      endTime: END_TIME,
      status: BookingStatus.ACCEPTED,
      location: "https://cal.com/video/abc123",
      metadata: null,
      responses: { name: "Test Testson", email: "test@example.com" },
      attendees: [{ name: "Test Testson", email: "test@example.com", timeZone: "America/Sao_Paulo" }],
      user: { name: "Pro Example", email: "pro@example.com", timeZone: "America/Sao_Paulo" },
      userPrimaryEmail: "pro@example.com",
      seatsReferences: [],
      eventType: null,
      cancellationReason: null,
      rejectionReason: null,
      rescheduled: false,
      tracking: null,
      assignmentReason: [],
      ...bookingInfo,
    },
  } as unknown as PageProps;
}

// Some ICU versions (e.g. the one bundled with Node 20) put a narrow no-break space before AM/PM.
const normalizeSpaces = (text: string): string => text.replace(/[^\S\n]/g, " ");

describe("Booking success page - copy summary", () => {
  const writeText = vi.fn<(text: string) => Promise<void>>();

  // Queried by test id: the page's card container is aria-hidden, which hides it from role queries
  const copySummary = (): string => {
    const button = screen.getByTestId("copy-booking-summary");
    expect(button).toHaveTextContent("copy_summary");
    fireEvent.click(button);
    expect(writeText).toHaveBeenCalledTimes(1);
    return normalizeSpaces(writeText.mock.calls[0][0]);
  };

  beforeEach(() => {
    vi.mocked(useIsEmbed).mockReturnValue(false);
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });

  it("copies the title, date, time, time zone and location shown on the page", async () => {
    render(<Success {...buildProps()} />);

    // The "When" section renders after mount; the summary must match it
    const when = await screen.findByText(/Wednesday, November 25, 2026/);
    expect(normalizeSpaces(when.textContent ?? "")).toContain("2:00 PM - 2:30 PM (Brasilia Standard Time)");
    expect(screen.getByTestId("booking-title")).toHaveTextContent(
      "Intro call between Pro Example and Test Testson"
    );

    expect(copySummary()).toBe(
      [
        "title: Intro call between Pro Example and Test Testson",
        "date: Wednesday, November 25, 2026",
        "time: 2:00 PM - 2:30 PM",
        "timezone: Brasilia Standard Time",
        "location: https://cal.com/video/abc123",
      ].join("\n")
    );
  });

  it("copies the booking title for round-robin events, like the page does", () => {
    render(
      <Success
        {...buildProps({
          eventType: { schedulingType: SchedulingType.ROUND_ROBIN },
          bookingInfo: { title: "Round robin: Intro call with Pro Example" },
        })}
      />
    );

    expect(screen.getByTestId("booking-title")).toHaveTextContent("Round robin: Intro call with Pro Example");
    expect(copySummary()).toContain("title: Round robin: Intro call with Pro Example\n");
  });

  it("copies the booker's location when the page shows it instead of the stored one", () => {
    render(
      <Success
        {...buildProps({
          bookingInfo: {
            location: "Rua Augusta, 500",
            responses: {
              name: "Test Testson",
              email: "test@example.com",
              location: { value: "attendeeInPerson", optionValue: "Av. Paulista, 1000" },
            },
          },
        })}
      />
    );

    expect(screen.getByTestId("where")).toHaveTextContent("Av. Paulista, 1000");
    expect(copySummary().split("\n").at(-1)).toBe("location: Av. Paulista, 1000");
  });

  it("leaves the location out when the booking has none", () => {
    render(<Success {...buildProps({ bookingInfo: { location: null } })} />);

    expect(screen.queryByTestId("where")).not.toBeInTheDocument();
    const summary = copySummary();
    expect(summary.split("\n")).toHaveLength(4);
    expect(summary).not.toContain("location:");
  });

  it("is not offered for cancelled bookings", () => {
    render(<Success {...buildProps({ bookingInfo: { status: BookingStatus.CANCELLED } })} />);

    expect(screen.getByTestId("cancelled-headline")).toBeInTheDocument();
    expect(screen.queryByTestId("copy-booking-summary")).not.toBeInTheDocument();
  });

  it("is not offered inside an embed", () => {
    vi.mocked(useIsEmbed).mockReturnValue(true);

    render(<Success {...buildProps()} />);

    expect(screen.getByTestId("booking-title")).toBeInTheDocument();
    expect(screen.queryByTestId("copy-booking-summary")).not.toBeInTheDocument();
  });
});
