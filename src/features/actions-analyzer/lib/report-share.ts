import { defaultAnalyzerSettings } from "@/features/actions-analyzer/lib/settings";
import type {
  FindingCategory,
  Severity,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";

export type ShareableResultsGroupBy = "severity" | "file" | "category" | "flat";
export type ShareableResultsSort =
  | "severity"
  | "file-line"
  | "category"
  | "rule";
export type ShareableResultsView = "all" | "findings" | "report";
export type ShareableWorkspaceMode = "analyze" | "compare";

export interface ResultsShareState {
  groupBy: ShareableResultsGroupBy;
  searchQuery: string;
  selectedCategory: "all" | FindingCategory;
  selectedFilePath: "all" | string;
  selectedJobId: "all" | string;
  selectedSeverities: Severity[];
  showSecurityOnly: boolean;
  showWarningsOnly: boolean;
  sortBy: ShareableResultsSort;
  view: ShareableResultsView;
}

export interface AnalyzerShareState {
  previousSampleId?: WorkflowSampleId | undefined;
  results?: ResultsShareState | undefined;
  sampleId?: WorkflowSampleId | undefined;
  settings?: Partial<typeof defaultAnalyzerSettings> | undefined;
  workspaceMode?: ShareableWorkspaceMode | undefined;
}

const shareableSettingKeys = [
  "allowSelfHostedOnPullRequest",
  "detectSecretsInInput",
  "maxMatrixCombinationsBeforeWarning",
  "profile",
  "requireShaPinning",
  "warnOnMissingTopLevelPermissions",
] as const;

export function buildPrivacySafeShareUrl({
  baseUrl,
  state,
}: {
  baseUrl: string;
  state: AnalyzerShareState;
}) {
  const url = new URL(baseUrl);
  const params = url.searchParams;

  params.delete("category");
  params.delete("file");
  params.delete("group");
  params.delete("job");
  params.delete("prevSample");
  params.delete("sample");
  params.delete("search");
  params.delete("security");
  params.delete("sev");
  params.delete("sort");
  params.delete("view");
  params.delete("warnings");
  params.delete("workspace");

  for (const settingKey of shareableSettingKeys) {
    params.delete(settingKey);
  }

  if (state.workspaceMode === "compare") {
    params.set("workspace", "compare");
  }

  if (state.sampleId) {
    params.set("sample", state.sampleId);
  }

  if (state.previousSampleId) {
    params.set("prevSample", state.previousSampleId);
  }

  if (state.results) {
    if (state.results.searchQuery.trim().length > 0) {
      params.set("search", state.results.searchQuery.trim());
    }

    if (state.results.selectedCategory !== "all") {
      params.set("category", state.results.selectedCategory);
    }

    if (state.results.selectedFilePath !== "all") {
      params.set("file", state.results.selectedFilePath);
    }

    if (state.results.selectedJobId !== "all") {
      params.set("job", state.results.selectedJobId);
    }

    if (state.results.selectedSeverities.length > 0) {
      params.set("sev", state.results.selectedSeverities.join(","));
    }

    if (state.results.showSecurityOnly) {
      params.set("security", "1");
    }

    if (state.results.showWarningsOnly) {
      params.set("warnings", "1");
    }

    if (state.results.sortBy !== "severity") {
      params.set("sort", state.results.sortBy);
    }

    if (state.results.groupBy !== "severity") {
      params.set("group", state.results.groupBy);
    }

    if (state.results.view !== "all") {
      params.set("view", state.results.view);
    }
  }

  if (state.settings) {
    for (const key of shareableSettingKeys) {
      const value = state.settings[key];

      if (value === undefined || value === defaultAnalyzerSettings[key]) {
        continue;
      }

      params.set(key, String(value));
    }
  }

  return url.toString();
}

export function parseAnalyzerShareState(search: string): AnalyzerShareState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  return {
    previousSampleId:
      (params.get("prevSample") as WorkflowSampleId | null) ?? undefined,
    results: {
      groupBy:
        (params.get("group") as ShareableResultsGroupBy | null) ?? "severity",
      searchQuery: params.get("search") ?? "",
      selectedCategory:
        (params.get("category") as "all" | FindingCategory | null) ?? "all",
      selectedFilePath: params.get("file") ?? "all",
      selectedJobId: params.get("job") ?? "all",
      selectedSeverities: parseSeverityList(params.get("sev")),
      showSecurityOnly: params.get("security") === "1",
      showWarningsOnly: params.get("warnings") === "1",
      sortBy: (params.get("sort") as ShareableResultsSort | null) ?? "severity",
      view: (params.get("view") as ShareableResultsView | null) ?? "all",
    },
    sampleId: (params.get("sample") as WorkflowSampleId | null) ?? undefined,
    settings: parseSharedSettings(params),
    workspaceMode:
      (params.get("workspace") as ShareableWorkspaceMode | null) ?? "analyze",
  };
}

export function getPrivacySafeShareableSampleId({
  files,
  selectedSampleId,
}: {
  files: WorkflowInputFile[];
  selectedSampleId: WorkflowSampleId | "manual";
}) {
  if (selectedSampleId === "manual") {
    return undefined;
  }

  const nonEmptyFiles = files.filter((file) => file.content.trim().length > 0);

  if (
    nonEmptyFiles.length === 0 ||
    !nonEmptyFiles.every((file) => file.sourceKind === "sample")
  ) {
    return undefined;
  }

  return selectedSampleId;
}

function parseSeverityList(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is Severity => {
      return ["critical", "high", "medium", "low", "info"].includes(entry);
    });
}

function parseSharedSettings(params: URLSearchParams) {
  const sharedSettings: Partial<typeof defaultAnalyzerSettings> = {};

  for (const key of shareableSettingKeys) {
    const rawValue = params.get(key);

    if (rawValue === null) {
      continue;
    }

    if (typeof defaultAnalyzerSettings[key] === "boolean") {
      sharedSettings[key] = (rawValue === "true") as never;
      continue;
    }

    if (typeof defaultAnalyzerSettings[key] === "number") {
      const parsedNumber = Number(rawValue);

      if (!Number.isNaN(parsedNumber)) {
        sharedSettings[key] = parsedNumber as never;
      }
      continue;
    }

    sharedSettings[key] = rawValue as never;
  }

  return Object.keys(sharedSettings).length > 0 ? sharedSettings : undefined;
}
