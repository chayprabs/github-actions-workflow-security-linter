import { Alert } from "@/components/ui/alert";

export function PrivacyNotice() {
  return (
    <Alert data-testid="privacy-notice" title="Local-first privacy" tone="info">
      Pasted and uploaded workflow files are analyzed in your browser. They are
      not uploaded to Authos. A future public GitHub import will fetch public
      repository data directly from your browser.
    </Alert>
  );
}
