import type { TextareaHTMLAttributes } from "react";

import { inputBaseClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  rows = 6,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputBaseClassName, "min-h-[8rem] py-3", className)}
      rows={rows}
      {...props}
    />
  );
}
