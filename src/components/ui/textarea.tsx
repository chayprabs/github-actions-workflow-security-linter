import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

import { inputBaseClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 6, ...props }, ref) {
  return (
    <textarea
      className={cn(inputBaseClassName, "min-h-[8rem] py-3", className)}
      ref={ref}
      rows={rows}
      {...props}
    />
  );
});
