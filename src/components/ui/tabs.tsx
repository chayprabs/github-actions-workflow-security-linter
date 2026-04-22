"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent,
} from "react";
import { createContext, useContext, useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface TabsContextValue {
  baseId: string;
  onValueChange: (value: string) => void;
  value: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error("Tabs components must be used within <Tabs>.");
  }

  return context;
}

function getTabId(baseId: string, value: string) {
  return `${baseId}-tab-${value.replace(/\s+/gu, "-").toLowerCase()}`;
}

function getPanelId(baseId: string, value: string) {
  return `${baseId}-panel-${value.replace(/\s+/gu, "-").toLowerCase()}`;
}

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  value?: string | undefined;
}

export function Tabs({
  children,
  className,
  defaultValue,
  onValueChange,
  value,
  ...props
}: TabsProps) {
  const generatedId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      baseId: generatedId,
      onValueChange: (nextValue: string) => {
        if (value === undefined) {
          setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
      },
      value: currentValue,
    }),
    [currentValue, generatedId, onValueChange, value],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
  onKeyDown,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
      return;
    }

    const tabElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ).filter((element) => !element.disabled);

    if (tabElements.length === 0) {
      return;
    }

    const currentIndex = tabElements.findIndex(
      (element) => element === document.activeElement,
    );

    if (currentIndex === -1) {
      return;
    }

    event.preventDefault();

    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabElements.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % tabElements.length
            : (currentIndex - 1 + tabElements.length) % tabElements.length;

    const nextTab = tabElements[nextIndex];

    nextTab?.focus();
    nextTab?.click();
  }

  return (
    <div
      className={cn(
        "inline-flex w-full flex-wrap gap-2 rounded-xl border border-border/80 bg-card p-2",
        className,
      )}
      onKeyDown={handleKeyDown}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  className,
  onClick,
  type,
  value,
  ...props
}: TabsTriggerProps) {
  const context = useTabsContext();
  const isSelected = context.value === value;

  return (
    <button
      aria-controls={getPanelId(context.baseId, value)}
      aria-selected={isSelected}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      id={getTabId(context.baseId, value)}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          context.onValueChange(value);
        }
      }}
      role="tab"
      tabIndex={isSelected ? 0 : -1}
      type={type ?? "button"}
      {...props}
    />
  );
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean | undefined;
  value: string;
}

export function TabsContent({
  children,
  className,
  forceMount = false,
  value,
  ...props
}: TabsContentProps) {
  const context = useTabsContext();
  const isSelected = context.value === value;

  if (!forceMount && !isSelected) {
    return null;
  }

  return (
    <div
      aria-labelledby={getTabId(context.baseId, value)}
      className={cn("outline-none", className)}
      data-state={isSelected ? "active" : "inactive"}
      hidden={!isSelected}
      id={getPanelId(context.baseId, value)}
      role="tabpanel"
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
}
