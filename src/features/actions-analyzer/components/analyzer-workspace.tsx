"use client";

import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompareReportsPanel } from "@/features/actions-analyzer/components/compare-reports-panel";
import { InputPanel } from "@/features/actions-analyzer/components/input-panel";
import { ResultsPanel } from "@/features/actions-analyzer/components/results-panel";
import type { WorkflowEditorJumpTarget } from "@/features/actions-analyzer/components/workflow-code-editor";
import { WorkspaceToolbar } from "@/features/actions-analyzer/components/workspace-toolbar";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import type {
  AnalyzerFinding,
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

interface AnalyzerWorkspaceProps {
  activeFile: WorkflowInputFile | null;
  activeFileId: string | null;
  activeFindingId: string | null;
  analysisError: string | null;
  autoRunEnabled: boolean;
  canAnalyze: boolean;
  defaultVirtualPath: string;
  editorJumpTarget: WorkflowEditorJumpTarget | null;
  errors: string[];
  fileCount: number;
  files: WorkflowInputFile[];
  folderUploadSupported: boolean;
  focusResultsSearchSignal: number;
  hasRunnableInput: boolean;
  historyCount: number;
  includeAllYamlFiles: boolean;
  inputText: string;
  isAnalyzing: boolean;
  lastAnalyzedAt: number | null;
  lastAnalyzedCurrentReport: WorkflowAnalysisReport | null;
  maxFileSizeBytes: number;
  maxFileSizeLabel: string;
  onAddPasteFile: () => void;
  onAnalyze: () => void;
  onAnalyzePrevious: () => void;
  onApplyFix: (filePath: string, nextContent: string) => boolean;
  onAutoRunChange: (checked: boolean) => void;
  onClear: () => void;
  onClearActiveInput: () => void;
  onFileUpload: (files: FileList | null) => Promise<void>;
  onFileUploadFromFolder: (files: FileList | null) => Promise<void>;
  onFindingSelect: (finding: AnalyzerFinding) => void;
  onGitHubImport: (files: WorkflowInputFile[]) => void | Promise<void>;
  onInputChange: (value: string) => void;
  onLoadRiskySample: () => void;
  onLoadSelectedSample: () => void;
  onOpenHistory: () => void;
  onOpenKeyboardShortcuts: () => void;
  onOpenSettings: () => void;
  onPreviousAddPasteFile: () => void;
  onPreviousClear: () => void;
  onPreviousClearActiveInput: () => void;
  onPreviousFileUpload: (files: FileList | null) => Promise<void>;
  onPreviousFileUploadFromFolder: (files: FileList | null) => Promise<void>;
  onPreviousGitHubImport: (files: WorkflowInputFile[]) => void | Promise<void>;
  onPreviousInputChange: (value: string) => void;
  onPreviousLoadSelectedSample: () => void;
  onPreviousRemoveFile: (fileId: string) => void;
  onPreviousRenameFile: (path: string) => void;
  onPreviousSampleChange: (sampleId: WorkflowSampleId | "manual") => void;
  onPreviousSelectFile: (fileId: string) => void;
  onPreviousSoftWrapChange: (checked: boolean) => void;
  onPreviousToggleIncludeAllYamlFiles: (checked: boolean) => void;
  onRemoveFile: (fileId: string) => void;
  onRenameFile: (path: string) => void;
  onSampleChange: (sampleId: WorkflowSampleId | "manual") => void;
  onSelectFile: (fileId: string) => void;
  onSoftWrapChange: (checked: boolean) => void;
  onToggleIncludeAllYamlFiles: (checked: boolean) => void;
  onWorkspaceModeChange: (mode: "analyze" | "compare") => void;
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
  previousSoftWrapEnabled: boolean;
  previousTotalSizeLabel: string;
  report: WorkflowAnalysisReport | null;
  selectedSampleId: WorkflowSampleId | "manual";
  selectedSampleLabel: string;
  softWrapEnabled: boolean;
  totalSizeLabel: string;
  workspaceMode: "analyze" | "compare";
}

export function AnalyzerWorkspace({
  activeFile,
  activeFileId,
  activeFindingId,
  analysisError,
  autoRunEnabled,
  canAnalyze,
  defaultVirtualPath,
  editorJumpTarget,
  errors,
  fileCount,
  files,
  folderUploadSupported,
  focusResultsSearchSignal,
  hasRunnableInput,
  historyCount,
  includeAllYamlFiles,
  inputText,
  isAnalyzing,
  lastAnalyzedAt,
  lastAnalyzedCurrentReport,
  maxFileSizeBytes,
  maxFileSizeLabel,
  onAddPasteFile,
  onAnalyze,
  onAnalyzePrevious,
  onApplyFix,
  onAutoRunChange,
  onClear,
  onClearActiveInput,
  onFileUpload,
  onFileUploadFromFolder,
  onFindingSelect,
  onGitHubImport,
  onInputChange,
  onLoadRiskySample,
  onLoadSelectedSample,
  onOpenHistory,
  onOpenKeyboardShortcuts,
  onOpenSettings,
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
  onRemoveFile,
  onRenameFile,
  onSampleChange,
  onSelectFile,
  onSoftWrapChange,
  onToggleIncludeAllYamlFiles,
  onWorkspaceModeChange,
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
  previousSoftWrapEnabled,
  previousTotalSizeLabel,
  report,
  selectedSampleId,
  selectedSampleLabel,
  softWrapEnabled,
  totalSizeLabel,
  workspaceMode,
}: AnalyzerWorkspaceProps) {
  const [mobileTab, setMobileTab] = useState("input");

  useEffect(() => {
    if (focusResultsSearchSignal === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const searchInput = document.getElementById("results-filter-search");

      if (searchInput instanceof HTMLElement) {
        searchInput.focus();
      }
    }, 30);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [focusResultsSearchSignal]);

  function handleFindingSelect(finding: AnalyzerFinding) {
    setMobileTab("input");
    onFindingSelect(finding);
  }

  return (
    <section
      className="space-y-5 scroll-mt-8 overflow-x-hidden"
      data-testid="analyzer-workspace"
      id="analyzer-workspace"
    >
      <Tabs
        onValueChange={(value) =>
          onWorkspaceModeChange(value as "analyze" | "compare")
        }
        value={workspaceMode}
      >
        <TabsList aria-label="Analyzer workspace modes">
          <TabsTrigger value="analyze">Analyze workspace</TabsTrigger>
          <TabsTrigger value="compare">Compare reports</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze">
          <WorkspaceToolbar
            activeFileName={activeFile?.path ?? defaultVirtualPath}
            autoRunEnabled={autoRunEnabled}
            canAnalyze={canAnalyze}
            fileCount={fileCount}
            historyCount={historyCount}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
            onAutoRunChange={onAutoRunChange}
            onLoadRiskySample={onLoadRiskySample}
            onOpenHistory={onOpenHistory}
            onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
            onOpenSettings={onOpenSettings}
            selectedSampleLabel={selectedSampleLabel}
            totalSizeLabel={totalSizeLabel}
          />

          <div className="mt-5 hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="min-w-0">
              <InputPanel
                activeFile={activeFile}
                activeFileId={activeFileId}
                activeFindingId={activeFindingId}
                canAnalyze={canAnalyze}
                defaultVirtualPath={defaultVirtualPath}
                editorJumpTarget={editorJumpTarget}
                errors={errors}
                fileCount={fileCount}
                files={files}
                folderUploadSupported={folderUploadSupported}
                includeAllYamlFiles={includeAllYamlFiles}
                inputText={inputText}
                isAnalyzing={isAnalyzing}
                maxFileSizeBytes={maxFileSizeBytes}
                maxFileSizeLabel={maxFileSizeLabel}
                onAddPasteFile={onAddPasteFile}
                onAnalyze={onAnalyze}
                onClear={onClear}
                onClearActiveInput={onClearActiveInput}
                onFileUpload={onFileUpload}
                onFileUploadFromFolder={onFileUploadFromFolder}
                onGitHubImport={onGitHubImport}
                onInputChange={onInputChange}
                onLoadSelectedSample={onLoadSelectedSample}
                onRemoveFile={onRemoveFile}
                onRenameFile={onRenameFile}
                onSampleChange={onSampleChange}
                onSelectFile={onSelectFile}
                onSoftWrapChange={onSoftWrapChange}
                onToggleIncludeAllYamlFiles={onToggleIncludeAllYamlFiles}
                report={report}
                selectedSampleId={selectedSampleId}
                softWrapEnabled={softWrapEnabled}
                totalSizeLabel={totalSizeLabel}
              />
            </div>
            <div className="min-w-0">
              <ResultsPanel
                activeFileName={activeFile?.path ?? defaultVirtualPath}
                activeFindingId={activeFindingId}
                analysisError={analysisError}
                files={files}
                hasInput={hasRunnableInput}
                isAnalyzing={isAnalyzing}
                lastAnalyzedAt={lastAnalyzedAt}
                onApplyFix={onApplyFix}
                onFindingSelect={handleFindingSelect}
                report={report}
                selectedSampleId={selectedSampleId}
                selectedSampleLabel={selectedSampleLabel}
                view="all"
              />
            </div>
          </div>

          <div className="mt-5 lg:hidden" data-testid="analyzer-mobile-tabs">
            <Tabs onValueChange={setMobileTab} value={mobileTab}>
              <TabsList aria-label="Analyzer workspace tabs">
                <TabsTrigger value="input">Input</TabsTrigger>
                <TabsTrigger value="findings">Findings</TabsTrigger>
                <TabsTrigger value="report">Report</TabsTrigger>
              </TabsList>

              <TabsContent value="input">
                <InputPanel
                  activeFile={activeFile}
                  activeFileId={activeFileId}
                  activeFindingId={activeFindingId}
                  canAnalyze={canAnalyze}
                  defaultVirtualPath={defaultVirtualPath}
                  editorJumpTarget={editorJumpTarget}
                  errors={errors}
                  fileCount={fileCount}
                  files={files}
                  folderUploadSupported={folderUploadSupported}
                  includeAllYamlFiles={includeAllYamlFiles}
                  inputText={inputText}
                  isAnalyzing={isAnalyzing}
                  maxFileSizeBytes={maxFileSizeBytes}
                  maxFileSizeLabel={maxFileSizeLabel}
                  onAddPasteFile={onAddPasteFile}
                  onAnalyze={onAnalyze}
                  onClear={onClear}
                  onClearActiveInput={onClearActiveInput}
                  onFileUpload={onFileUpload}
                  onFileUploadFromFolder={onFileUploadFromFolder}
                  onGitHubImport={onGitHubImport}
                  onInputChange={onInputChange}
                  onLoadSelectedSample={onLoadSelectedSample}
                  onRemoveFile={onRemoveFile}
                  onRenameFile={onRenameFile}
                  onSampleChange={onSampleChange}
                  onSelectFile={onSelectFile}
                  onSoftWrapChange={onSoftWrapChange}
                  onToggleIncludeAllYamlFiles={onToggleIncludeAllYamlFiles}
                  report={report}
                  selectedSampleId={selectedSampleId}
                  softWrapEnabled={softWrapEnabled}
                  totalSizeLabel={totalSizeLabel}
                />
              </TabsContent>
              <TabsContent value="findings">
                <ResultsPanel
                  activeFileName={activeFile?.path ?? defaultVirtualPath}
                  activeFindingId={activeFindingId}
                  analysisError={analysisError}
                  files={files}
                  hasInput={hasRunnableInput}
                  isAnalyzing={isAnalyzing}
                  lastAnalyzedAt={lastAnalyzedAt}
                  onApplyFix={onApplyFix}
                  onFindingSelect={handleFindingSelect}
                  report={report}
                  selectedSampleId={selectedSampleId}
                  selectedSampleLabel={selectedSampleLabel}
                  view="findings"
                />
              </TabsContent>
              <TabsContent value="report">
                <ResultsPanel
                  activeFileName={activeFile?.path ?? defaultVirtualPath}
                  activeFindingId={activeFindingId}
                  analysisError={analysisError}
                  files={files}
                  hasInput={hasRunnableInput}
                  isAnalyzing={isAnalyzing}
                  lastAnalyzedAt={lastAnalyzedAt}
                  onApplyFix={onApplyFix}
                  onFindingSelect={handleFindingSelect}
                  report={report}
                  selectedSampleId={selectedSampleId}
                  selectedSampleLabel={selectedSampleLabel}
                  view="report"
                />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="compare">
          <CompareReportsPanel
            currentReport={report}
            currentSampleLabel={selectedSampleLabel}
            lastAnalyzedCurrentReport={lastAnalyzedCurrentReport}
            onAnalyzePrevious={onAnalyzePrevious}
            onPreviousAddPasteFile={onPreviousAddPasteFile}
            onPreviousClear={onPreviousClear}
            onPreviousClearActiveInput={onPreviousClearActiveInput}
            onPreviousFileUpload={onPreviousFileUpload}
            onPreviousFileUploadFromFolder={onPreviousFileUploadFromFolder}
            onPreviousGitHubImport={onPreviousGitHubImport}
            onPreviousInputChange={onPreviousInputChange}
            onPreviousLoadSelectedSample={onPreviousLoadSelectedSample}
            onPreviousRemoveFile={onPreviousRemoveFile}
            onPreviousRenameFile={onPreviousRenameFile}
            onPreviousSampleChange={onPreviousSampleChange}
            onPreviousSelectFile={onPreviousSelectFile}
            onPreviousSoftWrapChange={onPreviousSoftWrapChange}
            onPreviousToggleIncludeAllYamlFiles={
              onPreviousToggleIncludeAllYamlFiles
            }
            previousActiveFile={previousActiveFile}
            previousActiveFileId={previousActiveFileId}
            previousAnalysisError={previousAnalysisError}
            previousCanAnalyze={previousCanAnalyze}
            previousDefaultVirtualPath={previousDefaultVirtualPath}
            previousErrors={previousErrors}
            previousFileCount={previousFileCount}
            previousFiles={previousFiles}
            previousFolderUploadSupported={previousFolderUploadSupported}
            previousIncludeAllYamlFiles={previousIncludeAllYamlFiles}
            previousInputText={previousInputText}
            previousIsAnalyzing={previousIsAnalyzing}
            previousMaxFileSizeBytes={previousMaxFileSizeBytes}
            previousMaxFileSizeLabel={previousMaxFileSizeLabel}
            previousReport={previousReport}
            previousSelectedSampleId={previousSelectedSampleId}
            previousSelectedSampleLabel={previousSelectedSampleLabel}
            previousSoftWrapEnabled={previousSoftWrapEnabled}
            previousTotalSizeLabel={previousTotalSizeLabel}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
