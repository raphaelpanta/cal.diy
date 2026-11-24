"use client";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

type CopyBookingSummaryButtonProps = {
  /** Called on click, so the summary is only built when the user asks for it. */
  getSummary: () => string;
};

export function CopyBookingSummaryButton({ getSummary }: CopyBookingSummaryButtonProps): JSX.Element {
  const { t } = useLocale();
  const { copyToClipboard, isCopied } = useCopy();

  const handleClick = (): void => {
    copyToClipboard(getSummary(), {
      onSuccess: () => showToast(t("booking_summary_copied"), "success"),
      onFailure: () => showToast(t("error_copying_to_clipboard"), "error"),
    });
  };

  return (
    <Button
      color="secondary"
      StartIcon={isCopied ? "check" : "copy"}
      onClick={handleClick}
      data-testid="copy-booking-summary">
      {isCopied ? t("copied") : t("copy_summary")}
    </Button>
  );
}
