"use client";

import { useMemo, useState } from "react";
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
  ActionInventoryItem,
  AnalyzerFinding,
  FindingCategory,
  WorkflowAnalysisReport,
} from "@/features/actions-analyzer/types";

type ResultsPanelView = "all" | "findings" | "report";
type ActionInventoryPartyFilter = "all" | "first-party" | "third-party";

interface ResultsPanelProps {
  activeFileName: string;
  analysisError: string | null;
  hasInput: boolean;
  isAnalyzing: boolean;
  report: WorkflowAnalysisReport | null;
  selectedSampleLabel: string;
  view?: ResultsPanelView | undefined;
}

export function ResultsPanel({
  activeFileName,
  analysisError,
  hasInput,
  isAnalyzing,
  report,
  selectedSampleLabel,
  view = "all",
}: ResultsPanelProps) {
  const hasRunAnalysis = report !== null;
  const actionInventory = useMemo(() => report?.actionInventory ?? [], [report]);
  const findings = useMemo(() => report?.findings ?? [], [report]);
  const issueCount = findings.length;
  const availableCategories = useMemo(() => {
    return ["all", ...getFindingCategories(findings)] as const;
  }, [findings]);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | FindingCategory
  >("all");
  const [actionPartyFilter, setActionPartyFilter] =
    useState<ActionInventoryPartyFilter>("all");
  const [showOnlyPrivilegedActions, setShowOnlyPrivilegedActions] =
    useState(false);
  const [showOnlyUnpinnedActions, setShowOnlyUnpinnedActions] = useState(false);
  const activeCategory =
    selectedCategory === "all" || availableCategories.includes(selectedCategory)
      ? selectedCategory
      : "all";
  const filteredFindings = useMemo(() => {
    return activeCategory === "all"
      ? findings
      : findings.filter((finding) => finding.category === activeCategory);
  }, [activeCategory, findings]);
  const filteredActionInventory = useMemo(() => {
    return actionInventory.filter((item) => {
      if (actionPartyFilter !== "all" && item.origin !== actionPartyFilter) {
        return false;
      }

      if (showOnlyUnpinnedActions && item.pinned) {
        return false;
      }

      if (showOnlyPrivilegedActions && !item.isPrivileged) {
        return false;
      }

      return true;
    });
  }, [
    actionInventory,
    actionPartyFilter,
    showOnlyPrivilegedActions,
    showOnlyUnpinnedActions,
  ]);
  const privilegedActionCount = useMemo(() => {
    return actionInventory.filter((item) => item.isPrivileged).length;
  }, [actionInventory]);
  const unpinnedActionCount = useMemo(() => {
    return actionInventory.filter((item) => !item.pinned).length;
  }, [actionInventory]);
  const findingGroups = getFindingGroups(filteredFindings);
  const showFindings = view === "all" || view === "findings";
  const showReport = view === "all" || view === "report";

  if (!hasInput && !hasRunAnalysis && !isAnalyzing && !analysisError) {
    return (
      <Card data-testid={`results-panel-${view}`}>
        <CardContent className="px-6 py-8">
          <EmptyState
            data-testid="results-empty-state"
            description="Paste workflow YAML, upload a file, or load a sample to prepare the workspace. Manual Analyze will also explain when the workspace is still empty."
            title="No workflow loaded yet"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5" data-testid={`results-panel-${view}`}>
      {isAnalyzing ? (
        <Alert data-testid="analysis-status-message" title="Status" tone="info">
          Analyzing workflow locally...
        </Alert>
      ) : null}

      {analysisError ? (
        <Alert
          data-testid="analysis-error-message"
          title="Analysis error"
          tone="danger"
        >
          {analysisError}
        </Alert>
      ) : null}

      {showFindings ? (
        <Card data-testid="results-findings-card">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={hasRunAnalysis ? "info" : "warning"}>
                {hasRunAnalysis ? "Analyzed locally" : "Ready to analyze"}
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
              {hasRunAnalysis && report
                ? `Authos analyzed ${report.summary.analyzedFileCount} workflow ${
                    report.summary.analyzedFileCount === 1 ? "file" : "files"
                  } in the browser and is showing parser plus registered-rule findings.`
                : "Run analysis to populate local findings, score, and report placeholders."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {hasRunAnalysis && findings.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <Button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                    }}
                    size="sm"
                    variant={
                      activeCategory === category ? "primary" : "secondary"
                    }
                  >
                    {formatCategoryLabel(category)}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <div className="rounded-xl border border-border/80 bg-background/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Score
                </p>
                <p className="mt-3 text-4xl font-semibold text-foreground">
                  {hasRunAnalysis && report ? report.summary.score : "--"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasRunAnalysis
                    ? `Grade ${report?.summary.grade ?? "--"}`
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
                  description="The parser and currently registered core rules did not emit any findings for these workflow files."
                  title="No findings detected"
                />
              ) : filteredFindings.length === 0 ? (
                <EmptyState
                  data-testid="results-no-category-issues"
                  description="No findings in the currently selected category for this analysis run."
                  title="Nothing in this filter"
                />
              ) : (
                <div className="space-y-5" data-testid="results-findings-list">
                  {findingGroups.map((group) => (
                    <section key={group.id} className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {group.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {group.findings.map((finding) => (
                          <FindingCard finding={finding} key={finding.id} />
                        ))}
                      </div>
                    </section>
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
                ? "This run now comes from the real local analyzer pipeline. Richer rule prompts can plug into this report without changing the UI contract."
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
                      ? "Analysis run summary"
                      : "Report preview placeholder"}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {hasRunAnalysis && report
                      ? `Authos analyzed ${report.summary.analyzedFileCount} workflow ${
                          report.summary.analyzedFileCount === 1
                            ? "file"
                            : "files"
                        } locally for `
                      : "A readable report for "}
                    <span className="font-medium text-foreground">
                      {activeFileName}
                    </span>
                    {hasRunAnalysis && report
                      ? `. The current pipeline produced ${report.actionInventory.length} action inventory entries, ${report.triggerSummary.events.length} trigger types, and ${report.matrixSummary.jobs.length} matrix summaries.`
                      : " will appear here with sections for score, findings, action inventory, permissions, and exports."}
                  </p>
                </div>
              </div>
            </div>

            {hasRunAnalysis && report ? (
              <div className="grid gap-3" data-testid="analysis-report-summary">
                <article className="rounded-xl border border-border/80 bg-background/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">
                      {report.summary.workflowCount}{" "}
                      {report.summary.workflowCount === 1
                        ? "workflow"
                        : "workflows"}
                    </Badge>
                    <Badge tone="subtle">
                      {report.triggerSummary.events.length}{" "}
                      {report.triggerSummary.events.length === 1
                        ? "trigger"
                        : "triggers"}
                    </Badge>
                    <Badge tone="subtle">
                      {report.actionInventory.length}{" "}
                      {report.actionInventory.length === 1
                        ? "action"
                        : "actions"}
                    </Badge>
                    <Badge tone="subtle">
                      {report.expressionSummary.totalExpressions}{" "}
                      {report.expressionSummary.totalExpressions === 1
                        ? "expression"
                        : "expressions"}
                    </Badge>
                    <Badge tone="subtle">
                      {report.matrixSummary.jobs.length}{" "}
                      {report.matrixSummary.jobs.length === 1
                        ? "matrix job"
                        : "matrix jobs"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Triggers:{" "}
                    {report.triggerSummary.events.length > 0
                      ? report.triggerSummary.events.join(", ")
                      : "none detected"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Permission warnings:{" "}
                    {report.permissionSummary.warnings.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Expression contexts:{" "}
                    {report.expressionSummary.contexts.length > 0
                      ? report.expressionSummary.contexts.join(", ")
                      : "none detected"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Untrusted expression usages:{" "}
                    {report.expressionSummary.untrustedContextUsages}
                  </p>
                </article>
                <article className="rounded-xl border border-border/80 bg-background/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="danger">
                      {report.securitySummary.criticalFindings} critical
                    </Badge>
                    <Badge tone="severity-high">
                      {report.securitySummary.highFindings} high
                    </Badge>
                    <Badge tone="subtle">
                      {report.permissionSummary.writeScopes.length} write{" "}
                      {report.permissionSummary.writeScopes.length === 1
                        ? "scope"
                        : "scopes"}
                    </Badge>
                    <Badge tone="subtle">
                      {report.permissionSummary.jobOverrides.length} job{" "}
                      {report.permissionSummary.jobOverrides.length === 1
                        ? "override"
                        : "overrides"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Security summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Top-level permissions:{" "}
                    {report.permissionSummary.hasTopLevelPermissions
                      ? "declared"
                      : "missing"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Recommended baseline:{" "}
                    {report.permissionSummary.recommendedPermissions.length > 0
                      ? report.permissionSummary.recommendedPermissions.join(
                          ", ",
                        )
                      : "none suggested"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Untrusted triggers:{" "}
                    {report.triggerSummary.untrustedEvents.length > 0
                      ? report.triggerSummary.untrustedEvents.join(", ")
                      : "none detected"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Privileged triggers:{" "}
                    {report.triggerSummary.privilegedEvents.length > 0
                      ? report.triggerSummary.privilegedEvents.join(", ")
                      : "none detected"}
                  </p>
                </article>
              </div>
            ) : null}

            {hasRunAnalysis && report ? (
              <article
                className="rounded-xl border border-border/80 bg-background/70 p-4"
                data-testid="action-inventory-card"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">
                    {actionInventory.length}{" "}
                    {actionInventory.length === 1 ? "reference" : "references"}
                  </Badge>
                  <Badge
                    tone={unpinnedActionCount > 0 ? "warning" : "success"}
                  >
                    {unpinnedActionCount} unpinned
                  </Badge>
                  <Badge
                    tone={
                      privilegedActionCount > 0 ? "severity-high" : "subtle"
                    }
                  >
                    {privilegedActionCount} privileged
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  Action inventory
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Every step-level and job-level <code>uses</code> reference is
                  classified here so you can review pinning, mutability, and
                  permission context in one place.
                </p>

                {actionInventory.length > 0 ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["all", "first-party", "third-party"] as const).map(
                        (filter) => (
                          <Button
                            key={filter}
                            onClick={() => {
                              setActionPartyFilter(filter);
                            }}
                            size="sm"
                            variant={
                              actionPartyFilter === filter
                                ? "primary"
                                : "secondary"
                            }
                          >
                            {formatActionPartyFilterLabel(filter)}
                          </Button>
                        ),
                      )}
                      <Button
                        onClick={() => {
                          setShowOnlyUnpinnedActions((current) => !current);
                        }}
                        size="sm"
                        variant={
                          showOnlyUnpinnedActions ? "primary" : "secondary"
                        }
                      >
                        Unpinned
                      </Button>
                      <Button
                        onClick={() => {
                          setShowOnlyPrivilegedActions((current) => !current);
                        }}
                        size="sm"
                        variant={
                          showOnlyPrivilegedActions ? "primary" : "secondary"
                        }
                      >
                        Privileged
                      </Button>
                    </div>

                    {filteredActionInventory.length === 0 ? (
                      <div className="mt-4">
                        <EmptyState
                          data-testid="action-inventory-empty-filter"
                          description="No inventory entries match the active action filters."
                          title="Nothing in this filter"
                        />
                      </div>
                    ) : (
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              <th className="px-3 py-2 font-medium">Action</th>
                              <th className="px-3 py-2 font-medium">Kind</th>
                              <th className="px-3 py-2 font-medium">Ref</th>
                              <th className="px-3 py-2 font-medium">
                                Pinning status
                              </th>
                              <th className="px-3 py-2 font-medium">
                                File/job/step
                              </th>
                              <th className="px-3 py-2 font-medium">
                                Permissions context
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredActionInventory.map((item) => (
                              <tr
                                className="rounded-xl border border-border/80 bg-background/80 align-top"
                                key={`${item.filePath}:${item.jobId}:${item.sourceType}:${item.stepIndex ?? "job"}:${item.uses}`}
                              >
                                <td className="rounded-l-xl px-3 py-3">
                                  <p className="font-medium text-foreground">
                                    {item.action}
                                  </p>
                                  <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
                                    {item.uses}
                                  </p>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    <Badge tone="subtle">
                                      {formatActionKindLabel(item.kind)}
                                    </Badge>
                                    {item.origin !== "unknown" &&
                                    item.kind === "reusable-workflow" ? (
                                      <Badge tone="info">
                                        {formatActionKindLabel(item.origin)}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <p className="font-medium text-foreground">
                                    {item.ref ?? "none"}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatActionRefKindLabel(item.refKind)}
                                  </p>
                                </td>
                                <td className="px-3 py-3">
                                  <Badge
                                    tone={item.pinned ? "success" : "warning"}
                                  >
                                    {getPinningStatusLabel(item)}
                                  </Badge>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.mutable ? "Mutable ref" : "Immutable ref"}
                                  </p>
                                </td>
                                <td className="px-3 py-3">
                                  <p className="break-all text-xs leading-5 text-muted-foreground">
                                    {item.filePath}
                                  </p>
                                  <p className="mt-1 text-sm text-foreground">
                                    {item.jobId}
                                    {item.stepLabel ? ` / ${item.stepLabel}` : " / job uses"}
                                  </p>
                                </td>
                                <td className="rounded-r-xl px-3 py-3">
                                  <p className="text-sm text-foreground">
                                    {item.permissions.summary}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {item.privilegedReasons.length > 0
                                      ? item.privilegedReasons.join("; ")
                                      : "No elevated context detected"}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-4">
                    <EmptyState
                      data-testid="action-inventory-empty-state"
                      description="This analysis run did not include any step or job `uses` references."
                      title="No actions or reusable workflows detected"
                    />
                  </div>
                )}
              </article>
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

function FindingCard({ finding }: { finding: AnalyzerFinding }) {
  return (
    <article className="rounded-xl border border-border/80 bg-background/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={getSeverityTone(finding.severity)}>
          {finding.severity}
        </Badge>
        <Badge tone="subtle">{finding.confidence} confidence</Badge>
        <Badge tone="subtle">{finding.ruleId}</Badge>
        <Badge tone="subtle">{formatCategoryLabel(finding.category)}</Badge>
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
      {finding.docsUrl ? (
        <a
          className="mt-3 inline-flex text-sm font-medium text-info underline-offset-4 hover:underline"
          href={finding.docsUrl}
          rel="noreferrer"
          target="_blank"
        >
          View GitHub guidance
        </a>
      ) : null}
    </article>
  );
}

function getFindingGroups(findings: AnalyzerFinding[]) {
  const securityFindings = findings.filter((finding) => isSecurityFinding(finding));
  const supplyChainFindings = findings.filter(
    (finding) => finding.category === "supply-chain",
  );
  const expressionFindings = findings.filter(
    (finding) => finding.category === "expressions",
  );
  const syntaxAndSemantics = findings.filter((finding) =>
    !isSecurityFinding(finding) &&
    finding.category !== "supply-chain" &&
    finding.category !== "expressions" &&
    isSyntaxAndSemanticsFinding(finding),
  );
  const otherFindings = findings.filter(
    (finding) =>
      !isSecurityFinding(finding) &&
      finding.category !== "supply-chain" &&
      finding.category !== "expressions" &&
      !isSyntaxAndSemanticsFinding(finding),
  );
  const groups = [];

  if (securityFindings.length > 0) {
    groups.push({
      description:
        "Permissions, privileged triggers, self-hosted runner exposure, secret scope, and other deterministic security checks for GitHub Actions workflows.",
      findings: securityFindings,
      id: "security",
      title: "Security",
    });
  }

  if (supplyChainFindings.length > 0) {
    groups.push({
      description:
        "Pinning, mutability, Docker digest use, dynamic references, checkout credential persistence, and privileged third-party dependency exposure.",
      findings: supplyChainFindings,
      id: "supply-chain",
      title: "Supply chain",
    });
  }

  if (expressionFindings.length > 0) {
    groups.push({
      description:
        "Expression extraction, context recognition, and preliminary GitHub Actions expression safety checks.",
      findings: expressionFindings,
      id: "expressions",
      title: "Expressions",
    });
  }

  if (syntaxAndSemantics.length > 0) {
    groups.push({
      description:
        "Workflow structure, trigger declarations, reusable workflow callers, action references, and other deterministic GitHub Actions correctness checks.",
      findings: syntaxAndSemantics,
      id: "syntax-and-semantics",
      title: "Syntax and semantics",
    });
  }

  if (otherFindings.length > 0) {
    groups.push({
      description:
        "Additional analyzer findings outside the core workflow syntax and semantics pack.",
      findings: otherFindings,
      id: "other-findings",
      title: "Other findings",
    });
  }

  return groups;
}

function getFindingCategories(findings: AnalyzerFinding[]) {
  return Array.from(new Set(findings.map((finding) => finding.category))).sort(
    categorySort,
  );
}

function formatCategoryLabel(category: "all" | FindingCategory) {
  if (category === "all") {
    return "All";
  }

  return category
    .split("-")
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatActionKindLabel(
  value: ActionInventoryItem["kind"] | ActionInventoryItem["origin"],
) {
  return value
    .split("-")
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatActionPartyFilterLabel(filter: ActionInventoryPartyFilter) {
  return filter === "all" ? "All" : formatActionKindLabel(filter);
}

function formatActionRefKindLabel(refKind: ActionInventoryItem["refKind"]) {
  return refKind
    .split("-")
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function getPinningStatusLabel(item: ActionInventoryItem) {
  if (item.pinned) {
    if (item.refKind === "digest") {
      return "Pinned by digest";
    }

    if (item.refKind === "full-sha") {
      return "Pinned to full SHA";
    }

    if (item.kind === "local") {
      return "Local reference";
    }

    if (item.kind === "reusable-workflow" && item.origin === "local") {
      return "Local workflow";
    }

    return "Pinned";
  }

  switch (item.refKind) {
    case "branch":
      return "Branch ref";
    case "expression":
      return "Dynamic ref";
    case "major-tag":
    case "semver-tag":
      return "Tag ref";
    case "short-sha":
      return "Short SHA";
    case "unknown":
      return "Unknown ref";
    case "none":
      return "No pin";
    default:
      return "Unpinned";
  }
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

function isSyntaxAndSemanticsFinding(finding: AnalyzerFinding) {
  const numericRuleId = Number.parseInt(finding.ruleId.slice(3), 10);

  return Number.isFinite(numericRuleId) && numericRuleId < 50;
}

function isSecurityFinding(finding: AnalyzerFinding) {
  const numericRuleId = Number.parseInt(finding.ruleId.slice(3), 10);

  return Number.isFinite(numericRuleId) && numericRuleId >= 100 && numericRuleId < 200;
}

function categorySort(left: FindingCategory, right: FindingCategory) {
  const order = [
    "security",
    "permissions",
    "runner",
    "supply-chain",
    "expressions",
    "syntax",
    "triggers",
  ];

  return (order.indexOf(left) === -1 ? Number.POSITIVE_INFINITY : order.indexOf(left)) -
    (order.indexOf(right) === -1
      ? Number.POSITIVE_INFINITY
      : order.indexOf(right)) || left.localeCompare(right);
}
