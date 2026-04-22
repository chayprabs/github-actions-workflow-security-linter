import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type AlertTone = "info" | "success" | "warning" | "danger";

const toneClasses: Record<AlertTone, string> = {
  info: "border-info/20 bg-info/10",
  success: "border-success/20 bg-success/10",
  warning: "border-warning/20 bg-warning/12",
  danger: "border-danger/20 bg-danger/10",
};

const toneIcons: Record<AlertTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export interface AlertProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: ReactNode | undefined;
  tone?: AlertTone | undefined;
}

export function Alert({
  children,
  className,
  title,
  tone = "info",
  ...props
}: AlertProps) {
  const Icon = toneIcons[tone];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm text-foreground",
        toneClasses[tone],
        className,
      )}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className="text-muted-foreground">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
