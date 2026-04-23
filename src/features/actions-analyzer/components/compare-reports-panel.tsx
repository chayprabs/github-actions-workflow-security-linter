"use client";

import { useMemo, useState } from "react";
import { Copy, GitCompareArrows, History, Play } from "lucide-react";

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
import { InputPanel } from "@/features/actions-analyzer/components/input-panel";
import { copyTextToClipboard } from "@/features/actions-analyzer/lib/browser-actions";
import {
  buildCompareMarkdownSummary,
  compareWorkflowReports,
} from "@/features/actions-analyzer/lib/report-compare";
import { getSeverityTone } from "@/features/actions-analyzer/lib/finding-presentation";
import { usePushActionToast } from "@/features/actions-analyzer/components/action-toast-provider";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import type {
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

interface CompareReportsPanelProps {
  currentReport: WorkflowAnalysisReport | null;
  currentSampleLabel: string;
  lastAnalyzedCurrentReport: WorkflowAnalysisReport | null;
  onAnalyzePrevious: () => void;
  previousActiveFile: WorkflowInputFile | null;
  previousActiveFileId: string | null;
  previousAnalysisError: string | null;
  previousCanAnalyze: boolean;
  previousDefaultVirtualPath: string;
  previousErrors: string[];
  previousFileCount: number;
  previousFiles: WorkflowInputFile[];
  previousFolderUploadSupported: boolean;
  previousIncludeAllYamlFiles: boolean;
  previousInputText: string;
  previousIsAnalyzing: boolean;
  previousMaxFileSizeBytes: number;
  previousMaxFileSizeLabel: string;
  previousReport: WorkflowAnalysisReport | null;
  previousSelectedSampleId: WorkflowSampleId | "manual";
  previousSelectedSampleLabel: string;
  previousTotalSizeLabel: string;
  onPreviousAddPasteFile: () => void;
  onPreviousClear: () => void;
  onPreviousClearActiveInput: () => void;
  onPreviousFileUpload: (files: FileList | null) => void;
  onPreviousFileUploadFromFolder: (files: FileList | null) => void;
  onPreviousGitHubImport: (files: WorkflowInputFile[]) => void | Promise<void>;
  onPreviousInputChange: (value: string) => void;
  onPreviousLoadSelectedSample: () => void;
  onPreviousRemoveFile: (fileId: string) => void;
  onPreviousRenameFile: (path: string) => void;
  onPreviousSampleChange: (sampleId: WorkflowSampleId | "manual") => void;
  onPreviousSelectFile: (fileId: string) => void;
  onPreviousSoftWrapChange: (checked: boolean) => void;
  onPreviousToggleIncludeAllYamlFiles: (checked: boolean) => void;
  previousSoftWrapEnabled: boolean;
}

export function CompareReportsPanel({
  currentReport,
  currentSampleLabel,
  lastAnalyzedCurrentReport,
  onAnalyzePrevious,
  previousActiveFile,
  previousActiveFileId,
  previousAnalysisError,
  previousCanAnalyze,
  previousDefaultVirtualPath,
  previousErrors,
  previousFileCount,
  previousFiles,
  previousFolderUploadSupported,
  previousIncludeAllYamlFiles,
  previousInputText,
  previousIsAnalyzing,
  previousMaxFileSizeBytes,
  previousMaxFileSizeLabel,
  previousReport,
  previousSelectedSampleId,
  previousSelectedSampleLabel,
  previousTotalSizeLabel,
  onPreviousAddPasteFile,
  onPreviousClear,
  onPreviousClearActiveInput,
  onPreviousFileUpload,
  onPreviousFileUploadFromFolder,
  onPreviousGitHubImport,
  onPreviousInputChange,
  onPreviousLoadSelectedSample,
  onPreviousRemoveFile,
  onPreviousRenameFile,
  onPreviousSampleChange,
  onPreviousSelectFile,
  onPreviousSoftWrapChange,
  onPreviousToggleIncludeAllYamlFiles,
  previousSoftWrapEnabled,
}: CompareReportsPanelProps) {
  const [baselineSource, setBaselineSource] = useState<
    "input" | "last-current"
  >("input");
  const pushToast = usePushActionToast();
  const effectivePreviousReport =
    baselineSource === "last-current"
      ? lastAnalyzedCurrentReport
      : previousReport;
  const effectivePreviousLabel =
    baselineSource === "last-current"
      ? "Last analyzed current report"
      : previousSelectedSampleLabel;
  const comparison = useMemo(() => {
    if (!currentReport || !effectivePreviousReport) {
      return null;
    }

    return compareWorkflowReports(currentReport, effectivePreviousReport);
  }, [currentReport, effectivePreviousReport]);

  async function handleCopyCompareSummary() {
    if (!comparison) {
      return;
    }

    try {
      await copyTextToClipboard(
        buildCompareMarkdownSummary({
          comparison,
          currentLabel: currentSampleLabel,
          previousLabel: effectivePreviousLabel,
        }),
      );
      pushToast({
        message: "Compare summary copied for PR review.",
        tone: "success",
      });
    } catch {
      pushToast({
        message: "Authos could not copy the compare summary.",
        tone: "danger",
      });
    }
  }

  return (
    <section className="space-y-5" data-testid="compare-reports-panel">
      <Card>
        <CardHeader>
          <CardTitle>Compare reports</CardTitle>
          <CardDescription>
            Compare the current analysis against a second workflow set or the
            last analyzed current report to spot new, resolved, and unchanged
            review findings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setBaselineSource("input");
            }}
            size="sm"
            variant={baselineSource === "input" ? "primary" : "secondary"}
          >
            <GitCompareArrows className="h-4 w-4" />
            Use previous input analysis
          </Button>
          <Button
            disabled={!lastAnalyzedCurrentReport}
            onClick={() => {
              setBaselineSource("last-current");
            }}
            size="sm"
            variant={
              baselineSource === "last-current" ? "primary" : "secondary"
            }
          >
            <History className="h-4 w-4" />
            Use last analyzed report
          </Button>
          <Button
            disabled={!previousCanAnalyze}
            onClick={() => {
              setBaselineSource("input");
              onAnalyzePrevious();
            }}
            size="sm"
            variant="secondary"
          >
            <Play className="h-4 w-4" />
            {previousIsAnalyzing ? "Analyzing..." : "Analyze previous"}
          </Button>
          <Button
            disabled={!comparison}
            onClick={handleCopyCompareSummary}
            size="sm"
            variant="secondary"
          >
            <Copy className="h-4 w-4" />
            Copy compare summary
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="min-w-0 space-y-4">
          {previousAnalysisError ? (
            <Alert title="Previous analysis error" tone="danger">
              {previousAnalysisError}
            </Alert>
          ) : null}

          <InputPanel
            activeFile={previousActiveFile}
            activeFileId={previousActiveFileId}
            activeFindingId={null}
            canAnalyze={previousCanAnalyze}
            defaultVirtualPath={previousDefaultVirtualPath}
            editorJumpTarget={null}
            errors={previousErrors}
            fileCount={previousFileCount}
            files={previousFiles}
            folderUploadSupported={previousFolderUploadSupported}
            includeAllYamlFiles={previousIncludeAllYamlFiles}
            inputText={previousInputText}
            isAnalyzing={previousIsAnalyzing}
            maxFileSizeBytes={previousMaxFileSizeBytes}
            maxFileSizeLabel={previousMaxFileSizeLabel}
            onAddPasteFile={onPreviousAddPasteFile}
            onAnalyze={onAnalyzePrevious}
            onClear={onPreviousClear}
            onClearActiveInput={onPreviousClearActiveInput}
            onFileUpload={onPreviousFileUpload}
            onFileUploadFromFolder={onPreviousFileUploadFromFolder}
            onGitHubImport={onPreviousGitHubImport}
            onInputChange={onPreviousInputChange}
            onLoadSelectedSample={onPreviousLoadSelectedSample}
            onRemoveFile={onPreviousRemoveFile}
            onRenameFile={onPreviousRenameFile}
            onSampleChange={onPreviousSampleChange}
            onSelectFile={onPreviousSelectFile}
            onSoftWrapChange={onPreviousSoftWrapChange}
            onToggleIncludeAllYamlFiles={onPreviousToggleIncludeAllYamlFiles}
            report={baselineSource === "input" ? previousReport : null}
            selectedSampleId={previousSelectedSampleId}
            softWrapEnabled={previousSoftWrapEnabled}
            totalSizeLabel={previousTotalSizeLabel}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compare summary</CardTitle>
              <CardDescription>
                Current: {currentSampleLabel} / Previous:{" "}
                {effectivePreviousLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentReport ? (
                <EmptyState
                  description="Run analysis on the current workspace first so Authos has a 'Current' report to compare."
                  title="Analyze the current workspace first"
                />
              ) : !effectivePreviousReport ? (
                <EmptyState
                  description="Analyze a previous input set or switch to the last analyzed report to start the before/after comparison."
                  title="No previous report selected"
                />
              ) : comparison ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CompareMetric
                      label="Score change"
                      value={formatScoreDelta(comparison.summary.scoreDelta)}
                    />
                    <CompareMetric
                      label="New high/critical"
                      value={String(comparison.summary.newHighOrCriticalCount)}
                    />
                    <CompareMetric
                      label="New findings"
                      value={String(comparison.summary.newFindingCount)}
                    />
                    <CompareMetric
                      label="Resolved findings"
                      value={String(comparison.summary.resolvedFindingCount)}
                    />
                  </div>

                  <FindingDeltaSection
                    findings={comparison.newFindings}
                    title="New findings"
                  />
                  <FindingDeltaSection
                    findings={comparison.resolvedFindings}
                    title="Resolved findings"
                  />
                  <FindingDeltaSection
                    findings={comparison.unchangedFindings.map(
                      (finding) => finding.current,
                    )}
                    title="Unchanged findings"
                  />
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function CompareMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FindingDeltaSection({
  findings,
  title,
}: {
  findings: WorkflowAnalysisReport["findings"];
  title: string;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-background/80 p-3">
      <h3 className="text-sm font-semibold text-foreground">
        {title} ({findings.length})
      </h3>
      {findings.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None</p>
      ) : (
        <div className="mt-3 space-y-2">
          {findings.slice(0, 8).map((finding) => (
            <article
              className="rounded-lg border border-border/70 bg-card/80 p-3"
              key={finding.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={getSeverityTone(finding.severity)}>
                  {finding.severity}
                </Badge>
                <Badge tone="subtle">{finding.ruleId}</Badge>
                <Badge tone="info">{formatFindingLocation(finding)}</Badge>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {finding.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {finding.message}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatFindingLocation(
  finding: WorkflowAnalysisReport["findings"][number],
) {
  return finding.location
    ? `${finding.filePath}:${finding.location.line}`
    : finding.filePath;
}

function formatScoreDelta(scoreDelta: number) {
  return scoreDelta > 0 ? `+${scoreDelta}` : String(scoreDelta);
}
