"use client";

import type { ButtonHTMLAttributes } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onChange" | "value"
> {
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onCheckedChange?: ((checked: boolean) => void) | undefined;
}

export function Switch({
  checked,
  className,
  defaultChecked = false,
  disabled = false,
  onClick,
  onCheckedChange,
  type,
  ...props
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (disabled) {
      return;
    }

    const nextValue = !isChecked;

    if (!isControlled) {
      setInternalChecked(nextValue);
    }

    onCheckedChange?.(nextValue);
  }

  return (
    <button
      aria-checked={isChecked}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        isChecked
          ? "border-accent bg-accent"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
      disabled={disabled}
      onClick={handleClick}
      role="switch"
      type={type ?? "button"}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "ml-0.5 block h-[1.125rem] w-[1.125rem] rounded-full bg-card shadow-sm transition-transform",
          isChecked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
