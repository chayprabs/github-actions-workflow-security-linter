import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ToolbarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  actions?: ReactNode | undefined;
  description?: ReactNode | undefined;
  title?: ReactNode | undefined;
}

export function Toolbar({
  actions,
  children,
  className,
  description,
  title,
  ...props
}: ToolbarProps) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            {title ? (
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
            ) : null}
            {description ? (
              <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children ? <div>{children}</div> : null}
    </section>
  );
}
