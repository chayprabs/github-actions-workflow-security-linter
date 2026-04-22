import { futureToolCategories } from "@/content/tools";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const checkAreas = [
  "YAML syntax and workflow structure",
  "Risky permissions and token scope",
  "Unsafe triggers such as pull_request_target misuse",
  "Unpinned or floating third-party actions",
  "Matrix strategy and job timeout coverage",
  "Reliability and runner hygiene signals",
] as const;

const commonRisks = [
  "Broad `write-all` permissions in workflows that only need read access.",
  "Floating action refs such as `@main` or `@master` instead of immutable versions.",
  "Trigger patterns that expose secrets or privileged tokens to untrusted code.",
  "Missing timeouts, concurrency controls, or safe defaults for long-running jobs.",
] as const;

const faqPlaceholders = [
  {
    answer:
      "Single-file paste and upload are scaffolded now. Multi-file repository workflows and public GitHub import are planned next steps.",
    question: "Can I analyze multiple workflow files?",
  },
  {
    answer:
      "The analyzer is designed to run in the browser where possible, so pasted YAML and uploaded local files stay client-side by default.",
    question: "Does Authos upload my workflow YAML?",
  },
  {
    answer:
      "Markdown, JSON, SARIF, and HTML export controls are already represented in the UI and will activate once the analyzer engine is connected.",
    question: "What kind of output will this produce?",
  },
] as const;

export function SeoContent() {
  return (
    <section className="space-y-10" data-testid="analyzer-seo-content">
      <div className="space-y-3">
        <Badge tone="info">What this tool is built for</Badge>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          A product-shaped shell around GitHub Actions workflow review
        </h2>
        <p className="max-w-4xl text-base leading-7 text-muted-foreground sm:text-lg">
          The analyzer workspace is scaffolded now so the next prompt can focus
          on the rule engine and diagnostics instead of basic product structure.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>What this checks</CardTitle>
            <CardDescription>
              The full analyzer will focus on fast local feedback for GitHub
              Actions review before merge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {checkAreas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common GitHub Actions risks</CardTitle>
            <CardDescription>
              These patterns are common enough to deserve first-class coverage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {commonRisks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              The final experience is designed to stay local-first and
              deterministic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>1. Paste or upload workflow YAML in the browser workspace.</p>
            <p>
              2. Run deterministic checks for syntax, permissions, triggers, and
              supply-chain issues.
            </p>
            <p>
              3. Review findings, score, and report output before updating the
              workflow.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            FAQ
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Placeholder answers are in place now so the route reads like a real
            product page instead of a blank app surface.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {faqPlaceholders.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {item.answer}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Related tools
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            These categories are planned next and intentionally shown as
            placeholders rather than fake linked pages.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {futureToolCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <Badge className="w-fit" tone="subtle">
                  Planned
                </Badge>
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
