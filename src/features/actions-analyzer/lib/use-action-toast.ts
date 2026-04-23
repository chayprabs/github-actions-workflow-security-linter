"use client";

import { useEffect, useState } from "react";

import type { ActionToastState } from "@/features/actions-analyzer/components/action-toast";

export function useActionToast() {
  const [toast, setToast] = useState<ActionToastState | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  return {
    setToast,
    toast,
  };
}
