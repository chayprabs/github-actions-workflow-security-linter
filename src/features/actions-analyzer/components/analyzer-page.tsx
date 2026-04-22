"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { Container } from "@/components/ui/container";
import { AnalyzerHero } from "@/features/actions-analyzer/components/analyzer-hero";
import { AnalyzerWorkspace } from "@/features/actions-analyzer/components/analyzer-workspace";
import { SeoContent } from "@/features/actions-analyzer/components/seo-content";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import { useWorkflowAnalysis } from "@/features/actions-analyzer/lib/use-workflow-analysis";
import { useWorkflowInputs } from "@/features/actions-analyzer/lib/use-workflow-inputs";
import { getWorkflowFileSourceLabel } from "@/features/actions-analyzer/lib/workflow-input-utils";

const smallInputThresholdBytes = 64 * 1024;
const smallInputThresholdFiles = 5;

export function AnalyzerPage() {
  const workflowInputs = useWorkflowInputs({
    confirmReplace: (message) => window.confirm(message),
  });
  const activeFile = workflowInputs.activeFile;
  const selectedSampleLabel =
    activeFile?.sourceKind === "sample"
      ? (workflowInputs.selectedSample?.label ?? "Sample")
      : getWorkflowFileSourceLabel(activeFile?.sourceKind ?? "paste");
  const analysisFiles = useMemo(() => {
    return workflowInputs.files.filter((file) => {
      return file.content.trim().length > 0 || file.sourceKind !== "paste";
    });
  }, [workflowInputs.files]);
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

  function handleLoadRiskySample() {
    workflowInputs.loadSample("risky-pull-request-target");
  }

  function handleAnalyze() {
    void analysis.analyzeNow({
      includeEmptyInputFinding: analysisFiles.length === 0,
    });
  }

  function handleSampleLoad(sampleId: WorkflowSampleId) {
    workflowInputs.loadSample(sampleId);
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
        analysisError={visibleAnalysisError}
        autoRunEnabled={autoRunEnabled}
        canAnalyze={!analysis.isAnalyzing}
        defaultVirtualPath={workflowInputs.defaultVirtualPath}
        errors={workflowInputs.errors}
        fileCount={workflowInputs.fileCount}
        files={workflowInputs.files}
        folderUploadSupported={workflowInputs.folderUploadSupported}
        hasRunnableInput={analysisFiles.length > 0}
        includeAllYamlFiles={workflowInputs.includeAllYamlFiles}
        inputText={activeFile?.content ?? ""}
        isAnalyzing={analysis.isAnalyzing}
        maxFileSizeLabel={workflowInputs.maxFileSizeLabel}
        onAddPasteFile={workflowInputs.addPasteFile}
        onAnalyze={handleAnalyze}
        onAutoRunChange={(checked) => {
          setManualAutoRunEnabled(checked);
        }}
        onClear={workflowInputs.clearAll}
        onClearActiveInput={workflowInputs.clearActiveInput}
        onFileUpload={async (files) => {
          await workflowInputs.addUploadedFiles(files, "file");
        }}
        onFileUploadFromFolder={async (files) => {
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
        onRemoveFile={workflowInputs.removeFile}
        onRenameFile={(path) => {
          if (!activeFile) {
            return;
          }

          workflowInputs.renameFile(activeFile.id, path);
        }}
        onSampleChange={workflowInputs.selectSample}
        onSelectFile={workflowInputs.setActiveFileId}
        onToggleIncludeAllYamlFiles={workflowInputs.setIncludeAllYamlFiles}
        report={visibleReport}
        selectedSampleId={workflowInputs.selectedSampleId}
        selectedSampleLabel={selectedSampleLabel}
        totalSizeLabel={workflowInputs.totalSizeLabel}
      />
      <SeoContent />
    </Container>
  );
}
