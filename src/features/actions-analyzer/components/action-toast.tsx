import { Alert } from "@/components/ui/alert";

export interface ActionToastState {
  message: string;
  tone: "danger" | "info" | "success" | "warning";
}

export function ActionToast({ toast }: { toast: ActionToastState | null }) {
  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 max-w-sm">
      <Alert title="Action status" tone={toast.tone}>
        {toast.message}
      </Alert>
    </div>
  );
}
