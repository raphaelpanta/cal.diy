import { showToast } from "@calcom/ui/components/toast";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyBookingSummaryButton } from "./CopyBookingSummaryButton";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

const SUMMARY = "Title: Intro call\nDate: Wednesday, November 25, 2026";

const setClipboard = (clipboard: Partial<Clipboard> | undefined): void => {
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
};

describe("CopyBookingSummaryButton", () => {
  const writeText = vi.fn<(text: string) => Promise<void>>();
  const getSummary = vi.fn<() => string>();

  beforeEach(() => {
    getSummary.mockReturnValue(SUMMARY);
    writeText.mockResolvedValue(undefined);
    setClipboard({ writeText });
  });

  afterEach(() => {
    vi.clearAllMocks();
    setClipboard(undefined);
  });

  it("builds the summary only when clicked and copies it to the clipboard", async () => {
    render(<CopyBookingSummaryButton getSummary={getSummary} />);
    expect(getSummary).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "copy_summary" }));

    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(SUMMARY);
    expect(await screen.findByRole("button", { name: "copied" })).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith("booking_summary_copied", "success");
  });

  it("reports an error when the browser rejects the clipboard write", async () => {
    writeText.mockRejectedValue(new DOMException("Write permission denied.", "NotAllowedError"));
    render(<CopyBookingSummaryButton getSummary={getSummary} />);

    fireEvent.click(screen.getByRole("button", { name: "copy_summary" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("error_copying_to_clipboard", "error"));
    expect(showToast).not.toHaveBeenCalledWith("booking_summary_copied", "success");
    expect(screen.getByRole("button", { name: "copy_summary" })).toBeInTheDocument();
  });

  it("reports an error when the clipboard API is unavailable", () => {
    setClipboard(undefined);
    render(<CopyBookingSummaryButton getSummary={getSummary} />);

    fireEvent.click(screen.getByRole("button", { name: "copy_summary" }));

    expect(showToast).toHaveBeenCalledWith("error_copying_to_clipboard", "error");
    expect(screen.getByRole("button", { name: "copy_summary" })).toBeInTheDocument();
  });
});
