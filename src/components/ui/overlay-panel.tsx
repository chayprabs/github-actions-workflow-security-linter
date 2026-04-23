"use client";

import {
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OverlayPanelVariant = "dialog" | "drawer";
type OverlayPanelSize = "md" | "lg" | "xl";

const sizeClasses: Record<OverlayPanelSize, string> = {
  lg: "max-w-3xl",
  md: "max-w-xl",
  xl: "max-w-5xl",
};

interface OverlayPanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  description?: ReactNode | undefined;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
  variant?: OverlayPanelVariant | undefined;
  size?: OverlayPanelSize | undefined;
}

export function OverlayPanel({
  children,
  className,
  description,
  onClose,
  open,
  size = "lg",
  title,
  variant = "dialog",
  ...props
}: PropsWithChildren<OverlayPanelProps>) {
  const descriptionId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timeoutId = window.setTimeout(() => {
      const panel = panelRef.current;
      const focusableElements = getFocusableElements(panel);
      const firstFocusableElement = focusableElements[0];

      (firstFocusableElement ?? panel)?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(panelRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement?.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timeoutId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm"
        onMouseDown={onClose}
      />
      <div
        className={cn(
          "fixed inset-0 z-50 flex overflow-y-auto px-4 py-6",
          variant === "drawer"
            ? "justify-end sm:px-0 sm:py-0"
            : "items-start justify-center sm:items-center",
        )}
      >
        <div
          aria-describedby={description ? descriptionId : undefined}
          aria-labelledby={titleId}
          aria-modal="true"
          className={cn(
            "flex w-full flex-col border border-border/90 bg-background/95 text-foreground shadow-2xl outline-none",
            variant === "drawer"
              ? "min-h-full max-w-xl rounded-2xl p-5 sm:rounded-none sm:border-l"
              : `${sizeClasses[size]} rounded-2xl p-6`,
            className,
          )}
          onMouseDown={(event) => event.stopPropagation()}
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
          {...props}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h2
                className="text-xl font-semibold tracking-tight text-foreground"
                id={titleId}
              >
                {title}
              </h2>
              {description ? (
                <p
                  className="text-sm leading-6 text-muted-foreground"
                  id={descriptionId}
                >
                  {description}
                </p>
              ) : null}
            </div>
            <Button
              aria-label={`Close ${typeof title === "string" ? title : "panel"}`}
              className="h-9 w-9 p-0"
              onClick={onClose}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-5 min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("aria-hidden"));
}
