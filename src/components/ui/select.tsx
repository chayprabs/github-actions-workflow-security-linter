import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { inputBaseClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Select({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          inputBaseClassName,
          "appearance-none pr-10 [background-image:none]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
