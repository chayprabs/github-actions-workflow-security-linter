"use client";

import { Laptop, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/theme-provider";
import type { ThemePreference } from "@/features/actions-analyzer/lib/analyzer-preferences";

const themeOptions: Array<{
  icon: typeof Laptop;
  label: string;
  value: ThemePreference;
}> = [
  {
    icon: Laptop,
    label: "System",
    value: "system",
  },
  {
    icon: Sun,
    label: "Light",
    value: "light",
  },
  {
    icon: Moon,
    label: "Dark",
    value: "dark",
  },
];

export function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <div
      aria-label="Theme toggle"
      className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/70 p-1"
      role="group"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = preference === option.value;

        return (
          <Button
            aria-label={`Use ${option.label.toLowerCase()} theme`}
            key={option.value}
            onClick={() => setPreference(option.value)}
            size="sm"
            title={
              option.value === "system"
                ? `System theme (${resolvedTheme})`
                : `${option.label} theme`
            }
            variant={isSelected ? "primary" : "ghost"}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
