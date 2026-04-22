"use client";

import type { ButtonHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "error";

export interface CopyButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onCopy"
> {
  copiedLabel?: string | undefined;
  label?: string | undefined;
  value: string;
}

export function CopyButton({
  className,
  copiedLabel = "Copied",
  disabled = false,
  label = "Copy",
  onClick,
  type,
  value,
  ...props
}: CopyButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (copyState !== "copied") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState("idle");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState]);

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (disabled || value.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  const isDisabled = disabled || value.length === 0;
  const buttonLabel =
    copyState === "copied"
      ? copiedLabel
      : copyState === "error"
        ? "Copy failed"
        : label;

  return (
    <button
      aria-live="polite"
      className={cn(
        buttonVariants({ size: "sm", variant: "secondary" }),
        className,
      )}
      disabled={isDisabled}
      onClick={handleCopy}
      type={type ?? "button"}
      {...props}
    >
      {copyState === "copied" ? (
        <Check aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Copy aria-hidden="true" className="h-4 w-4" />
      )}
      {buttonLabel}
    </button>
  );
}
