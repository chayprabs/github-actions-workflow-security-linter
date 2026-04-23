"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { Container } from "@/components/ui/container";
import { AnalyzerHero } from "@/features/actions-analyzer/components/analyzer-hero";
import { AnalyzerWorkspace } from "@/features/actions-analyzer/components/analyzer-workspace";
import type { WorkflowEditorJumpTarget } from "@/features/actions-analyzer/components/workflow-code-editor";
import { SeoContent } from "@/features/actions-analyzer/components/seo-content";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import { useWorkflowAnalysis } from "@/features/actions-analyzer/lib/use-workflow-analysis";
import { useWorkflowInputs } from "@/features/actions-analyzer/lib/use-workflow-inputs";
import { parseAnalyzerShareState } from "@/features/actions-analyzer/lib/report-share";
import {
  getWorkflowFileSourceLabel,
  normalizeWorkflowPath,
} from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  AnalyzerFinding,
  WorkflowAnalysisReport,
} from "@/features/actions-analyzer/types";

const smallInputThresholdBytes = 64 * 1024;
const smallInputThresholdFiles = 5;

export function AnalyzerPage() {
  const workflowInputs = useWorkflowInputs({
    confirmReplace: (message) => window.confirm(message),
  });
  const compareWorkflowInputs = useWorkflowInputs({
    confirmReplace: (message) => window.confirm(message),
  });
  const activeFile = workflowInputs.activeFile;
  const compareActiveFile = compareWorkflowInputs.activeFile;
  const selectedSampleLabel =
    activeFile?.sourceKind === "sample"
      ? (workflowInputs.selectedSample?.label ?? "Sample")
      : getWorkflowFileSourceLabel(activeFile?.sourceKind ?? "paste");
  const compareSelectedSampleLabel =
    compareActiveFile?.sourceKind === "sample"
      ? (compareWorkflowInputs.selectedSample?.label ?? "Sample")
      : getWorkflowFileSourceLabel(compareActiveFile?.sourceKind ?? "paste");
  const analysisFiles = useMemo(() => {
    return workflowInputs.files.filter((file) => {
      return file.content.trim().length > 0 || file.sourceKind !== "paste";
    });
  }, [workflowInputs.files]);
  const compareAnalysisFiles = useMemo(() => {
    return compareWorkflowInputs.files.filter((file) => {
      return file.content.trim().length > 0 || file.sourceKind !== "paste";
    });
  }, [compareWorkflowInputs.files]);
  const autoRunRecommended = useMemo(() => {
    if (analysisFiles.length === 0) {
      return false;
    }

    const allSamples = analysisFiles.every(
      (file) => file.sourceKind === "sample",
    );
    const smallInput =
      analysisFiles.length <= smallInputThresholdFiles &&
      workflowInputs.totalSizeBytes <= smallInputThresholdBytes;

    return allSamples || smallInput;
  }, [analysisFiles, workflowInputs.totalSizeBytes]);
  const [manualAutoRunEnabled, setManualAutoRunEnabled] = useState<
    boolean | null
  >(null);
  const analysis = useWorkflowAnalysis({
    files: analysisFiles,
    settings: workflowInputs.settings,
  });
  const compareAnalysis = useWorkflowAnalysis({
    files: compareAnalysisFiles,
    settings: compareWorkflowInputs.settings,
  });
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [editorJumpTarget, setEditorJumpTarget] =
    useState<WorkflowEditorJumpTarget | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"analyze" | "compare">(
    () => {
      if (typeof window === "undefined") {
        return "analyze";
      }

      return (
        parseAnalyzerShareState(window.location.search).workspaceMode ??
        "analyze"
      );
    },
  );
  const [lastAnalyzedCurrentReport, setLastAnalyzedCurrentReport] =
    useState<WorkflowAnalysisReport | null>(null);
  const latestCurrentReportRef = useRef<WorkflowAnalysisReport | null>(null);
  const hasInitializedShareStateRef = useRef(false);
  const autoRunEnabled = manualAutoRunEnabled ?? autoRunRecommended;
  const visibleReport =
    analysisFiles.length === 0 && (analysis.report?.files.length ?? 0) > 0
      ? null
      : analysis.report;
  const visibleAnalysisError =
    analysisFiles.length === 0 && visibleReport === null
      ? null
      : analysis.error;

  const requestAutoRun = useEffectEvent(() => {
    void analysis.analyzeNow({
      includeEmptyInputFinding: false,
    });
  });

  useEffect(() => {
    if (hasInitializedShareStateRef.current || typeof window === "undefined") {
      return;
    }

    hasInitializedShareStateRef.current = true;
    const shareState = parseAnalyzerShareState(window.location.search);

    if (shareState.settings) {
      workflowInputs.setSettings((current) => ({
        ...current,
        ...shareState.settings,
      }));
      compareWorkflowInputs.setSettings((current) => ({
        ...current,
        ...shareState.settings,
      }));
    }

    if (shareState.sampleId) {
      workflowInputs.loadSample(shareState.sampleId);
    }

    if (shareState.previousSampleId) {
      compareWorkflowInputs.loadSample(shareState.previousSampleId);
    }
  }, [compareWorkflowInputs, workflowInputs]);

  useEffect(() => {
    if (!autoRunEnabled || analysisFiles.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      requestAutoRun();
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [analysisFiles, autoRunEnabled]);

  useEffect(() => {
    if (!analysis.report) {
      return;
    }

    if (latestCurrentReportRef.current) {
      setLastAnalyzedCurrentReport(latestCurrentReportRef.current);
    }

    latestCurrentReportRef.current = analysis.report;
  }, [analysis.report]);

  function handleLoadRiskySample() {
    workflowInputs.loadSample("risky-pull-request-target");
    clearFindingSelection();
  }

  function clearFindingSelection() {
    setActiveFindingId(null);
    setEditorJumpTarget(null);
  }

  function handleAnalyze() {
    void analysis.analyzeNow({
      includeEmptyInputFinding: analysisFiles.length === 0,
    });
  }

  function handleAnalyzePrevious() {
    void compareAnalysis.analyzeNow({
      includeEmptyInputFinding: compareAnalysisFiles.length === 0,
    });
  }

  function handleSampleLoad(sampleId: WorkflowSampleId) {
    workflowInputs.loadSample(sampleId);
    clearFindingSelection();
  }

  function handleFindingSelect(finding: AnalyzerFinding) {
    const normalizedFindingPath = normalizeWorkflowPath(
      finding.filePath,
    ).toLowerCase();
    const matchedFile = workflowInputs.files.find((file) => {
      return (
        normalizeWorkflowPath(file.path).toLowerCase() === normalizedFindingPath
      );
    });

    if (matchedFile && matchedFile.id !== workflowInputs.activeFileId) {
      workflowInputs.setActiveFileId(matchedFile.id);
    }

    setActiveFindingId(finding.id);
    setEditorJumpTarget(
      finding.location
        ? {
            column: finding.location.column,
            endColumn: finding.location.endColumn,
            endLine: finding.location.endLine,
            filePath: finding.filePath,
            findingId: finding.id,
            line: finding.location.line,
            sequence: Date.now(),
          }
        : null,
    );
  }

  function handleApplyFix(filePath: string, nextContent: string) {
    const normalizedTargetPath = normalizeWorkflowPath(filePath).toLowerCase();
    const matchedFile = workflowInputs.files.find((file) => {
      return (
        normalizeWorkflowPath(file.path).toLowerCase() === normalizedTargetPath
      );
    });

    if (!matchedFile) {
      return false;
    }

    if (matchedFile.id !== workflowInputs.activeFileId) {
      workflowInputs.setActiveFileId(matchedFile.id);
    }

    workflowInputs.updateFileContent(matchedFile.id, nextContent);
    return true;
  }

  return (
    <Container
      className="space-y-12 py-16 sm:space-y-14 sm:py-20"
      data-testid="analyzer-page"
    >
      <AnalyzerHero onLoadRiskySample={handleLoadRiskySample} />
      <AnalyzerWorkspace
        activeFile={activeFile}
        activeFileId={workflowInputs.activeFileId}
        activeFindingId={activeFindingId}
        analysisError={visibleAnalysisError}
        autoRunEnabled={autoRunEnabled}
        canAnalyze={!analysis.isAnalyzing}
        defaultVirtualPath={workflowInputs.defaultVirtualPath}
        editorJumpTarget={editorJumpTarget}
        errors={workflowInputs.errors}
        fileCount={workflowInputs.fileCount}
        files={workflowInputs.files}
        folderUploadSupported={workflowInputs.folderUploadSupported}
        hasRunnableInput={analysisFiles.length > 0}
        includeAllYamlFiles={workflowInputs.includeAllYamlFiles}
        inputText={activeFile?.content ?? ""}
        isAnalyzing={analysis.isAnalyzing}
        lastAnalyzedCurrentReport={lastAnalyzedCurrentReport}
        lastAnalyzedAt={analysis.lastAnalyzedAt}
        maxFileSizeLabel={workflowInputs.maxFileSizeLabel}
        onAddPasteFile={() => {
          clearFindingSelection();
          workflowInputs.addPasteFile();
        }}
        onAnalyze={handleAnalyze}
        onAnalyzePrevious={handleAnalyzePrevious}
        onAutoRunChange={(checked) => {
          setManualAutoRunEnabled(checked);
        }}
        onApplyFix={handleApplyFix}
        onClear={() => {
          clearFindingSelection();
          workflowInputs.clearAll();
        }}
        onClearActiveInput={() => {
          clearFindingSelection();
          workflowInputs.clearActiveInput();
        }}
        onFileUpload={async (files) => {
          clearFindingSelection();
          await workflowInputs.addUploadedFiles(files, "file");
        }}
        onFileUploadFromFolder={async (files) => {
          clearFindingSelection();
          await workflowInputs.addUploadedFiles(files, "folder");
        }}
        onInputChange={(value) => {
          if (!activeFile) {
            return;
          }

          workflowInputs.updateFileContent(activeFile.id, value);
        }}
        onLoadRiskySample={handleLoadRiskySample}
        onLoadSelectedSample={() => {
          if (workflowInputs.selectedSampleId !== "manual") {
            handleSampleLoad(workflowInputs.selectedSampleId);
          }
        }}
        onRemoveFile={(fileId) => {
          clearFindingSelection();
          workflowInputs.removeFile(fileId);
        }}
        onRenameFile={(path) => {
          if (!activeFile) {
            return;
          }

          workflowInputs.renameFile(activeFile.id, path);
        }}
        onSampleChange={workflowInputs.selectSample}
        onSelectFile={(fileId) => {
          clearFindingSelection();
          workflowInputs.setActiveFileId(fileId);
        }}
        onFindingSelect={handleFindingSelect}
        onToggleIncludeAllYamlFiles={workflowInputs.setIncludeAllYamlFiles}
        report={visibleReport}
        selectedSampleId={workflowInputs.selectedSampleId}
        selectedSampleLabel={selectedSampleLabel}
        totalSizeLabel={workflowInputs.totalSizeLabel}
        workspaceMode={workspaceMode}
        onWorkspaceModeChange={setWorkspaceMode}
        previousActiveFile={compareActiveFile}
        previousActiveFileId={compareWorkflowInputs.activeFileId}
        previousAnalysisError={compareAnalysis.error}
        previousCanAnalyze={!compareAnalysis.isAnalyzing}
        previousDefaultVirtualPath={compareWorkflowInputs.defaultVirtualPath}
        previousErrors={compareWorkflowInputs.errors}
        previousFileCount={compareWorkflowInputs.fileCount}
        previousFiles={compareWorkflowInputs.files}
        previousFolderUploadSupported={
          compareWorkflowInputs.folderUploadSupported
        }
        previousIncludeAllYamlFiles={compareWorkflowInputs.includeAllYamlFiles}
        previousInputText={compareActiveFile?.content ?? ""}
        previousIsAnalyzing={compareAnalysis.isAnalyzing}
        previousMaxFileSizeLabel={compareWorkflowInputs.maxFileSizeLabel}
        previousReport={compareAnalysis.report}
        previousSelectedSampleId={compareWorkflowInputs.selectedSampleId}
        previousSelectedSampleLabel={compareSelectedSampleLabel}
        previousTotalSizeLabel={compareWorkflowInputs.totalSizeLabel}
        onPreviousAddPasteFile={compareWorkflowInputs.addPasteFile}
        onPreviousClear={compareWorkflowInputs.clearAll}
        onPreviousClearActiveInput={compareWorkflowInputs.clearActiveInput}
        onPreviousFileUpload={async (files) => {
          await compareWorkflowInputs.addUploadedFiles(files, "file");
        }}
        onPreviousFileUploadFromFolder={async (files) => {
          await compareWorkflowInputs.addUploadedFiles(files, "folder");
        }}
        onPreviousInputChange={(value) => {
          if (!compareActiveFile) {
            return;
          }

          compareWorkflowInputs.updateFileContent(compareActiveFile.id, value);
        }}
        onPreviousLoadSelectedSample={() => {
          if (compareWorkflowInputs.selectedSampleId !== "manual") {
            compareWorkflowInputs.loadSample(
              compareWorkflowInputs.selectedSampleId,
            );
          }
        }}
        onPreviousRemoveFile={compareWorkflowInputs.removeFile}
        onPreviousRenameFile={(path) => {
          if (!compareActiveFile) {
            return;
          }

          compareWorkflowInputs.renameFile(compareActiveFile.id, path);
        }}
        onPreviousSampleChange={compareWorkflowInputs.selectSample}
        onPreviousSelectFile={compareWorkflowInputs.setActiveFileId}
        onPreviousToggleIncludeAllYamlFiles={
          compareWorkflowInputs.setIncludeAllYamlFiles
        }
      />
      <SeoContent />
    </Container>
  );
}
