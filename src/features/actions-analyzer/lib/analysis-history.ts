import type {
  AnalyzerSettings,
  WorkflowAnalysisReport,
  WorkflowInputFile,
  WorkflowInputSourceKind,
} from "@/features/actions-analyzer/types";

const analysisHistoryStorageKey = "authos.actions-analyzer.history.v1";
const maxStoredAnalysisHistoryEntries = 12;

export interface RecentAnalysisHistoryEntry {
  fileNames: string[];
  githubImports: RecentAnalysisGitHubImport[];
  id: string;
  rememberedFiles?: WorkflowInputFile[] | undefined;
  score: number;
  selectedSampleId?: string | undefined;
  settings: Partial<AnalyzerSettings>;
  severityCounts: WorkflowAnalysisReport["summary"]["severityCounts"];
  sourceKinds: WorkflowInputSourceKind[];
  timestamp: string;
  totalFindings: number;
  workflowCount: number;
}

export interface RecentAnalysisGitHubImport {
  importUrl: string;
  ref?: string | undefined;
  remotePath: string;
  workspacePath: string;
}

export function buildRecentAnalysisHistoryEntry({
  rememberWorkflowContent,
  report,
  selectedSampleId,
}: {
  rememberWorkflowContent: boolean;
  report: WorkflowAnalysisReport;
  selectedSampleId?: string | undefined;
}): RecentAnalysisHistoryEntry {
  return {
    fileNames: report.files.map((file) => file.path),
    githubImports: getHistoryGitHubImports(report.files),
    id: createHistoryEntryId(report),
    rememberedFiles: rememberWorkflowContent
      ? report.files.map(cloneHistoryFile)
      : undefined,
    score: report.summary.score,
    selectedSampleId,
    settings: {
      allowSelfHostedOnPullRequest:
        report.settings.allowSelfHostedOnPullRequest,
      detectSecretsInInput: report.settings.detectSecretsInInput,
      maxMatrixCombinationsBeforeWarning:
        report.settings.maxMatrixCombinationsBeforeWarning,
      profile: report.settings.profile,
      requireShaPinning: report.settings.requireShaPinning,
      warnOnMissingTopLevelPermissions:
        report.settings.warnOnMissingTopLevelPermissions,
    },
    severityCounts: { ...report.summary.severityCounts },
    sourceKinds: Array.from(
      new Set(report.files.map((file) => file.sourceKind)),
    ),
    timestamp: report.generatedAt,
    totalFindings: report.summary.totalFindings,
    workflowCount: report.summary.workflowCount,
  };
}

export function readStoredAnalysisHistory(): RecentAnalysisHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(analysisHistoryStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(sanitizeHistoryEntry)
      .filter((entry): entry is RecentAnalysisHistoryEntry => entry !== null);
  } catch {
    return [];
  }
}

export function writeStoredAnalysisHistory(
  entries: RecentAnalysisHistoryEntry[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    analysisHistoryStorageKey,
    JSON.stringify(entries.slice(0, maxStoredAnalysisHistoryEntries)),
  );
}

export function appendStoredAnalysisHistory(
  existingEntries: RecentAnalysisHistoryEntry[],
  nextEntry: RecentAnalysisHistoryEntry,
) {
  const dedupedEntries = existingEntries.filter((entry) => {
    return (
      createHistoryEntryFingerprint(entry) !==
      createHistoryEntryFingerprint(nextEntry)
    );
  });

  return [nextEntry, ...dedupedEntries].slice(
    0,
    maxStoredAnalysisHistoryEntries,
  );
}

export function clearStoredAnalysisHistory() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(analysisHistoryStorageKey);
}

export function canReloadHistoryEntry(entry: RecentAnalysisHistoryEntry) {
  if (entry.rememberedFiles && entry.rememberedFiles.length > 0) {
    return true;
  }

  if (entry.selectedSampleId) {
    return entry.sourceKinds.every((sourceKind) => sourceKind === "sample");
  }

  if (entry.githubImports.length > 0) {
    return entry.sourceKinds.every((sourceKind) => sourceKind === "github");
  }

  return false;
}

function createHistoryEntryId(report: WorkflowAnalysisReport) {
  return `${report.generatedAt}:${report.summary.score}:${report.summary.totalFindings}:${report.files.map((file) => file.path).join("|")}`;
}

function createHistoryEntryFingerprint(entry: RecentAnalysisHistoryEntry) {
  return JSON.stringify({
    fileNames: entry.fileNames,
    githubImports: entry.githubImports,
    rememberedFiles:
      entry.rememberedFiles?.map((file) => ({
        content: file.content,
        path: file.path,
        sizeBytes: file.sizeBytes,
        sourceKind: file.sourceKind,
        sourceMetadata: file.sourceMetadata,
      })) ?? null,
    score: entry.score,
    selectedSampleId: entry.selectedSampleId,
    severityCounts: entry.severityCounts,
    sourceKinds: entry.sourceKinds,
    totalFindings: entry.totalFindings,
    workflowCount: entry.workflowCount,
  });
}

function getHistoryGitHubImports(files: WorkflowInputFile[]) {
  const githubImports: RecentAnalysisGitHubImport[] = [];

  for (const file of files) {
    if (file.sourceKind !== "github") {
      continue;
    }

    const importUrl = file.sourceMetadata?.githubImportUrl;
    const remotePath = file.sourceMetadata?.githubPath;

    if (!importUrl || !remotePath) {
      continue;
    }

    githubImports.push({
      importUrl,
      ref: file.sourceMetadata?.githubRef,
      remotePath,
      workspacePath: file.path,
    });
  }

  return githubImports;
}

function cloneHistoryFile(file: WorkflowInputFile): WorkflowInputFile {
  return {
    ...file,
    sourceMetadata: file.sourceMetadata
      ? { ...file.sourceMetadata }
      : undefined,
  };
}

function sanitizeHistoryEntry(
  value: unknown,
): RecentAnalysisHistoryEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RecentAnalysisHistoryEntry>;

  if (
    !Array.isArray(candidate.fileNames) ||
    !Array.isArray(candidate.sourceKinds) ||
    typeof candidate.id !== "string" ||
    typeof candidate.score !== "number" ||
    typeof candidate.timestamp !== "string" ||
    typeof candidate.totalFindings !== "number" ||
    typeof candidate.workflowCount !== "number"
  ) {
    return null;
  }

  return {
    fileNames: candidate.fileNames.filter(
      (fileName): fileName is string => typeof fileName === "string",
    ),
    githubImports: Array.isArray(candidate.githubImports)
      ? candidate.githubImports.filter(isRecentAnalysisGitHubImport)
      : [],
    id: candidate.id,
    rememberedFiles: Array.isArray(candidate.rememberedFiles)
      ? candidate.rememberedFiles.filter(isWorkflowInputFile)
      : undefined,
    score: candidate.score,
    selectedSampleId:
      typeof candidate.selectedSampleId === "string"
        ? candidate.selectedSampleId
        : undefined,
    settings:
      candidate.settings && typeof candidate.settings === "object"
        ? candidate.settings
        : {},
    severityCounts:
      candidate.severityCounts && typeof candidate.severityCounts === "object"
        ? candidate.severityCounts
        : {
            critical: 0,
            high: 0,
            info: 0,
            low: 0,
            medium: 0,
          },
    sourceKinds: candidate.sourceKinds.filter(
      (sourceKind): sourceKind is WorkflowInputSourceKind =>
        sourceKind === "paste" ||
        sourceKind === "upload" ||
        sourceKind === "sample" ||
        sourceKind === "github",
    ),
    timestamp: candidate.timestamp,
    totalFindings: candidate.totalFindings,
    workflowCount: candidate.workflowCount,
  };
}

function isRecentAnalysisGitHubImport(
  value: unknown,
): value is RecentAnalysisGitHubImport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RecentAnalysisGitHubImport>;

  return (
    typeof candidate.importUrl === "string" &&
    typeof candidate.remotePath === "string" &&
    typeof candidate.workspacePath === "string"
  );
}

function isWorkflowInputFile(value: unknown): value is WorkflowInputFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WorkflowInputFile>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.path === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.sizeBytes === "number" &&
    (candidate.sourceKind === "paste" ||
      candidate.sourceKind === "upload" ||
      candidate.sourceKind === "sample" ||
      candidate.sourceKind === "github")
  );
}
