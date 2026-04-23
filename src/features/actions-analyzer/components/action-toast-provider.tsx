"use client";

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react";

import {
  ActionToast,
  type ActionToastState,
} from "@/features/actions-analyzer/components/action-toast";
import { useActionToast } from "@/features/actions-analyzer/lib/use-action-toast";

const ActionToastContext = createContext<
  ((toast: ActionToastState) => void) | null
>(null);

export function ActionToastProvider({ children }: PropsWithChildren) {
  const { setToast, toast } = useActionToast();

  return (
    <ActionToastContext.Provider value={setToast}>
      {children}
      <ActionToast toast={toast} />
    </ActionToastContext.Provider>
  );
}

export function usePushActionToast() {
  const context = useContext(ActionToastContext);

  if (!context) {
    throw new Error(
      "usePushActionToast must be used within an <ActionToastProvider>.",
    );
  }

  return context;
}
