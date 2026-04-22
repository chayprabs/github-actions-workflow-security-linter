import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header
      className="border-b border-border/80 bg-background/90 backdrop-blur-sm"
      data-testid="site-header"
    >
      <Container className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            data-testid="site-logo"
            href="/"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/12 font-mono text-sm font-semibold text-accent">
              AU
            </span>
            <span className="space-y-0.5">
              <span className="block text-lg font-semibold tracking-tight text-foreground">
                {siteConfig.name}
              </span>
              <span className="block text-sm text-muted-foreground">
                {siteConfig.tagline}
              </span>
            </span>
          </Link>
          <Badge className="hidden sm:inline-flex" tone="info">
            Local-first tools
          </Badge>
        </div>

        <nav aria-label="Primary navigation" data-testid="site-nav">
          <ul className="flex flex-wrap items-center gap-2">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  );
}
