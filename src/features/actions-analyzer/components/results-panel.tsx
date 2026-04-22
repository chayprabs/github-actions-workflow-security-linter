import { Download, FileText, SearchCheck, ShieldAlert } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  AnalyzerFinding,
  NormalizedWorkflow,
} from "@/features/actions-analyzer/types";

type ResultsPanelView = "all" | "findings" | "report";

interface ResultsPanelProps {
  activeFileName: string;
  analysisMessage: string | null;
  findings: AnalyzerFinding[];
  hasInput: boolean;
  hasRunAnalysis: boolean;
  normalizedWorkflows: NormalizedWorkflow[];
  parsedFileCount: number;
  score: number | null;
  selectedSampleLabel: string;
  view?: ResultsPanelView | undefined;
}

export function ResultsPanel({
  activeFileName,
  analysisMessage,
  findings,
  hasInput,
  hasRunAnalysis,
  normalizedWorkflows,
  parsedFileCount,
  score,
  selectedSampleLabel,
  view = "all",
}: ResultsPanelProps) {
  if (!hasInput) {
    return (
      <Card data-testid={`results-panel-${view}`}>
        <CardContent className="px-6 py-8">
          <EmptyState
            data-testid="results-empty-state"
            description="Paste workflow YAML, upload a file, or load a sample to prepare the workspace. The analyzer engine and exports will connect in the next step."
            title="No workflow loaded yet"
          />
        </CardContent>
      </Card>
    );
  }

  const showFindings = view === "all" || view === "findings";
  const showReport = view === "all" || view === "report";
  const issueCount = findings.length;

  return (
    <div className="space-y-5" data-testid={`results-panel-${view}`}>
      {analysisMessage ? (
        <Alert
          data-testid="analysis-placeholder-message"
          title="Status"
          tone="info"
        >
          {analysisMessage}
        </Alert>
      ) : null}

      {showFindings ? (
        <Card data-testid="results-findings-card">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={hasRunAnalysis ? "info" : "warning"}>
                {hasRunAnalysis ? "Parsed locally" : "Placeholder"}
              </Badge>
              <Badge tone="subtle">{selectedSampleLabel}</Badge>
              {hasRunAnalysis ? (
                <Badge tone={issueCount === 0 ? "success" : "warning"}>
                  {issueCount} {issueCount === 1 ? "issue" : "issues"}
                </Badge>
              ) : null}
            </div>
            <CardTitle>Findings and score</CardTitle>
            <CardDescription>
              {hasRunAnalysis
                ? `Authos parsed ${parsedFileCount} workflow ${
                    parsedFileCount === 1 ? "file" : "files"
                  } in the browser and is showing YAML parser diagnostics now.`
                : "The analyzer engine is not connected yet, but this panel matches the shape of the eventual findings experience."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <div className="rounded-xl border border-border/80 bg-background/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Score
                </p>
                <p className="mt-3 text-4xl font-semibold text-foreground">
                  {hasRunAnalysis && score !== null ? score : "--"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasRunAnalysis
                    ? "Parser findings only for this prompt"
                    : "Available once rules run"}
                </p>
              </div>
              {!hasRunAnalysis ? (
                <div className="grid gap-3">
                  {[
                    {
                      description:
                        "Syntax diagnostics, parse failures, and YAML structure problems will appear here.",
                      icon: SearchCheck,
                      title: "Syntax and workflow shape",
                    },
                    {
                      description:
                        "Permission breadth, trigger choices, unpinned actions, and timeouts will flow into this list.",
                      icon: ShieldAlert,
                      title: "Security and reliability findings",
                    },
                  ].map(({ description, icon: Icon, title }) => (
                    <div
                      key={title}
                      className="rounded-xl border border-border/80 bg-background/70 p-4"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/12 text-warning">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : issueCount === 0 ? (
                <EmptyState
                  data-testid="results-no-issues"
                  description="The YAML parser accepted the current workflow inputs. Deeper GitHub Actions security and lint rules will be layered on top in subsequent prompts."
                  title="No YAML parse issues detected"
                />
              ) : (
                <div className="grid gap-3" data-testid="results-findings-list">
                  {findings.map((finding) => (
                    <article
                      key={finding.id}
                      className="rounded-xl border border-border/80 bg-background/70 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={getSeverityTone(finding.severity)}>
                          {finding.severity}
                        </Badge>
                        <Badge tone="subtle">{finding.ruleId}</Badge>
                        <Badge tone="info">{finding.filePath}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {finding.location
                            ? `Line ${finding.location.line}, column ${finding.location.column}`
                            : "File-level diagnostic"}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-foreground">
                        {finding.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {finding.message}
                      </p>
                      {finding.evidence ? (
                        <pre className="mt-3 overflow-x-auto rounded-lg border border-border/80 bg-background/80 p-3 text-xs leading-6 text-foreground">
                          {finding.evidence}
                        </pre>
                      ) : null}
                      <p className="mt-3 text-sm text-muted-foreground">
                        {finding.remediation}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showReport ? (
        <Card data-testid="results-report-card">
          <CardHeader>
            <CardTitle>Report and exports</CardTitle>
            <CardDescription>
              {hasRunAnalysis
                ? "This run includes real YAML parse diagnostics. Richer reports and export formats will connect as the analyzer expands."
                : "Export controls are visible now but remain disabled until the analyzer produces structured output."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border/80 bg-background/75 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-info/12 p-2 text-info">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {hasRunAnalysis
                      ? "Parse run summary"
                      : "Report preview placeholder"}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {hasRunAnalysis
                      ? `Authos parsed ${parsedFileCount} workflow ${
                          parsedFileCount === 1 ? "file" : "files"
                        } locally. The current report surface only includes YAML parser findings for `
                      : "A readable report for "}
                    <span className="font-medium text-foreground">
                      {activeFileName}
                    </span>
                    {hasRunAnalysis
                      ? ". Expanded sections for security, permissions, action inventory, and exports will arrive in later prompts."
                      : " will appear here with sections for score, findings, action inventory, permissions, and exports."}
                  </p>
                </div>
              </div>
            </div>

            {hasRunAnalysis && normalizedWorkflows.length > 0 ? (
              <div
                className="grid gap-3"
                data-testid="normalized-workflow-summaries"
              >
                {normalizedWorkflows.map((workflow) => (
                  <article
                    key={workflow.filePath}
                    className="rounded-xl border border-border/80 bg-background/70 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info">
                        {workflow.summary.workflowName ?? "Unnamed workflow"}
                      </Badge>
                      <Badge tone="subtle">{workflow.filePath}</Badge>
                      <Badge tone="subtle">
                        {workflow.summary.jobCount}{" "}
                        {workflow.summary.jobCount === 1 ? "job" : "jobs"}
                      </Badge>
                      <Badge tone="subtle">
                        {workflow.summary.stepCount}{" "}
                        {workflow.summary.stepCount === 1 ? "step" : "steps"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Triggers:{" "}
                      {workflow.summary.triggers.length > 0
                        ? workflow.summary.triggers.join(", ")
                        : "none parsed"}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {["Markdown", "JSON", "SARIF", "HTML"].map((format) => (
                <Button key={format} disabled variant="secondary">
                  <Download className="h-4 w-4" />
                  Export {format}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function getSeverityTone(severity: AnalyzerFinding["severity"]) {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "severity-high";
    case "medium":
      return "severity-medium";
    case "low":
      return "severity-low";
    case "info":
      return "info";
    default:
      return "subtle";
  }
}
