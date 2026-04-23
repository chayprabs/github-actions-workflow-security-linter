"use client";

import type { ReactNode } from "react";
import { useDeferredValue, useMemo, useState } from "react";
import { Filter } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePushActionToast } from "@/features/actions-analyzer/components/action-toast-provider";
import { AttackPathPanel } from "@/features/actions-analyzer/components/attack-path-panel";
import { MatrixPreviewPanel } from "@/features/actions-analyzer/components/matrix-preview-panel";
import { PermissionMinimizerPanel } from "@/features/actions-analyzer/components/permission-minimizer-panel";
import { ReportExportPanel } from "@/features/actions-analyzer/components/report-export-panel";
import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import {
  applySuggestedFix,
  buildSuggestedFixPreview,
  canApplySuggestedFix,
} from "@/features/actions-analyzer/lib/suggested-fixes";
import {
  getSeverityTone,
  severityDisplayOrder,
} from "@/features/actions-analyzer/lib/finding-presentation";
import {
  buildReliabilitySummary,
  filterFindingsForResults,
  formatCategoryLabel,
  formatFindingLocationLabel,
  getAvailableFindingFiles,
  getAvailableFindingJobs,
  groupFindingsForResults,
  type ResultsFindingFilters,
  type ResultsFindingGroup,
  type ResultsFindingGroupBy,
  type ResultsFindingSort,
  sortFindingsForResults,
} from "@/features/actions-analyzer/lib/results-presentation";
import { parseAnalyzerShareState } from "@/features/actions-analyzer/lib/report-share";
import type { ResultsShareState } from "@/features/actions-analyzer/lib/report-share";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import type {
  ActionInventoryItem,
  AnalyzerFinding,
  FindingCategory,
  IgnoredFinding,
  Severity,
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

type ResultsPanelView = "all" | "findings" | "report";
type ActionInventoryPartyFilter = "all" | "first-party" | "third-party";

interface ResultsPanelProps {
  activeFileName: string;
  activeFindingId: string | null;
  analysisError: string | null;
  files?: WorkflowInputFile[] | undefined;
  hasInput: boolean;
  isAnalyzing: boolean;
  lastAnalyzedAt?: number | null;
  onApplyFix?: ((filePath: string, nextContent: string) => boolean) | undefined;
  onFindingSelect: (finding: AnalyzerFinding) => void;
  report: WorkflowAnalysisReport | null;
  selectedSampleId: WorkflowSampleId | "manual";
  selectedSampleLabel: string;
  view?: ResultsPanelView | undefined;
}

const groupByOptions: Array<{
  label: string;
  value: ResultsFindingGroupBy;
}> = [
  { label: "By severity", value: "severity" },
  { label: "By file", value: "file" },
  { label: "By category", value: "category" },
  { label: "Flat list", value: "flat" },
];

const sortOptions: Array<{
  label: string;
  value: ResultsFindingSort;
}> = [
  { label: "Severity", value: "severity" },
  { label: "File and line", value: "file-line" },
  { label: "Category", value: "category" },
  { label: "Rule", value: "rule" },
];

export function ResultsPanel({
  activeFileName,
  activeFindingId,
  analysisError,
  files = [],
  hasInput,
  isAnalyzing,
  lastAnalyzedAt,
  onApplyFix,
  onFindingSelect,
  report,
  selectedSampleId,
  selectedSampleLabel,
  view = "all",
}: ResultsPanelProps) {
  const pushToast = usePushActionToast();
  const findings = useMemo(() => report?.findings ?? [], [report]);
  const initialShareState = useMemo(() => readInitialResultsShareState(), []);
  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(findings.map((finding) => finding.category)),
    ).sort(categorySort);
  }, [findings]);
  const availableFiles = useMemo(
    () => getAvailableFindingFiles(findings),
    [findings],
  );
  const availableJobs = useMemo(
    () => getAvailableFindingJobs(findings),
    [findings],
  );
  const [searchQuery, setSearchQuery] = useState(initialShareState.searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | FindingCategory
  >(initialShareState.selectedCategory);
  const [selectedFilePath, setSelectedFilePath] = useState<"all" | string>(
    initialShareState.selectedFilePath,
  );
  const [selectedJobId, setSelectedJobId] = useState<"all" | string>(
    initialShareState.selectedJobId,
  );
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>(
    initialShareState.selectedSeverities,
  );
  const [showSecurityOnly, setShowSecurityOnly] = useState(
    initialShareState.showSecurityOnly,
  );
  const [showWarningsOnly, setShowWarningsOnly] = useState(
    initialShareState.showWarningsOnly,
  );
  const [groupBy, setGroupBy] = useState<ResultsFindingGroupBy>(
    initialShareState.groupBy,
  );
  const [sortBy, setSortBy] = useState<ResultsFindingSort>(
    initialShareState.sortBy,
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasRunAnalysis = report !== null;
  const showFindings = view === "all" || view === "findings";
  const showReport = view === "all" || view === "report";
  const activeCategory =
    selectedCategory === "all" || availableCategories.includes(selectedCategory)
      ? selectedCategory
      : "all";
  const activeFilePath =
    selectedFilePath === "all" || availableFiles.includes(selectedFilePath)
      ? selectedFilePath
      : "all";
  const activeJobId =
    selectedJobId === "all" || availableJobs.includes(selectedJobId)
      ? selectedJobId
      : "all";
  const filterState = useMemo<ResultsFindingFilters>(
    () => ({
      searchQuery: deferredSearchQuery,
      selectedCategory: activeCategory,
      selectedFilePath: activeFilePath,
      selectedJobId: activeJobId,
      selectedSeverities,
      showSecurityOnly,
      showWarningsOnly,
      sortBy,
    }),
    [
      activeCategory,
      activeFilePath,
      activeJobId,
      deferredSearchQuery,
      selectedSeverities,
      showSecurityOnly,
      showWarningsOnly,
      sortBy,
    ],
  );
  const filteredFindings = useMemo(() => {
    return sortFindingsForResults(
      filterFindingsForResults(findings, filterState),
      sortBy,
    );
  }, [filterState, findings, sortBy]);
  const groupedFindings = useMemo(
    () => groupFindingsForResults(filteredFindings, groupBy),
    [filteredFindings, groupBy],
  );
  const resultsShareState = useMemo<ResultsShareState>(
    () => ({
      groupBy,
      searchQuery,
      selectedCategory: activeCategory,
      selectedFilePath: activeFilePath,
      selectedJobId: activeJobId,
      selectedSeverities,
      showSecurityOnly,
      showWarningsOnly,
      sortBy,
      view,
    }),
    [
      activeCategory,
      activeFilePath,
      activeJobId,
      groupBy,
      searchQuery,
      selectedSeverities,
      showSecurityOnly,
      showWarningsOnly,
      sortBy,
      view,
    ],
  );
  const findingCount = findings.length;
  const ignoredFindings = report?.ignoredFindings ?? [];
  const selectedIgnoredFinding =
    ignoredFindings.find((item) => item.finding.id === activeFindingId) ?? null;
  const selectedFinding =
    findings.find((finding) => finding.id === activeFindingId) ??
    selectedIgnoredFinding?.finding ??
    null;
  const filteredSelectedFinding =
    filteredFindings.find((finding) => finding.id === activeFindingId) ?? null;
  const selectedFindingHiddenByFilters =
    selectedFinding !== null &&
    selectedIgnoredFinding === null &&
    filteredSelectedFinding === null;
  const currentFilesByPath = useMemo(() => {
    return new Map(
      files.map((file) => [normalizeFilePath(file.path), file.content]),
    );
  }, [files]);
  const analyzedFilesByPath = useMemo(() => {
    return new Map(
      (report?.files ?? []).map((file) => [
        normalizeFilePath(file.path),
        file.content,
      ]),
    );
  }, [report]);
  const reliabilitySummary = useMemo(() => {
    return report ? buildReliabilitySummary(report) : null;
  }, [report]);
  const lastAnalyzedLabel = formatLastAnalyzedLabel(
    lastAnalyzedAt ?? (report ? Date.parse(report.generatedAt) : null),
  );
  const analysisDiagnosticInfo = useMemo(() => {
    if (!analysisError) {
      return "";
    }

    return JSON.stringify(
      {
        activeFileName,
        error: analysisError,
        generatedAt: report?.generatedAt ?? null,
        lastAnalyzedAt:
          typeof lastAnalyzedAt === "number"
            ? new Date(lastAnalyzedAt).toISOString()
            : null,
        reportFileCount: report?.summary.analyzedFileCount ?? 0,
      },
      null,
      2,
    );
  }, [activeFileName, analysisError, lastAnalyzedAt, report]);
  const [fixFeedback, setFixFeedback] = useState<{
    findingId: string;
    message: string;
    tone: "danger" | "success" | "warning";
  } | null>(null);

  function publishFixFeedback({
    findingId,
    message,
    tone,
  }: {
    findingId: string;
    message: string;
    tone: "danger" | "success" | "warning";
  }) {
    setFixFeedback({
      findingId,
      message,
      tone,
    });
    pushToast({
      message,
      tone,
    });
  }

  function handleApplyFixClick(finding: AnalyzerFinding) {
    if (!finding.fix) {
      return;
    }

    const analyzedFileContent = analyzedFilesByPath.get(
      normalizeFilePath(finding.fix.filePath),
    );
    const currentFileContent = currentFilesByPath.get(
      normalizeFilePath(finding.fix.filePath),
    );

    if (
      !analyzedFileContent ||
      currentFileContent === undefined ||
      !onApplyFix
    ) {
      publishFixFeedback({
        findingId: finding.id,
        message: "Authos could not find the file content needed for this fix.",
        tone: "danger",
      });
      return;
    }

    const result = applySuggestedFix({
      analyzedContent: analyzedFileContent,
      currentContent: currentFileContent,
      fix: finding.fix,
    });

    if (!result.ok) {
      publishFixFeedback({
        findingId: finding.id,
        message: result.message,
        tone: result.code === "stale" ? "warning" : "danger",
      });
      return;
    }

    const applied = onApplyFix(finding.fix.filePath, result.nextContent);

    publishFixFeedback({
      findingId: finding.id,
      message: applied
        ? "Fix applied locally. Re-run analysis to refresh the report."
        : "Authos could not update the target file in the workspace.",
      tone: applied ? "success" : "danger",
    });

    if (applied) {
      onFindingSelect(finding);
    }
  }

  if (!hasInput && !hasRunAnalysis && !isAnalyzing && !analysisError) {
    return (
      <EmptyState
        data-testid="results-empty-state"
        description="Load a sample if you want to explore the analyzer without pasting your own YAML yet."
        title="Paste or upload a workflow to start."
      />
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
          <div className="space-y-3">
            <p>
              Authos hit an analyzer exception while reviewing your workflow.
              The editor input stays local, and you can copy diagnostic context
              without exposing a raw stack trace in the page.
            </p>
            <div className="flex flex-wrap gap-2">
              <CopyButton
                copiedLabel="Copied diagnostics"
                label="Copy diagnostic info"
                value={analysisDiagnosticInfo}
              />
            </div>
          </div>
        </Alert>
      ) : null}

      {hasRunAnalysis && report ? (
        <ResultsScoreHeader
          lastAnalyzedLabel={lastAnalyzedLabel}
          report={report}
          selectedSampleLabel={selectedSampleLabel}
        />
      ) : null}

      {!hasRunAnalysis && hasInput && !analysisError && !isAnalyzing ? (
        <EmptyState
          description="Run the analyzer to populate score, findings, and summary inventories for this workflow workspace."
          title="Analyze this workspace to review results."
        />
      ) : null}

      {showFindings && hasRunAnalysis && report ? (
        <section className="space-y-4">
          <FindingsFilterToolbar
            availableCategories={availableCategories}
            availableFiles={availableFiles}
            availableJobs={availableJobs}
            groupBy={groupBy}
            hasActiveFilters={hasActiveFilters(filterState)}
            searchQuery={searchQuery}
            selectedCategory={activeCategory}
            selectedFilePath={activeFilePath}
            selectedJobId={activeJobId}
            selectedSeverities={selectedSeverities}
            showSecurityOnly={showSecurityOnly}
            showWarningsOnly={showWarningsOnly}
            sortBy={sortBy}
            onClearFilters={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedFilePath("all");
              setSelectedJobId("all");
              setSelectedSeverities([]);
              setShowSecurityOnly(false);
              setShowWarningsOnly(false);
              setGroupBy("severity");
              setSortBy("severity");
            }}
            onGroupByChange={setGroupBy}
            onSearchQueryChange={setSearchQuery}
            onSelectedCategoryChange={setSelectedCategory}
            onSelectedFilePathChange={setSelectedFilePath}
            onSelectedJobIdChange={setSelectedJobId}
            onSortByChange={setSortBy}
            onToggleSecurityOnly={setShowSecurityOnly}
            onToggleSeverity={(severity) => {
              setSelectedSeverities((current) =>
                current.includes(severity)
                  ? current.filter((value) => value !== severity)
                  : [...current, severity],
              );
            }}
            onToggleWarningsOnly={setShowWarningsOnly}
          />

          {findingCount === 0 ? (
            <section className="space-y-4">
              <EmptyState
                data-testid="results-no-issues"
                description="No findings for enabled rules. Review strict mode if you need a stricter policy."
                title="No findings for enabled rules."
              />
              <IgnoredFindingsSection
                activeFindingId={activeFindingId}
                ignoredFindings={ignoredFindings}
                onFindingSelect={onFindingSelect}
              />
              <FindingDetailPanel
                actionInventory={report.actionInventory}
                analyzedFileContent={
                  selectedFinding
                    ? (analyzedFilesByPath.get(
                        normalizeFilePath(selectedFinding.filePath),
                      ) ?? null)
                    : null
                }
                currentFileContent={
                  selectedFinding
                    ? (currentFilesByPath.get(
                        normalizeFilePath(selectedFinding.filePath),
                      ) ?? null)
                    : null
                }
                fixFeedback={
                  fixFeedback?.findingId === selectedFinding?.id
                    ? fixFeedback
                    : null
                }
                finding={selectedFinding}
                ignoredFinding={selectedIgnoredFinding}
                isHiddenByFilters={false}
                onApplyFix={handleApplyFixClick}
              />
            </section>
          ) : filteredFindings.length === 0 ? (
            <EmptyState
              data-testid="results-no-filtered-findings"
              description="Clear one or more filters to bring hidden findings back into view."
              title="All matching findings are hidden by filters."
            />
          ) : (
            <section className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-background/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{filteredFindings.length} visible</Badge>
                  <Badge tone="subtle">{findingCount} total findings</Badge>
                  <Badge tone="subtle">
                    {
                      groupByOptions.find((option) => option.value === groupBy)
                        ?.label
                    }
                  </Badge>
                  <Badge tone="subtle">
                    {
                      sortOptions.find((option) => option.value === sortBy)
                        ?.label
                    }
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Findings stay searchable, sortable, and grouped for larger
                  workflows so you can scan broad issues first and then drill
                  into a specific rule or file.
                </p>
              </div>

              <div className="space-y-4" data-testid="results-finding-list">
                {groupedFindings.map((group) => (
                  <FindingGroupSection
                    activeFindingId={activeFindingId}
                    group={group}
                    key={group.id}
                    onFindingSelect={onFindingSelect}
                  />
                ))}
              </div>

              <IgnoredFindingsSection
                activeFindingId={activeFindingId}
                ignoredFindings={ignoredFindings}
                onFindingSelect={onFindingSelect}
              />

              <FindingDetailPanel
                actionInventory={report.actionInventory}
                analyzedFileContent={
                  selectedFinding
                    ? (analyzedFilesByPath.get(
                        normalizeFilePath(selectedFinding.filePath),
                      ) ?? null)
                    : null
                }
                currentFileContent={
                  selectedFinding
                    ? (currentFilesByPath.get(
                        normalizeFilePath(selectedFinding.filePath),
                      ) ?? null)
                    : null
                }
                fixFeedback={
                  fixFeedback?.findingId === selectedFinding?.id
                    ? fixFeedback
                    : null
                }
                finding={filteredSelectedFinding ?? selectedFinding}
                ignoredFinding={selectedIgnoredFinding}
                isHiddenByFilters={selectedFindingHiddenByFilters}
                onApplyFix={handleApplyFixClick}
              />
            </section>
          )}
        </section>
      ) : null}

      {showReport && hasRunAnalysis && report ? (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-2">
            <SummaryPanel
              badges={[
                <Badge key="critical" tone="danger">
                  {report.securitySummary.criticalFindings} critical
                </Badge>,
                <Badge key="high" tone="severity-high">
                  {report.securitySummary.highFindings} high
                </Badge>,
                <Badge key="total" tone="subtle">
                  {report.securitySummary.totalFindings} security findings
                </Badge>,
              ]}
              title="Security summary"
            >
              <SummaryLine
                label="Untrusted triggers"
                value={formatStringList(report.triggerSummary.untrustedEvents)}
              />
              <SummaryLine
                label="Privileged triggers"
                value={formatStringList(report.triggerSummary.privilegedEvents)}
              />
              <SummaryLine
                label="Privileged action refs"
                value={String(
                  report.actionInventory.filter((item) => item.isPrivileged)
                    .length,
                )}
              />
              <SummaryLine
                label="Recommended baseline"
                value={formatStringList(
                  report.permissionSummary.recommendedPermissions,
                )}
              />
            </SummaryPanel>

            <SummaryPanel
              badges={[
                <Badge key="top-level" tone="info">
                  {report.permissionSummary.hasTopLevelPermissions
                    ? "Top-level declared"
                    : "Top-level missing"}
                </Badge>,
                <Badge key="write-scopes" tone="subtle">
                  {report.permissionSummary.writeScopes.length} write scopes
                </Badge>,
                <Badge key="job-overrides" tone="subtle">
                  {report.permissionSummary.jobOverrides.length} job overrides
                </Badge>,
              ]}
              title="Permission summary"
            >
              <SummaryLine
                label="Warnings"
                value={
                  report.permissionSummary.warnings.length > 0
                    ? report.permissionSummary.warnings.join("; ")
                    : "No permission warnings"
                }
              />
              <SummaryLine
                label="Top-level blocks"
                value={String(report.permissionSummary.topLevel.length)}
              />
              <SummaryLine
                label="Jobs without top-level permissions"
                value={String(
                  report.permissionSummary.missingPermissions.length,
                )}
              />
              <SummaryLine
                label="Job recommendations"
                value={String(
                  report.permissionSummary.jobRecommendations.length,
                )}
              />
            </SummaryPanel>

            <SummaryPanel
              badges={[
                <Badge key="events" tone="info">
                  {report.triggerSummary.events.length} triggers
                </Badge>,
                <Badge key="manual" tone="subtle">
                  {report.triggerSummary.manualEvents.length} manual
                </Badge>,
                <Badge key="scheduled" tone="subtle">
                  {report.triggerSummary.scheduledEvents.length} scheduled
                </Badge>,
              ]}
              title="Trigger summary"
            >
              <SummaryLine
                label="Events"
                value={formatStringList(report.triggerSummary.events)}
              />
              <SummaryLine
                label="Trusted triggers"
                value={formatStringList(report.triggerSummary.trustedEvents)}
              />
              <SummaryLine
                label="Release triggers"
                value={formatStringList(report.triggerSummary.releaseEvents)}
              />
              <SummaryLine
                label="workflow_dispatch"
                value={
                  report.triggerSummary.usesWorkflowDispatch ? "Yes" : "No"
                }
              />
            </SummaryPanel>

            <SummaryPanel
              badges={[
                <Badge key="reliability" tone="info">
                  {reliabilitySummary?.totalFindingCount ?? 0} operational
                  findings
                </Badge>,
                <Badge key="matrix" tone="subtle">
                  {report.matrixSummary.warningCount} matrix warnings
                </Badge>,
                <Badge key="timeouts" tone="subtle">
                  {reliabilitySummary?.timeoutFindingCount ?? 0} timeout
                  findings
                </Badge>,
              ]}
              title="Reliability summary"
            >
              <SummaryLine
                label="Reliability findings"
                value={String(reliabilitySummary?.reliabilityFindingCount ?? 0)}
              />
              <SummaryLine
                label="Maintainability findings"
                value={String(
                  reliabilitySummary?.maintainabilityFindingCount ?? 0,
                )}
              />
              <SummaryLine
                label="Performance findings"
                value={String(reliabilitySummary?.performanceFindingCount ?? 0)}
              />
              <SummaryLine
                label="Unresolved matrix jobs"
                value={String(
                  reliabilitySummary?.unresolvedMatrixJobCount ?? 0,
                )}
              />
            </SummaryPanel>
          </section>

          <PermissionMinimizerPanel
            permissionSummary={report.permissionSummary}
          />

          <AttackPathPanel attackPaths={report.attackPaths} />

          <ActionInventoryPanel actionInventory={report.actionInventory} />

          <MatrixPreviewPanel
            matrixSummary={report.matrixSummary}
            maxCombinationsBeforeWarning={
              report.settings.maxMatrixCombinationsBeforeWarning
            }
          />

          <ReportExportPanel
            files={files}
            report={report}
            resultsShareState={resultsShareState}
            selectedSampleId={selectedSampleId}
          />
        </div>
      ) : null}
    </div>
  );
}

function ResultsScoreHeader({
  lastAnalyzedLabel,
  report,
  selectedSampleLabel,
}: {
  lastAnalyzedLabel: string;
  report: WorkflowAnalysisReport;
  selectedSampleLabel: string;
}) {
  return (
    <section
      className="rounded-2xl border border-border/80 bg-background/75 p-5"
      data-testid="results-score"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Analyzed locally</Badge>
            <Badge tone="subtle">{selectedSampleLabel}</Badge>
            <Badge tone="subtle">Last analyzed {lastAnalyzedLabel}</Badge>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Score
              </p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-foreground">
                {formatScore(report.summary.score)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Out of 100, based on deterministic finding severity weights.
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Grade
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {report.summary.grade}
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-w-[15rem] gap-2 sm:grid-cols-2">
          <MetricTile
            label="Files"
            value={String(report.summary.analyzedFileCount)}
          />
          <MetricTile
            label="Workflows"
            value={String(report.summary.workflowCount)}
          />
          <MetricTile label="Jobs" value={String(report.summary.jobCount)} />
          <MetricTile
            label="Actions"
            value={String(report.actionInventory.length)}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {severityDisplayOrder.map((severity) => (
          <Badge key={severity} tone={getSeverityTone(severity)}>
            {report.summary.severityCounts[severity]} {severity}
          </Badge>
        ))}
      </div>
    </section>
  );
}

function FindingsFilterToolbar({
  availableCategories,
  availableFiles,
  availableJobs,
  groupBy,
  hasActiveFilters,
  searchQuery,
  selectedCategory,
  selectedFilePath,
  selectedJobId,
  selectedSeverities,
  showSecurityOnly,
  showWarningsOnly,
  sortBy,
  onClearFilters,
  onGroupByChange,
  onSearchQueryChange,
  onSelectedCategoryChange,
  onSelectedFilePathChange,
  onSelectedJobIdChange,
  onSortByChange,
  onToggleSecurityOnly,
  onToggleSeverity,
  onToggleWarningsOnly,
}: {
  availableCategories: FindingCategory[];
  availableFiles: string[];
  availableJobs: string[];
  groupBy: ResultsFindingGroupBy;
  hasActiveFilters: boolean;
  searchQuery: string;
  selectedCategory: "all" | FindingCategory;
  selectedFilePath: "all" | string;
  selectedJobId: "all" | string;
  selectedSeverities: Severity[];
  showSecurityOnly: boolean;
  showWarningsOnly: boolean;
  sortBy: ResultsFindingSort;
  onClearFilters: () => void;
  onGroupByChange: (value: ResultsFindingGroupBy) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectedCategoryChange: (value: "all" | FindingCategory) => void;
  onSelectedFilePathChange: (value: "all" | string) => void;
  onSelectedJobIdChange: (value: "all" | string) => void;
  onSortByChange: (value: ResultsFindingSort) => void;
  onToggleSecurityOnly: (checked: boolean) => void;
  onToggleSeverity: (severity: Severity) => void;
  onToggleWarningsOnly: (checked: boolean) => void;
}) {
  return (
    <section
      className="rounded-xl border border-border/80 bg-background/70 p-4"
      data-testid="results-filters"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-accent/10 p-2 text-accent">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Filter findings
            </p>
            <p className="text-sm text-muted-foreground">
              Search and narrow the current analysis run without losing access
              to the underlying report data.
            </p>
          </div>
        </div>
        {hasActiveFilters ? (
          <Button onClick={onClearFilters} size="sm" variant="ghost">
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="results-filter-search"
          >
            Search findings
          </label>
          <Input
            data-testid="results-filter-search"
            id="results-filter-search"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search rule IDs, titles, files, jobs, tags..."
            value={searchQuery}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="results-sort-select"
            >
              Sort
            </label>
            <Select
              id="results-sort-select"
              onChange={(event) =>
                onSortByChange(event.target.value as ResultsFindingSort)
              }
              value={sortBy}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="results-group-select"
            >
              View
            </label>
            <Select
              id="results-group-select"
              onChange={(event) =>
                onGroupByChange(event.target.value as ResultsFindingGroupBy)
              }
              value={groupBy}
            >
              {groupByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="results-category-filter"
          >
            Category
          </label>
          <Select
            id="results-category-filter"
            onChange={(event) =>
              onSelectedCategoryChange(
                event.target.value as "all" | FindingCategory,
              )
            }
            value={selectedCategory}
          >
            <option value="all">All categories</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="results-file-filter"
          >
            File
          </label>
          <Select
            id="results-file-filter"
            onChange={(event) => onSelectedFilePathChange(event.target.value)}
            value={selectedFilePath}
          >
            <option value="all">All files</option>
            {availableFiles.map((filePath) => (
              <option key={filePath} value={filePath}>
                {filePath}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="results-job-filter"
          >
            Job
          </label>
          <Select
            id="results-job-filter"
            onChange={(event) => onSelectedJobIdChange(event.target.value)}
            value={selectedJobId}
          >
            <option value="all">All jobs</option>
            {availableJobs.map((jobId) => (
              <option key={jobId} value={jobId}>
                {jobId}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Severity</p>
          <div className="flex flex-wrap gap-2">
            {severityDisplayOrder.map((severity) => (
              <Button
                key={severity}
                onClick={() => onToggleSeverity(severity)}
                size="sm"
                variant={
                  selectedSeverities.includes(severity)
                    ? "primary"
                    : "secondary"
                }
              >
                {severity}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <ToggleLine
            checked={showSecurityOnly}
            description="Focus on security-sensitive categories like permissions, triggers, runners, and supply chain."
            label="Show security only"
            onCheckedChange={onToggleSecurityOnly}
          />
          <ToggleLine
            checked={showWarningsOnly}
            description="Hide low and info findings so the list stays focused on higher-risk issues."
            label="Show warnings only"
            onCheckedChange={onToggleWarningsOnly}
          />
        </div>
      </div>
    </section>
  );
}

function ToggleLine({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-w-[16rem] items-start gap-3 rounded-xl border border-border/80 bg-card px-3 py-2">
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FindingGroupSection({
  activeFindingId,
  group,
  onFindingSelect,
}: {
  activeFindingId: string | null;
  group: ResultsFindingGroup;
  onFindingSelect: (finding: AnalyzerFinding) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
        <Badge tone="subtle">{group.findings.length} findings</Badge>
      </div>
      <div className="space-y-2">
        {group.findings.map((finding) => (
          <FindingRow
            finding={finding}
            isActive={finding.id === activeFindingId}
            key={finding.id}
            onSelect={onFindingSelect}
          />
        ))}
      </div>
    </section>
  );
}

function FindingRow({
  finding,
  isActive,
  onSelect,
}: {
  finding: AnalyzerFinding;
  isActive: boolean;
  onSelect: (finding: AnalyzerFinding) => void;
}) {
  const jobLabel = finding.relatedJobs[0] ?? null;
  const stepLabel = finding.relatedSteps[0] ?? null;

  return (
    <article
      className={`rounded-xl border bg-background/70 transition-colors ${
        isActive
          ? "border-accent ring-2 ring-accent/20"
          : "border-border/80 hover:border-accent/40"
      }`}
    >
      <button
        aria-pressed={isActive}
        className="w-full px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => onSelect(finding)}
        type="button"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={getSeverityTone(finding.severity)}>
            {finding.severity}
          </Badge>
          <Badge tone="subtle">{finding.ruleId}</Badge>
          <Badge tone="subtle">{finding.confidence} confidence</Badge>
          <Badge tone="subtle">{formatCategoryLabel(finding.category)}</Badge>
          <Badge tone="info">{formatFindingLocationLabel(finding)}</Badge>
          {jobLabel ? <Badge tone="subtle">Job {jobLabel}</Badge> : null}
          {stepLabel ? <Badge tone="subtle">Step {stepLabel}</Badge> : null}
        </div>
        <h4 className="mt-3 text-sm font-semibold text-foreground">
          {finding.title}
        </h4>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {finding.message}
        </p>
      </button>
    </article>
  );
}

function FindingDetailPanel({
  actionInventory,
  analyzedFileContent,
  currentFileContent,
  fixFeedback,
  finding,
  ignoredFinding,
  isHiddenByFilters,
  onApplyFix,
}: {
  actionInventory: ActionInventoryItem[];
  analyzedFileContent: string | null;
  currentFileContent: string | null;
  fixFeedback:
    | {
        message: string;
        tone: "danger" | "success" | "warning";
      }
    | null
    | undefined;
  finding: AnalyzerFinding | null;
  ignoredFinding: IgnoredFinding | null;
  isHiddenByFilters: boolean;
  onApplyFix: (finding: AnalyzerFinding) => void;
}) {
  if (!finding) {
    return (
      <section className="rounded-xl border border-dashed border-border/80 bg-background/60 p-4">
        <p className="text-sm font-medium text-foreground">
          Finding detail panel
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Select a finding to review why it matters, copy remediation text, or
          inspect a suggested patch here.
        </p>
      </section>
    );
  }

  const ruleDefinition = getRuleDefinition(finding.ruleId);
  const whyItMatters = ruleDefinition?.description ?? finding.message;
  const affectedActions = getAffectedActionLabels(actionInventory, finding);
  const patchPreview = finding.fix
    ? buildSuggestedFixPreview(
        analyzedFileContent ?? currentFileContent ?? "",
        finding.fix,
      )
    : null;
  const staleFix =
    finding.fix &&
    analyzedFileContent !== null &&
    currentFileContent !== null &&
    analyzedFileContent !== currentFileContent;
  const canApplyFix =
    finding.fix &&
    canApplySuggestedFix(finding.fix) &&
    !staleFix &&
    analyzedFileContent !== null &&
    currentFileContent !== null;

  return (
    <section className="rounded-xl border border-border/80 bg-background/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">Finding detail</Badge>
        <Badge tone={getSeverityTone(finding.severity)}>
          {finding.severity}
        </Badge>
        <Badge tone="subtle">{finding.ruleId}</Badge>
        <Badge tone="subtle">{finding.confidence} confidence</Badge>
        <Badge tone="subtle">{formatCategoryLabel(finding.category)}</Badge>
        {ignoredFinding ? <Badge tone="warning">Ignored</Badge> : null}
        {isHiddenByFilters ? (
          <Badge tone="warning">Hidden by filters</Badge>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">
        {finding.title}
      </h3>
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton
          label="Copy finding as Markdown"
          value={formatFindingAsMarkdown(
            finding,
            whyItMatters,
            affectedActions,
          )}
        />
        <CopyButton label="Copy remediation" value={finding.remediation} />
        <CopyButton
          label="Copy ignore comment"
          value={formatIgnoreComment(finding)}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <DetailLine
          label="Location"
          value={formatFindingLocationLabel(finding)}
        />
        <DetailLine
          label="Category"
          value={formatCategoryLabel(finding.category)}
        />
        <DetailLine
          label="Affected jobs"
          value={formatStringList(finding.relatedJobs)}
        />
        <DetailLine
          label="Affected steps"
          value={formatStringList(finding.relatedSteps)}
        />
        <DetailLine
          label="Affected actions"
          value={formatStringList(affectedActions)}
        />
        <DetailLine label="Confidence" value={finding.confidence} />
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {finding.message}
      </p>
      {ignoredFinding ? (
        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ignore comment
          </p>
          <p className="mt-2 text-sm text-foreground">
            {ignoredFinding.reason}
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border/70 bg-background/80 p-3 text-xs leading-6 text-foreground">
            {ignoredFinding.comment}
          </pre>
        </div>
      ) : null}
      <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Why this matters
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">{whyItMatters}</p>
      </div>
      {finding.evidence ? (
        <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Evidence snippet
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border/80 bg-background/80 p-3 text-xs leading-6 text-foreground">
            {finding.evidence}
          </pre>
        </div>
      ) : null}
      <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Remediation
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">
          {finding.remediation}
        </p>
      </div>

      {finding.fix ? (
        <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Suggested fix
            </p>
            <Badge tone="subtle">{finding.fix.label}</Badge>
            <Badge
              tone={
                finding.fix.safety === "safe"
                  ? "success"
                  : finding.fix.safety === "review"
                    ? "warning"
                    : "info"
              }
            >
              {finding.fix.safety}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {finding.fix.description}
          </p>
          {staleFix && canApplySuggestedFix(finding.fix) ? (
            <Alert
              className="mt-4"
              title="Re-run analysis first"
              tone="warning"
            >
              The file changed after this analysis run, so Authos will not apply
              the patch until the finding is refreshed.
            </Alert>
          ) : null}
          {patchPreview ? (
            <pre className="mt-4 overflow-x-auto rounded-lg border border-border/80 bg-background/80 p-3 text-xs leading-6 text-foreground">
              {patchPreview.content}
            </pre>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {patchPreview ? (
              <CopyButton
                label="Copy suggested patch"
                value={patchPreview.content}
              />
            ) : null}
            {canApplyFix ? (
              <Button onClick={() => onApplyFix(finding)} size="sm">
                Apply fix
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {fixFeedback ? (
        <Alert className="mt-4" title="Fix status" tone={fixFeedback.tone}>
          {fixFeedback.message}
        </Alert>
      ) : null}

      <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Ignore syntax
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">
          <code># authos-ignore {finding.ruleId}: reason here</code>
        </p>
      </div>

      {finding.docsUrl ? (
        <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Docs links
          </p>
          <a
            className="mt-2 inline-flex text-sm font-medium text-info underline-offset-4 hover:underline"
            href={finding.docsUrl}
            rel="noreferrer"
            target="_blank"
          >
            GitHub Actions documentation
          </a>
        </div>
      ) : null}
    </section>
  );
}

function IgnoredFindingsSection({
  activeFindingId,
  ignoredFindings,
  onFindingSelect,
}: {
  activeFindingId: string | null;
  ignoredFindings: IgnoredFinding[];
  onFindingSelect: (finding: AnalyzerFinding) => void;
}) {
  if (ignoredFindings.length === 0) {
    return null;
  }

  return (
    <details
      className="rounded-xl border border-border/80 bg-background/70 p-4"
      data-testid="results-ignored-findings"
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
        Ignored findings ({ignoredFindings.length})
      </summary>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        These findings were suppressed by an inline Authos ignore comment and do
        not affect the current score.
      </p>
      <div className="mt-4 space-y-2">
        {ignoredFindings.map((ignoredFinding) => (
          <article
            className={`rounded-xl border bg-background/70 transition-colors ${
              ignoredFinding.finding.id === activeFindingId
                ? "border-warning ring-2 ring-warning/20"
                : "border-border/80 hover:border-warning/40"
            }`}
            key={`${ignoredFinding.finding.id}:${ignoredFinding.line}`}
          >
            <button
              aria-pressed={ignoredFinding.finding.id === activeFindingId}
              className="w-full px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => onFindingSelect(ignoredFinding.finding)}
              type="button"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning">Ignored</Badge>
                <Badge tone={getSeverityTone(ignoredFinding.finding.severity)}>
                  {ignoredFinding.finding.severity}
                </Badge>
                <Badge tone="subtle">{ignoredFinding.finding.ruleId}</Badge>
                <Badge tone="info">
                  {formatFindingLocationLabel(ignoredFinding.finding)}
                </Badge>
              </div>
              <h4 className="mt-3 text-sm font-semibold text-foreground">
                {ignoredFinding.finding.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {ignoredFinding.reason}
              </p>
            </button>
          </article>
        ))}
      </div>
    </details>
  );
}

function SummaryPanel({
  badges,
  children,
  title,
}: {
  badges: ReactNode[];
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-background/70 p-4">
      <div className="flex flex-wrap items-center gap-2">{badges}</div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/70 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[20rem] text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActionInventoryPanel({
  actionInventory,
}: {
  actionInventory: ActionInventoryItem[];
}) {
  const [partyFilter, setPartyFilter] =
    useState<ActionInventoryPartyFilter>("all");
  const [showOnlyPrivileged, setShowOnlyPrivileged] = useState(false);
  const [showOnlyUnpinned, setShowOnlyUnpinned] = useState(false);
  const filteredInventory = useMemo(() => {
    return actionInventory.filter((item) => {
      if (partyFilter !== "all" && item.origin !== partyFilter) {
        return false;
      }

      if (showOnlyPrivileged && !item.isPrivileged) {
        return false;
      }

      if (showOnlyUnpinned && item.pinned) {
        return false;
      }

      return true;
    });
  }, [actionInventory, partyFilter, showOnlyPrivileged, showOnlyUnpinned]);
  const privilegedCount = actionInventory.filter(
    (item) => item.isPrivileged,
  ).length;
  const unpinnedCount = actionInventory.filter((item) => !item.pinned).length;

  return (
    <section
      className="rounded-xl border border-border/80 bg-background/70 p-4"
      data-testid="results-action-inventory"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">
          {actionInventory.length}{" "}
          {actionInventory.length === 1 ? "reference" : "references"}
        </Badge>
        <Badge tone={unpinnedCount > 0 ? "warning" : "success"}>
          {unpinnedCount} unpinned
        </Badge>
        <Badge tone={privilegedCount > 0 ? "severity-high" : "subtle"}>
          {privilegedCount} privileged
        </Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">
        Action inventory
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Review every `uses:` reference with its pinning status, privilege
        context, and file location in one accessible table.
      </p>

      {actionInventory.length > 0 ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["all", "first-party", "third-party"] as const).map((filter) => (
              <Button
                key={filter}
                onClick={() => {
                  setPartyFilter(filter);
                }}
                size="sm"
                variant={partyFilter === filter ? "primary" : "secondary"}
              >
                {filter === "all" ? "All" : formatActionKindLabel(filter)}
              </Button>
            ))}
            <Button
              onClick={() => {
                setShowOnlyUnpinned((current) => !current);
              }}
              size="sm"
              variant={showOnlyUnpinned ? "primary" : "secondary"}
            >
              Unpinned
            </Button>
            <Button
              onClick={() => {
                setShowOnlyPrivileged((current) => !current);
              }}
              size="sm"
              variant={showOnlyPrivileged ? "primary" : "secondary"}
            >
              Privileged
            </Button>
          </div>

          {filteredInventory.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                data-testid="action-inventory-empty-filter"
                description="No action references match the current inventory filters."
                title="Nothing in this filter"
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <caption className="sr-only">
                  Action inventory for the current analysis run
                </caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-3 py-2 font-medium" scope="col">
                      Action
                    </th>
                    <th className="px-3 py-2 font-medium" scope="col">
                      Kind
                    </th>
                    <th className="px-3 py-2 font-medium" scope="col">
                      Ref
                    </th>
                    <th className="px-3 py-2 font-medium" scope="col">
                      Pinning
                    </th>
                    <th className="px-3 py-2 font-medium" scope="col">
                      File and job
                    </th>
                    <th className="px-3 py-2 font-medium" scope="col">
                      Permissions context
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
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
                        <Badge tone={item.pinned ? "success" : "warning"}>
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
                          {item.stepLabel
                            ? ` / ${item.stepLabel}`
                            : " / job uses"}
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
    </section>
  );
}

function formatFindingAsMarkdown(
  finding: AnalyzerFinding,
  whyItMatters: string,
  affectedActions: string[],
) {
  const lines = [
    `## ${finding.title}`,
    "",
    `- Rule ID: ${finding.ruleId}`,
    `- Severity: ${finding.severity}`,
    `- Confidence: ${finding.confidence}`,
    `- Category: ${formatCategoryLabel(finding.category)}`,
    `- Location: ${formatFindingLocationLabel(finding)}`,
    `- Jobs: ${formatStringList(finding.relatedJobs)}`,
    `- Steps: ${formatStringList(finding.relatedSteps)}`,
    `- Actions: ${formatStringList(affectedActions)}`,
    "",
    "### Summary",
    "",
    finding.message,
    "",
    "### Why This Matters",
    "",
    whyItMatters,
    "",
    "### Remediation",
    "",
    finding.remediation,
  ];

  if (finding.evidence) {
    lines.push("", "### Evidence", "", "```text", finding.evidence, "```");
  }

  if (finding.docsUrl) {
    lines.push("", `Docs: ${finding.docsUrl}`);
  }

  return lines.join("\n");
}

function formatIgnoreComment(finding: AnalyzerFinding) {
  return `# authos-ignore ${finding.ruleId}: explain why "${finding.title}" is acceptable here`;
}

function getAffectedActionLabels(
  actionInventory: ActionInventoryItem[],
  finding: AnalyzerFinding,
) {
  const matchingActions = actionInventory.filter((item) => {
    if (
      normalizeFilePath(item.filePath) !== normalizeFilePath(finding.filePath)
    ) {
      return false;
    }

    const matchesJob =
      finding.relatedJobs.length === 0 ||
      finding.relatedJobs.includes(item.jobId);
    const matchesStep =
      finding.relatedSteps.length === 0 ||
      (item.stepLabel !== null &&
        finding.relatedSteps.includes(item.stepLabel));

    return matchesJob && matchesStep;
  });

  return Array.from(new Set(matchingActions.map((item) => item.uses)));
}

function formatStringList(values: readonly string[]) {
  return values.length > 0 ? values.join(", ") : "None";
}

function formatLastAnalyzedLabel(timestamp: number | null) {
  if (typeof timestamp !== "number" || Number.isNaN(timestamp)) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function hasActiveFilters(filters: ResultsFindingFilters) {
  return (
    filters.searchQuery.trim().length > 0 ||
    filters.selectedCategory !== "all" ||
    filters.selectedFilePath !== "all" ||
    filters.selectedJobId !== "all" ||
    filters.selectedSeverities.length > 0 ||
    filters.showSecurityOnly ||
    filters.showWarningsOnly ||
    filters.sortBy !== "severity"
  );
}

function formatActionKindLabel(
  value: ActionInventoryItem["kind"] | ActionInventoryItem["origin"],
) {
  return value
    .split("-")
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
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

function categorySort(left: FindingCategory, right: FindingCategory) {
  const order = [
    "security",
    "permissions",
    "runner",
    "supply-chain",
    "expressions",
    "matrix",
    "reliability",
    "syntax",
    "triggers",
    "performance",
    "maintainability",
    "privacy",
  ];

  return (
    (order.indexOf(left) === -1
      ? Number.POSITIVE_INFINITY
      : order.indexOf(left)) -
      (order.indexOf(right) === -1
        ? Number.POSITIVE_INFINITY
        : order.indexOf(right)) || left.localeCompare(right)
  );
}

function readInitialResultsShareState(): ResultsShareState {
  if (typeof window === "undefined") {
    return {
      groupBy: "severity",
      searchQuery: "",
      selectedCategory: "all",
      selectedFilePath: "all",
      selectedJobId: "all",
      selectedSeverities: [],
      showSecurityOnly: false,
      showWarningsOnly: false,
      sortBy: "severity",
      view: "all",
    };
  }

  return (
    parseAnalyzerShareState(window.location.search).results ?? {
      groupBy: "severity",
      searchQuery: "",
      selectedCategory: "all",
      selectedFilePath: "all",
      selectedJobId: "all",
      selectedSeverities: [],
      showSecurityOnly: false,
      showWarningsOnly: false,
      sortBy: "severity",
      view: "all",
    }
  );
}

function normalizeFilePath(filePath: string) {
  return filePath.replace(/\\/gu, "/").toLowerCase();
}
