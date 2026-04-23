import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { OverlayPanel } from "@/components/ui/overlay-panel";

function OverlayPanelHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open panel</Button>
      <OverlayPanel
        onClose={() => setOpen(false)}
        open={open}
        title="Panel title"
      >
        <Button>Inside action</Button>
      </OverlayPanel>
    </div>
  );
}

describe("OverlayPanel", () => {
  it("restores focus to the trigger after closing with Escape", () => {
    render(<OverlayPanelHarness />);

    const openButton = screen.getByRole("button", { name: /Open panel/i });

    openButton.focus();
    fireEvent.click(openButton);

    expect(screen.getByRole("dialog", { name: /Panel title/i })).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: /Panel title/i }),
    ).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });
});
