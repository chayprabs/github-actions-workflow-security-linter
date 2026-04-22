import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone =
  | "default"
  | "subtle"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "severity-low"
  | "severity-medium"
  | "severity-high";

const toneClasses: Record<BadgeTone, string> = {
  default: "bg-foreground text-background",
  subtle: "bg-accent/10 text-accent",
  success: "bg-success/12 text-success",
  warning: "bg-warning/14 text-warning",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/12 text-info",
  "severity-low": "bg-severity-low/12 text-severity-low",
  "severity-medium": "bg-severity-medium/14 text-severity-medium",
  "severity-high": "bg-severity-high/12 text-severity-high",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone | undefined;
}

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
