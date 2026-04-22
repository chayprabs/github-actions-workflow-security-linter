"use client";

import { useState } from "react";

import { Container } from "@/components/ui/container";
import { AnalyzerHero } from "@/features/actions-analyzer/components/analyzer-hero";
import { AnalyzerWorkspace } from "@/features/actions-analyzer/components/analyzer-workspace";
import { SeoContent } from "@/features/actions-analyzer/components/seo-content";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import { normalizeParsedWorkflowFiles } from "@/features/actions-analyzer/lib/normalize-workflow";
import { parseWorkflowYamlFiles } from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import {
  calculateScore,
  sortFindings,
} from "@/features/actions-analyzer/lib/scoring";
import { useWorkflowInputs } from "@/features/actions-analyzer/lib/use-workflow-inputs";
import { getWorkflowFileSourceLabel } from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  AnalyzerFinding,
  NormalizedWorkflow,
} from "@/features/actions-analyzer/types";

interface AnalyzerRunResult {
  findings: AnalyzerFinding[];
  normalizedWorkflows: NormalizedWorkflow[];
  parsedFileCount: number;
  score: number;
}

export function AnalyzerPage() {
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzerRunResult | null>(null);
  const workflowInputs = useWorkflowInputs({
    confirmReplace: (message) => window.confirm(message),
  });
  const activeFile = workflowInputs.activeFile;
  const selectedSampleLabel =
    activeFile?.sourceKind === "sample"
      ? (workflowInputs.selectedSample?.label ?? "Sample")
      : getWorkflowFileSourceLabel(activeFile?.sourceKind ?? "paste");

  function clearAnalysisOutput() {
    setAnalysisMessage(null);
    setAnalysisResult(null);
  }

  function handleLoadRiskySample() {
    if (workflowInputs.loadSample("risky-pull-request-target")) {
      clearAnalysisOutput();
    }
  }

  function handleAnalyze() {
    const parsedFiles = parseWorkflowYamlFiles(workflowInputs.files);
    const normalizedWorkflows = normalizeParsedWorkflowFiles(parsedFiles);
    const findings = sortFindings(
      parsedFiles.flatMap((parsedFile) => parsedFile.parseFindings),
    );
    const score = calculateScore(findings);
    const parsedFileCount = parsedFiles.length;
    const issueCount = findings.length;

    setAnalysisResult({
      findings,
      normalizedWorkflows,
      parsedFileCount,
      score,
    });
    setAnalysisMessage(
      issueCount === 0
        ? `Parsed ${parsedFileCount} workflow ${
            parsedFileCount === 1 ? "file" : "files"
          } locally. No YAML parse issues detected yet.`
        : `Parsed ${parsedFileCount} workflow ${
            parsedFileCount === 1 ? "file" : "files"
          } locally and found ${issueCount} YAML ${
            issueCount === 1 ? "issue" : "issues"
          }.`,
    );
  }

  function handleInputChange(value: string) {
    if (!activeFile) {
      return;
    }

    workflowInputs.updateFileContent(activeFile.id, value);
    clearAnalysisOutput();
  }

  function handleSampleLoad(sampleId: WorkflowSampleId) {
    if (workflowInputs.loadSample(sampleId)) {
      clearAnalysisOutput();
    }
  }

  function handleClear() {
    workflowInputs.clearAll();
    clearAnalysisOutput();
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
        analysisMessage={analysisMessage}
        defaultVirtualPath={workflowInputs.defaultVirtualPath}
        errors={workflowInputs.errors}
        fileCount={workflowInputs.fileCount}
        files={workflowInputs.files}
        folderUploadSupported={workflowInputs.folderUploadSupported}
        hasInput={workflowInputs.hasAnyContent}
        includeAllYamlFiles={workflowInputs.includeAllYamlFiles}
        inputText={activeFile?.content ?? ""}
        maxFileSizeLabel={workflowInputs.maxFileSizeLabel}
        onAddPasteFile={() => {
          workflowInputs.addPasteFile();
          clearAnalysisOutput();
        }}
        onAnalyze={handleAnalyze}
        onClear={handleClear}
        onClearActiveInput={() => {
          workflowInputs.clearActiveInput();
          clearAnalysisOutput();
        }}
        onFileUpload={async (files) => {
          await workflowInputs.addUploadedFiles(files, "file");
          clearAnalysisOutput();
        }}
        onFileUploadFromFolder={async (files) => {
          await workflowInputs.addUploadedFiles(files, "folder");
          clearAnalysisOutput();
        }}
        onInputChange={handleInputChange}
        onLoadRiskySample={handleLoadRiskySample}
        onRemoveFile={(fileId) => {
          workflowInputs.removeFile(fileId);
          clearAnalysisOutput();
        }}
        onRenameFile={(path) => {
          if (!activeFile) {
            return;
          }

          workflowInputs.renameFile(activeFile.id, path);
          clearAnalysisOutput();
        }}
        onLoadSelectedSample={() => {
          if (workflowInputs.selectedSampleId !== "manual") {
            handleSampleLoad(workflowInputs.selectedSampleId);
          }
        }}
        onSampleChange={workflowInputs.selectSample}
        onSelectFile={workflowInputs.setActiveFileId}
        onToggleIncludeAllYamlFiles={workflowInputs.setIncludeAllYamlFiles}
        parseFindings={analysisResult?.findings ?? []}
        normalizedWorkflows={analysisResult?.normalizedWorkflows ?? []}
        parseScore={analysisResult?.score ?? null}
        parsedFileCount={analysisResult?.parsedFileCount ?? 0}
        selectedSampleId={workflowInputs.selectedSampleId}
        selectedSampleLabel={selectedSampleLabel}
        totalSizeLabel={workflowInputs.totalSizeLabel}
      />
      <SeoContent />
    </Container>
  );
}
