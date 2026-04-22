import type { HTMLAttributes, ReactNode } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  action?: ReactNode | undefined;
  description?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  title: ReactNode;
}

export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "surface-shadow rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon ?? <Inbox className="h-5 w-5" />}
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </section>
  );
}
