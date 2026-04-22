import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const inputBaseClassName =
  "flex h-11 w-full rounded-[var(--radius-sm)] border border-input bg-card px-3 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

export function Input({
  className,
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(inputBaseClassName, className)}
      type={type}
      {...props}
    />
  );
}
