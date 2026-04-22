import Link from "next/link";
import { CheckCircle2, FileSearch, ShieldAlert, Workflow } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toolbar } from "@/components/ui/toolbar";
import { fixtureWorkflows } from "@/features/actions-analyzer/fixtures/sample-workflows";
import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { siteConfig } from "@/lib/site";

const fixturePreview = analyzeWorkflowFiles([fixtureWorkflows.risky]);
const sampleYaml = fixtureWorkflows.risky.content.trim();

export function AnalyzerPlaceholder() {
  return (
    <div className="space-y-8" data-testid="analyzer-placeholder">
      <Toolbar
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton
              data-testid="copy-sample-yaml"
              label="Copy sample YAML"
              value={sampleYaml}
            />
            <Link
              className={buttonVariants({ size: "sm", variant: "secondary" })}
              href={siteConfig.privacy.href}
            >
              Privacy
            </Link>
          </div>
        }
        data-testid="analyzer-toolbar"
        description="This route is live now as a clear placeholder. The interactive analyzer experience, richer local browser worker flow, and file import UX will be built in subsequent prompts."
        title="GitHub Actions Workflow Security and Lint Analyzer"
      >
        <Badge tone="info">First Authos tool</Badge>
      </Toolbar>

      <Alert
        data-testid="analyzer-privacy-alert"
        title="Local-first privacy contract"
        tone="info"
      >
        Pasted workflow content for this analyzer is not uploaded. Public GitHub
        import, when added later, will fetch public repository data directly
        from the browser.
      </Alert>

      <Tabs
        className="space-y-6"
        data-testid="analyzer-tabs"
        defaultValue="overview"
      >
        <TabsList
          aria-label="Analyzer foundation sections"
          data-testid="analyzer-tabs-list"
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
        </TabsList>

        <TabsContent
          className="space-y-6"
          data-testid="analyzer-overview-panel"
          value="overview"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="border-accent/15">
              <CardHeader>
                <CardTitle>What is already scaffolded</CardTitle>
                <CardDescription>
                  The foundation is intentionally small, deterministic, and easy
                  to extend without reworking the shell.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    icon: Workflow,
                    title: "Route and feature boundaries",
                    description:
                      "Dedicated feature folders, workers, fixtures, types, and shared UI primitives are in place.",
                  },
                  {
                    icon: ShieldAlert,
                    title: "Rule engine seed",
                    description:
                      "A local YAML parser and rule scaffold already checks permissions, supply-chain pinning, and missing timeouts.",
                  },
                  {
                    icon: FileSearch,
                    title: "Privacy posture",
                    description:
                      "The product contract is local-only by default with no login and no backend upload of pasted content.",
                  },
                  {
                    icon: CheckCircle2,
                    title: "Verification path",
                    description:
                      "Typecheck, lint, build, and unit test workflows are wired so we can iterate safely.",
                  },
                ].map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-border/80 bg-background/70 p-5"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-base font-semibold">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card data-testid="analyzer-overview-stats">
              <CardHeader>
                <CardTitle>Fixture preview</CardTitle>
                <CardDescription>
                  The current analyzer scaffold can already inspect a sample
                  workflow locally and produce deterministic findings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Progress
                  data-testid="analyzer-progress"
                  label="Foundation progress"
                  tone="info"
                  value={20}
                />
                <div className="rounded-2xl bg-accent/10 p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Sample risk score
                  </p>
                  <p className="mt-2 text-4xl font-semibold text-foreground">
                    {fixturePreview.summary.score}
                  </p>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Findings seeded from fixture:{" "}
                    <span className="font-semibold text-foreground">
                      {fixturePreview.findings.length}
                    </span>
                  </p>
                  <p>
                    Actions inventory:{" "}
                    <span className="font-semibold text-foreground">
                      {fixturePreview.actionInventory
                        .map((item) => item.action)
                        .join(", ")}
                    </span>
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Badge tone="severity-medium">AUTHOS-GHA-001</Badge>
                <Badge tone="severity-high">AUTHOS-GHA-002</Badge>
                <Badge tone="severity-low">AUTHOS-GHA-003</Badge>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          className="space-y-6"
          data-testid="analyzer-inputs-panel"
          value="inputs"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card data-testid="analyzer-input-preview">
              <CardHeader>
                <CardTitle>Input foundation</CardTitle>
                <CardDescription>
                  These controls are scaffolded now so the real analyzer flow
                  can plug into them in later prompts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Workflow YAML
                  </span>
                  <Textarea
                    data-testid="workflow-yaml-input"
                    defaultValue={sampleYaml}
                    rows={14}
                  />
                </label>
              </CardContent>
            </Card>

            <Card data-testid="analyzer-input-options">
              <CardHeader>
                <CardTitle>Import and export settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Public GitHub repo import later
                  </span>
                  <Input
                    data-testid="repo-input"
                    disabled
                    placeholder="owner/repository"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Preferred export format
                  </span>
                  <Select
                    data-testid="export-format-select"
                    defaultValue="sarif"
                  >
                    <option value="markdown">Markdown</option>
                    <option value="json">JSON</option>
                    <option value="sarif">SARIF</option>
                    <option value="html">HTML</option>
                  </Select>
                </label>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/70 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Local-only analysis mode
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Browser-side processing remains the default.
                    </p>
                  </div>
                  <Switch
                    aria-label="Keep analysis local to the browser"
                    data-testid="local-only-switch"
                    defaultChecked
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          className="space-y-6"
          data-testid="analyzer-outputs-panel"
          value="outputs"
        >
          <EmptyState
            action={
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">Markdown</Badge>
                <Badge tone="info">JSON</Badge>
                <Badge tone="warning">SARIF</Badge>
                <Badge tone="danger">HTML</Badge>
              </div>
            }
            data-testid="analyzer-output-empty-state"
            description="Findings, score, diagnostics, action inventory, and export flows are specified in the product docs, but the interactive output experience will be built in subsequent prompts."
            title="Output panels are scaffolded, not finished"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
