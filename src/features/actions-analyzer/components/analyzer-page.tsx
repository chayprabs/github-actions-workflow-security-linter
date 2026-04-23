"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { Container } from "@/components/ui/container";
import { useTheme } from "@/components/layout/theme-provider";
import {
  ActionToastProvider,
  usePushActionToast,
} from "@/features/actions-analyzer/components/action-toast-provider";
import { AnalysisHistoryPanel } from "@/features/actions-analyzer/components/analysis-history-panel";
import { AnalyzerHero } from "@/features/actions-analyzer/components/analyzer-hero";
import { AnalyzerSettingsDrawer } from "@/features/actions-analyzer/components/analyzer-settings-drawer";
import { AnalyzerWorkspace } from "@/features/actions-analyzer/components/analyzer-workspace";
import { KeyboardShortcutsDialog } from "@/features/actions-analyzer/components/keyboard-shortcuts-dialog";
import { SeoContent } from "@/features/actions-analyzer/components/seo-content";
import type { WorkflowEditorJumpTarget } from "@/features/actions-analyzer/components/workflow-code-editor";
import {
  workflowSamples,
  type WorkflowSampleId,
} from "@/features/actions-analyzer/fixtures/samples";
import {
  appendStoredAnalysisHistory,
  buildRecentAnalysisHistoryEntry,
  clearStoredAnalysisHistory,
  readStoredAnalysisHistory,
  writeStoredAnalysisHistory,
  type RecentAnalysisGitHubImport,
  type RecentAnalysisHistoryEntry,
} from "@/features/actions-analyzer/lib/analysis-history";
import {
  defaultAnalyzerWorkspacePreferences,
  readStoredAnalyzerWorkspacePreferences,
  toAnalyzerSettings,
  writeStoredAnalyzerWorkspacePreferences,
  type AnalyzerWorkspacePreferences,
} from "@/features/actions-analyzer/lib/analyzer-preferences";
import { copyTextToClipboard } from "@/features/actions-analyzer/lib/browser-actions";
import {
  fetchPublicGitHubFile,
  getGitHubImportErrorMessage,
  parseGitHubUrl,
} from "@/features/actions-analyzer/lib/github-import";
import { buildPrCommentMarkdown } from "@/features/actions-analyzer/lib/report-exports";
import { parseAnalyzerShareState } from "@/features/actions-analyzer/lib/report-share";
import { useWorkflowAnalysis } from "@/features/actions-analyzer/lib/use-workflow-analysis";
import { useWorkflowInputs } from "@/features/actions-analyzer/lib/use-workflow-inputs";
import {
  createWorkflowInputFile,
  getWorkflowFileSourceLabel,
  normalizeWorkflowPath,
} from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  AnalyzerFinding,
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

const validSampleIds = new Set(workflowSamples.map((sample) => sample.id));

export function AnalyzerPage() {
  return (
    <ActionToastProvider>
      <AnalyzerPageContent />
    </ActionToastProvider>
  );
}

function AnalyzerPageContent() {
  const { preference: themePreference } = useTheme();
  const pushToast = usePushActionToast();
  const [preferences, setPreferences] = useState<AnalyzerWorkspacePreferences>(
    () => {
      if (typeof window === "undefined") {
        return defaultAnalyzerWorkspacePreferences;
      }

      const storedPreferences = readStoredAnalyzerWorkspacePreferences();
      const shareState = parseAnalyzerShareState(window.location.search);

      if (!shareState.settings) {
        return storedPreferences;
      }

      return {
        ...storedPreferences,
        analyzer: {
          ...storedPreferences.analyzer,
          ...shareState.settings,
        },
      };
    },
  );
  const [historyEntries, setHistoryEntries] = useState<
    RecentAnalysisHistoryEntry[]
  >(() => {
    return readStoredAnalysisHistory();
  });
  const [focusResultsSearchSignal, setFocusResultsSearchSignal] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reloadingHistoryEntryId, setReloadingHistoryEntryId] = useState<
    string | null
  >(null);
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
  const lastStoredHistoryReportRef = useRef<string | null>(null);
  const setCurrentSettings = workflowInputs.setSettings;
  const setPreviousSettings = compareWorkflowInputs.setSettings;
  const loadCurrentSample = workflowInputs.loadSample;
  const loadPreviousSample = compareWorkflowInputs.loadSample;
  const visibleReport =
    analysisFiles.length === 0 && (analysis.report?.files.length ?? 0) > 0
      ? null
      : analysis.report;
  const visibleAnalysisError =
    analysisFiles.length === 0 && visibleReport === null
      ? null
      : analysis.error;
  const analyzerPreferenceSettings = useMemo(
    () => toAnalyzerSettings(preferences),
    [preferences],
  );

  useEffect(() => {
    writeStoredAnalyzerWorkspacePreferences({
      ...preferences,
      theme: themePreference,
    });
  }, [preferences, themePreference]);

  useEffect(() => {
    writeStoredAnalysisHistory(historyEntries);
  }, [historyEntries]);

  useEffect(() => {
    setCurrentSettings((current) => ({
      ...current,
      ...analyzerPreferenceSettings,
    }));
    setPreviousSettings((current) => ({
      ...current,
      ...analyzerPreferenceSettings,
    }));
  }, [analyzerPreferenceSettings, setCurrentSettings, setPreviousSettings]);

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

    if (shareState.sampleId) {
      loadCurrentSample(shareState.sampleId);
    }

    if (shareState.previousSampleId) {
      loadPreviousSample(shareState.previousSampleId);
    }
  }, [loadCurrentSample, loadPreviousSample]);

  useEffect(() => {
    if (!preferences.ui.autoRunAnalysis || analysisFiles.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      requestAutoRun();
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [analysisFiles, preferences.ui.autoRunAnalysis]);

  useEffect(() => {
    if (!analysis.report) {
      return;
    }

    if (latestCurrentReportRef.current) {
      setLastAnalyzedCurrentReport(latestCurrentReportRef.current);
    }

    latestCurrentReportRef.current = analysis.report;
  }, [analysis.report]);

  useEffect(() => {
    if (!analysis.report) {
      return;
    }

    if (lastStoredHistoryReportRef.current === analysis.report.generatedAt) {
      return;
    }

    lastStoredHistoryReportRef.current = analysis.report.generatedAt;
    const nextEntry = buildRecentAnalysisHistoryEntry({
      rememberWorkflowContent: preferences.ui.rememberWorkflowContent,
      report: analysis.report,
      selectedSampleId:
        workflowInputs.selectedSampleId !== "manual"
          ? workflowInputs.selectedSampleId
          : undefined,
    });

    setHistoryEntries((currentEntries) =>
      appendStoredAnalysisHistory(currentEntries, nextEntry),
    );
  }, [
    analysis.report,
    preferences.ui.rememberWorkflowContent,
    workflowInputs.selectedSampleId,
  ]);

  const handleDocumentKeyDown = useEffectEvent(async (event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.defaultPrevented) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "enter" && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      setWorkspaceMode("analyze");
      void analysis.analyzeNow({
        includeEmptyInputFinding: analysisFiles.length === 0,
      });
      return;
    }

    if (key === "k" && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      setWorkspaceMode("analyze");
      setFocusResultsSearchSignal((currentValue) => currentValue + 1);
      return;
    }

    if (key === "c" && event.shiftKey && !event.altKey && visibleReport) {
      event.preventDefault();

      try {
        await copyTextToClipboard(buildPrCommentMarkdown(visibleReport));
        pushToast({
          message: "PR comment copied to the clipboard.",
          tone: "success",
        });
      } catch {
        pushToast({
          message: "Authos could not copy the PR comment.",
          tone: "danger",
        });
      }
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      void handleDocumentKeyDown(event);
    };

    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);

  function updatePreferences(
    updater: (
      current: AnalyzerWorkspacePreferences,
    ) => AnalyzerWorkspacePreferences,
  ) {
    setPreferences((current) => updater(current));
  }

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
    const didLoad = workflowInputs.loadSample(sampleId);

    if (didLoad) {
      clearFindingSelection();
    }

    return didLoad;
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

  async function handleReloadHistoryEntry(entry: RecentAnalysisHistoryEntry) {
    setReloadingHistoryEntryId(entry.id);

    try {
      clearFindingSelection();
      setWorkspaceMode("analyze");

      if (entry.rememberedFiles?.length) {
        workflowInputs.replaceFiles(cloneHistoryFiles(entry.rememberedFiles), {
          selectedSampleId: getHistorySelectedSampleId(entry),
        });
        setIsHistoryOpen(false);
        pushToast({
          message: "Reloaded workflow content from local history.",
          tone: "success",
        });
        return;
      }

      const sampleId = getHistorySelectedSampleId(entry);

      if (sampleId) {
        workflowInputs.loadSample(sampleId);
        setIsHistoryOpen(false);
        pushToast({
          message: "Reloaded the saved sample workflow.",
          tone: "success",
        });
        return;
      }

      if (entry.githubImports.length > 0) {
        const importedFiles = await reloadGitHubHistoryFiles(
          entry.githubImports,
        );
        workflowInputs.replaceFiles(importedFiles);
        setIsHistoryOpen(false);
        pushToast({
          message: `Reloaded ${importedFiles.length} workflow${importedFiles.length === 1 ? "" : "s"} from public GitHub.`,
          tone: "success",
        });
        return;
      }

      pushToast({
        message:
          "This history entry only kept metadata. Enable local content history to reopen pasted or uploaded workflows later.",
        tone: "warning",
      });
    } catch (error) {
      pushToast({
        message: getGitHubImportErrorMessage(error),
        tone: "danger",
      });
    } finally {
      setReloadingHistoryEntryId(null);
    }
  }

  function handleResetPreferences() {
    setPreferences((current) => ({
      ...defaultAnalyzerWorkspacePreferences,
      theme: current.theme,
    }));
    pushToast({
      message: "Analyzer settings were reset on this device.",
      tone: "success",
    });
  }

  function handleClearHistory() {
    clearStoredAnalysisHistory();
    setHistoryEntries([]);
    pushToast({
      message: "Recent analysis history was cleared on this device.",
      tone: "success",
    });
  }

  return (
    <>
      <Container
        className="space-y-12 overflow-x-hidden py-16 sm:space-y-14 sm:py-20"
        data-testid="analyzer-page"
      >
        <AnalyzerHero onLoadRiskySample={handleLoadRiskySample} />
        <AnalyzerWorkspace
          activeFile={activeFile}
          activeFileId={workflowInputs.activeFileId}
          activeFindingId={activeFindingId}
          analysisError={visibleAnalysisError}
          autoRunEnabled={preferences.ui.autoRunAnalysis}
          canAnalyze={!analysis.isAnalyzing}
          defaultVirtualPath={workflowInputs.defaultVirtualPath}
          editorJumpTarget={editorJumpTarget}
          errors={workflowInputs.errors}
          fileCount={workflowInputs.fileCount}
          files={workflowInputs.files}
          folderUploadSupported={workflowInputs.folderUploadSupported}
          focusResultsSearchSignal={focusResultsSearchSignal}
          hasRunnableInput={analysisFiles.length > 0}
          historyCount={historyEntries.length}
          includeAllYamlFiles={workflowInputs.includeAllYamlFiles}
          inputText={activeFile?.content ?? ""}
          isAnalyzing={analysis.isAnalyzing}
          lastAnalyzedCurrentReport={lastAnalyzedCurrentReport}
          lastAnalyzedAt={analysis.lastAnalyzedAt}
          maxFileSizeBytes={workflowInputs.maxFileSizeBytes}
          maxFileSizeLabel={workflowInputs.maxFileSizeLabel}
          onAddPasteFile={() => {
            clearFindingSelection();
            workflowInputs.addPasteFile();
          }}
          onAnalyze={handleAnalyze}
          onAnalyzePrevious={handleAnalyzePrevious}
          onApplyFix={handleApplyFix}
          onAutoRunChange={(checked) => {
            updatePreferences((current) => ({
              ...current,
              ui: {
                ...current.ui,
                autoRunAnalysis: checked,
              },
            }));
          }}
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
          onFindingSelect={handleFindingSelect}
          onGitHubImport={async (files) => {
            clearFindingSelection();
            await workflowInputs.addImportedFiles(files);
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
          onOpenHistory={() => {
            setIsHistoryOpen(true);
          }}
          onOpenKeyboardShortcuts={() => {
            setIsKeyboardShortcutsOpen(true);
          }}
          onOpenSettings={() => {
            setIsSettingsOpen(true);
          }}
          onPreviousAddPasteFile={compareWorkflowInputs.addPasteFile}
          onPreviousClear={compareWorkflowInputs.clearAll}
          onPreviousClearActiveInput={compareWorkflowInputs.clearActiveInput}
          onPreviousFileUpload={async (files) => {
            await compareWorkflowInputs.addUploadedFiles(files, "file");
          }}
          onPreviousFileUploadFromFolder={async (files) => {
            await compareWorkflowInputs.addUploadedFiles(files, "folder");
          }}
          onPreviousGitHubImport={async (files) => {
            await compareWorkflowInputs.addImportedFiles(files);
          }}
          onPreviousInputChange={(value) => {
            if (!compareActiveFile) {
              return;
            }

            compareWorkflowInputs.updateFileContent(
              compareActiveFile.id,
              value,
            );
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
          onPreviousSoftWrapChange={(checked) => {
            updatePreferences((current) => ({
              ...current,
              ui: {
                ...current.ui,
                softWrapEditor: checked,
              },
            }));
          }}
          onPreviousToggleIncludeAllYamlFiles={
            compareWorkflowInputs.setIncludeAllYamlFiles
          }
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
          onSoftWrapChange={(checked) => {
            updatePreferences((current) => ({
              ...current,
              ui: {
                ...current.ui,
                softWrapEditor: checked,
              },
            }));
          }}
          onToggleIncludeAllYamlFiles={workflowInputs.setIncludeAllYamlFiles}
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
          previousIncludeAllYamlFiles={
            compareWorkflowInputs.includeAllYamlFiles
          }
          previousInputText={compareActiveFile?.content ?? ""}
          previousIsAnalyzing={compareAnalysis.isAnalyzing}
          previousMaxFileSizeBytes={compareWorkflowInputs.maxFileSizeBytes}
          previousMaxFileSizeLabel={compareWorkflowInputs.maxFileSizeLabel}
          previousReport={compareAnalysis.report}
          previousSelectedSampleId={compareWorkflowInputs.selectedSampleId}
          previousSelectedSampleLabel={compareSelectedSampleLabel}
          previousSoftWrapEnabled={preferences.ui.softWrapEditor}
          previousTotalSizeLabel={compareWorkflowInputs.totalSizeLabel}
          report={visibleReport}
          selectedSampleId={workflowInputs.selectedSampleId}
          selectedSampleLabel={selectedSampleLabel}
          softWrapEnabled={preferences.ui.softWrapEditor}
          totalSizeLabel={workflowInputs.totalSizeLabel}
          workspaceMode={workspaceMode}
        />
        <SeoContent
          onLoadExample={(sampleId) => {
            const didLoad = handleSampleLoad(sampleId);

            if (!didLoad || typeof document === "undefined") {
              return;
            }

            setWorkspaceMode("analyze");
            window.setTimeout(() => {
              document
                .getElementById("analyzer-workspace")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 0);
          }}
        />
      </Container>

      <AnalyzerSettingsDrawer
        onChange={updatePreferences}
        onClose={() => {
          setIsSettingsOpen(false);
        }}
        onReset={handleResetPreferences}
        open={isSettingsOpen}
        preferences={preferences}
      />
      <AnalysisHistoryPanel
        entries={historyEntries}
        onClearHistory={handleClearHistory}
        onClose={() => {
          setIsHistoryOpen(false);
        }}
        onReloadEntry={handleReloadHistoryEntry}
        open={isHistoryOpen}
        reloadingEntryId={reloadingHistoryEntryId}
      />
      <KeyboardShortcutsDialog
        onClose={() => {
          setIsKeyboardShortcutsOpen(false);
        }}
        open={isKeyboardShortcutsOpen}
      />
    </>
  );
}

function cloneHistoryFiles(files: WorkflowInputFile[]) {
  return files.map((file, index) =>
    createWorkflowInputFile({
      content: file.content,
      index,
      path: file.path,
      sizeBytes: file.sizeBytes,
      sourceKind: file.sourceKind,
      sourceMetadata: file.sourceMetadata,
    }),
  );
}

function getHistorySelectedSampleId(entry: RecentAnalysisHistoryEntry) {
  if (
    !entry.selectedSampleId ||
    !validSampleIds.has(entry.selectedSampleId as WorkflowSampleId)
  ) {
    return undefined;
  }

  return entry.selectedSampleId as WorkflowSampleId;
}

async function reloadGitHubHistoryFiles(
  githubImports: RecentAnalysisGitHubImport[],
) {
  return Promise.all(
    githubImports.map(async (githubImport, index) => {
      const parsedUrl = parseGitHubUrl(githubImport.importUrl);
      const importedFile = await fetchPublicGitHubFile({
        owner: parsedUrl.owner,
        path: githubImport.remotePath,
        ref:
          githubImport.ref ??
          ("ref" in parsedUrl ? (parsedUrl.ref ?? "main") : "main"),
        repo: parsedUrl.repo,
        workspacePath: githubImport.workspacePath,
      });

      return createWorkflowInputFile({
        content: importedFile.content,
        index,
        path: githubImport.workspacePath,
        sizeBytes: importedFile.sizeBytes,
        sourceKind: "github",
        sourceMetadata: {
          githubImportUrl: githubImport.importUrl,
          githubPath: githubImport.remotePath,
          githubRef: importedFile.ref,
        },
      });
    }),
  );
}
