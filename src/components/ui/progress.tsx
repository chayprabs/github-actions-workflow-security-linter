import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ProgressTone = "accent" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<ProgressTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  label?: string | undefined;
  max?: number | undefined;
  showValue?: boolean | undefined;
  tone?: ProgressTone | undefined;
  value: number;
}

export function Progress({
  className,
  label,
  max = 100,
  showValue = true,
  tone = "accent",
  value,
  ...props
}: ProgressProps) {
  const safeMax = max <= 0 ? 100 : max;
  const clampedValue = Math.min(Math.max(value, 0), safeMax);
  const percentage = Math.round((clampedValue / safeMax) * 100);

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-foreground">
            {label ?? "Progress"}
          </span>
          {showValue ? (
            <span className="text-muted-foreground">{percentage}%</span>
          ) : null}
        </div>
      )}
      <div
        aria-label={label ?? "Progress"}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={clampedValue}
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            toneClasses[tone],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
