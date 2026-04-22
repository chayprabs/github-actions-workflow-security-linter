import Link from "next/link";

import { featuredTool, futureToolCategories } from "@/content/tools";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer
      className="border-t border-border/80 bg-background/80"
      data-testid="site-footer"
    >
      <Container className="grid gap-8 py-8 text-sm text-muted-foreground lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <p className="text-base font-medium text-foreground">
            Authos is a directory of browser-based developer tools for config,
            CI, schema, and infrastructure files.
          </p>
          <p>
            Start with the GitHub Actions analyzer today, then expand into
            upcoming categories as the toolset grows.
          </p>
          <Link
            className="inline-flex rounded-md text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href={featuredTool.href}
          >
            Open {featuredTool.name}
          </Link>
        </div>

        <div className="space-y-3" data-testid="footer-privacy">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
            Privacy
          </h2>
          <p>
            Core Authos tools are designed to run locally in the browser where
            possible, without requiring login for baseline workflows.
          </p>
          <Link
            className="inline-flex rounded-md text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href={siteConfig.privacy.href}
          >
            Read the privacy approach
          </Link>
        </div>

        <div className="space-y-3" data-testid="footer-future-tools">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
            Future related tools
          </h2>
          <ul className="space-y-2">
            {futureToolCategories.map((category) => (
              <li key={category.name} className="leading-6">
                {category.name}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
