"use client";

import { OverlayPanel } from "@/components/ui/overlay-panel";

interface KeyboardShortcutsDialogProps {
  onClose: () => void;
  open: boolean;
}

const shortcuts = [
  {
    action: "Analyze the current workspace immediately",
    keys: "Ctrl/Cmd + Enter",
  },
  {
    action: "Focus the findings search and filter toolbar",
    keys: "Ctrl/Cmd + K",
  },
  {
    action: "Copy the PR comment for the latest report",
    keys: "Ctrl/Cmd + Shift + C",
  },
  {
    action: "Close the active dialog or drawer",
    keys: "Esc",
  },
] as const;

export function KeyboardShortcutsDialog({
  onClose,
  open,
}: KeyboardShortcutsDialogProps) {
  return (
    <OverlayPanel
      description="These shortcuts work locally in the analyzer workspace and never send workflow content anywhere."
      onClose={onClose}
      open={open}
      size="md"
      title="Keyboard shortcuts"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <caption className="sr-only">
            Keyboard shortcuts for the analyzer
          </caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <th className="px-3 py-2 font-medium" scope="col">
                Shortcut
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map((shortcut) => (
              <tr
                className="rounded-xl border border-border/80 bg-background/70 align-top"
                key={shortcut.keys}
              >
                <td className="rounded-l-xl px-3 py-3">
                  <span className="inline-flex rounded-lg border border-border/80 bg-card px-2 py-1 font-medium text-foreground">
                    {shortcut.keys}
                  </span>
                </td>
                <td className="rounded-r-xl px-3 py-3 text-foreground">
                  {shortcut.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OverlayPanel>
  );
}
