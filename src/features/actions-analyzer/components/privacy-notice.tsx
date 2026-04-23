import { Alert } from "@/components/ui/alert";

export function PrivacyNotice() {
  return (
    <Alert data-testid="privacy-notice" title="Local-first privacy" tone="info">
      Pasted and uploaded workflow files are analyzed in your browser. They are
      not uploaded to Authos. Public GitHub imports are fetched directly from
      GitHub by your browser, without credentials, and are not embedded in
      privacy-safe share links. Recent history stores metadata only unless you
      explicitly enable content memory on this device.
    </Alert>
  );
}
