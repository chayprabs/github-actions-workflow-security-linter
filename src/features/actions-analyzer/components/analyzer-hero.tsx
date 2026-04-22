import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

interface AnalyzerHeroProps {
  onLoadRiskySample: () => void;
}

const trustBadges = [
  "Runs in your browser",
  "No login",
  "PR-ready report",
  "Deterministic rules",
] as const;

export function AnalyzerHero({ onLoadRiskySample }: AnalyzerHeroProps) {
  return (
    <section className="space-y-6" data-testid="analyzer-hero">
      <div className="space-y-4">
        <Badge tone="info">Browser-local GitHub Actions checks</Badge>
        <div className="space-y-4">
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            GitHub Actions Workflow Security and Lint Analyzer
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground sm:text-lg">
            Paste or upload workflow YAML to find syntax errors, risky
            permissions, unsafe triggers, unpinned actions, matrix issues, and
            reliability problems before you merge.
          </p>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        data-testid="analyzer-hero-trust-badges"
      >
        {trustBadges.map((badge) => (
          <Badge key={badge} tone="subtle">
            {badge}
          </Badge>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          className={buttonVariants()}
          data-testid="hero-analyze-cta"
          href="#analyzer-workspace"
        >
          Analyze workflow YAML
        </a>
        <Button
          data-testid="hero-load-risky-sample"
          onClick={onLoadRiskySample}
          variant="secondary"
        >
          Load risky sample
        </Button>
      </div>
    </section>
  );
}
