import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col bg-white text-foreground"
      data-testid="page-shell"
    >
      <a
        className="absolute left-4 top-4 z-50 -translate-y-20 rounded-md bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-border transition focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main className="flex-1" data-testid="site-main" id="main-content">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
