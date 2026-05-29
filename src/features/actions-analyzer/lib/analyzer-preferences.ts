import { parseAnalyzerWorkspacePreferences } from "@/features/actions-analyzer/lib/preferences-schema";
import { defaultAnalyzerSettings } from "@/features/actions-analyzer/lib/settings";
import type { AnalyzerSettings } from "@/features/actions-analyzer/types";

export type ThemePreference = "system" | "light" | "dark";

export interface AnalyzerUiPreferences {
  autoRunAnalysis: boolean;
  rememberWorkflowContent: boolean;
  softWrapEditor: boolean;
}

export interface AnalyzerWorkspacePreferences {
  analyzer: Pick<
    AnalyzerSettings,
    | "allowSelfHostedOnPullRequest"
    | "detectSecretsInInput"
    | "maxMatrixCombinationsBeforeWarning"
    | "profile"
    | "requireShaPinning"
    | "warnOnMissingTopLevelPermissions"
  > & {
    disabledRuleIds: string[];
  };
  theme: ThemePreference;
  ui: AnalyzerUiPreferences & {
    rememberReportSnapshots: boolean;
  };
}

const analyzerPreferencesStorageKey = "gha-workflow-analyzer.preferences.v1";

export const defaultAnalyzerUiPreferences: AnalyzerUiPreferences & {
  rememberReportSnapshots: boolean;
} = {
  autoRunAnalysis: true,
  rememberReportSnapshots: false,
  rememberWorkflowContent: false,
  softWrapEditor: true,
};

export const defaultAnalyzerWorkspacePreferences: AnalyzerWorkspacePreferences =
  {
    analyzer: {
      allowSelfHostedOnPullRequest:
        defaultAnalyzerSettings.allowSelfHostedOnPullRequest,
      detectSecretsInInput: defaultAnalyzerSettings.detectSecretsInInput,
      maxMatrixCombinationsBeforeWarning:
        defaultAnalyzerSettings.maxMatrixCombinationsBeforeWarning,
      profile: defaultAnalyzerSettings.profile,
      requireShaPinning: defaultAnalyzerSettings.requireShaPinning,
      warnOnMissingTopLevelPermissions:
        defaultAnalyzerSettings.warnOnMissingTopLevelPermissions,
      disabledRuleIds: [],
    },
    theme: "system",
    ui: defaultAnalyzerUiPreferences,
  };

export function readStoredAnalyzerWorkspacePreferences() {
  if (typeof window === "undefined") {
    return defaultAnalyzerWorkspacePreferences;
  }

  try {
    const rawValue = window.localStorage.getItem(analyzerPreferencesStorageKey);

    if (!rawValue) {
      return defaultAnalyzerWorkspacePreferences;
    }

    return sanitizeAnalyzerWorkspacePreferences(JSON.parse(rawValue));
  } catch {
    return defaultAnalyzerWorkspacePreferences;
  }
}

export function writeStoredAnalyzerWorkspacePreferences(
  preferences: AnalyzerWorkspacePreferences,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    analyzerPreferencesStorageKey,
    JSON.stringify(preferences),
  );
}

export function toAnalyzerSettings(
  preferences: AnalyzerWorkspacePreferences,
): Partial<AnalyzerSettings> {
  return {
    ...preferences.analyzer,
  };
}

export function sanitizeAnalyzerWorkspacePreferences(
  value: unknown,
): AnalyzerWorkspacePreferences {
  return parseAnalyzerWorkspacePreferences(value);
}
