import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      data-testid="page-shell"
    >
      <a
        className="absolute left-4 top-4 z-50 -translate-y-20 rounded-md bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.16),transparent_55%),radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.08),transparent_38%)]"
      />
      <SiteHeader />
      <main className="flex-1" data-testid="site-main" id="main-content">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
