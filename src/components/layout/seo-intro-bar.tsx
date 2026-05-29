import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function SeoIntroBar() {
  return (
    <section
      aria-label="Product summary"
      className="border-b border-border/60 bg-muted/30"
      data-testid="seo-intro-bar"
    >
      <Container className="py-4">
        <p className="text-center text-sm leading-6 text-foreground sm:text-[0.9375rem]">
          {siteConfig.seoIntro.primary}
        </p>
        <p className="mt-1 text-center text-sm leading-6 text-muted-foreground">
          {siteConfig.seoIntro.secondary}
        </p>
      </Container>
    </section>
  );
}
