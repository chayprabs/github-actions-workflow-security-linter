import Link from "next/link";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-border/70 bg-white"
      data-testid="site-footer"
    >
      <Container className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-6 text-sm text-muted-foreground">
        <Link
          className="font-medium text-foreground/80 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2"
          href={siteConfig.privacy.href}
        >
          {siteConfig.privacy.title}
        </Link>
        <Link
          className="font-medium text-foreground/80 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2"
          href={siteConfig.terms.href}
        >
          {siteConfig.terms.title}
        </Link>
      </Container>
    </footer>
  );
}
