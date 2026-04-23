import { defaultAnalyzerSettings } from "@/features/actions-analyzer/lib/settings";
import type {
  AnalyzerProfile,
  AnalyzerSettings,
} from "@/features/actions-analyzer/types";

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
  >;
  theme: ThemePreference;
  ui: AnalyzerUiPreferences;
}

const analyzerPreferencesStorageKey = "authos.actions-analyzer.preferences.v1";

export const defaultAnalyzerUiPreferences: AnalyzerUiPreferences = {
  autoRunAnalysis: true,
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
  if (!value || typeof value !== "object") {
    return defaultAnalyzerWorkspacePreferences;
  }

  const candidate = value as Partial<AnalyzerWorkspacePreferences>;
  const analyzerCandidate =
    candidate.analyzer && typeof candidate.analyzer === "object"
      ? (candidate.analyzer as Partial<
          AnalyzerWorkspacePreferences["analyzer"]
        >)
      : {};
  const uiCandidate =
    candidate.ui && typeof candidate.ui === "object"
      ? (candidate.ui as Partial<AnalyzerUiPreferences>)
      : {};

  return {
    analyzer: {
      allowSelfHostedOnPullRequest:
        typeof analyzerCandidate.allowSelfHostedOnPullRequest === "boolean"
          ? analyzerCandidate.allowSelfHostedOnPullRequest
          : defaultAnalyzerWorkspacePreferences.analyzer
              .allowSelfHostedOnPullRequest,
      detectSecretsInInput:
        typeof analyzerCandidate.detectSecretsInInput === "boolean"
          ? analyzerCandidate.detectSecretsInInput
          : defaultAnalyzerWorkspacePreferences.analyzer.detectSecretsInInput,
      maxMatrixCombinationsBeforeWarning: sanitizePositiveNumber(
        analyzerCandidate.maxMatrixCombinationsBeforeWarning,
        defaultAnalyzerWorkspacePreferences.analyzer
          .maxMatrixCombinationsBeforeWarning,
      ),
      profile: isAnalyzerProfile(analyzerCandidate.profile)
        ? analyzerCandidate.profile
        : defaultAnalyzerWorkspacePreferences.analyzer.profile,
      requireShaPinning:
        typeof analyzerCandidate.requireShaPinning === "boolean"
          ? analyzerCandidate.requireShaPinning
          : defaultAnalyzerWorkspacePreferences.analyzer.requireShaPinning,
      warnOnMissingTopLevelPermissions:
        typeof analyzerCandidate.warnOnMissingTopLevelPermissions === "boolean"
          ? analyzerCandidate.warnOnMissingTopLevelPermissions
          : defaultAnalyzerWorkspacePreferences.analyzer
              .warnOnMissingTopLevelPermissions,
    },
    theme: isThemePreference(candidate.theme)
      ? candidate.theme
      : defaultAnalyzerWorkspacePreferences.theme,
    ui: {
      autoRunAnalysis:
        typeof uiCandidate.autoRunAnalysis === "boolean"
          ? uiCandidate.autoRunAnalysis
          : defaultAnalyzerWorkspacePreferences.ui.autoRunAnalysis,
      rememberWorkflowContent:
        typeof uiCandidate.rememberWorkflowContent === "boolean"
          ? uiCandidate.rememberWorkflowContent
          : defaultAnalyzerWorkspacePreferences.ui.rememberWorkflowContent,
      softWrapEditor:
        typeof uiCandidate.softWrapEditor === "boolean"
          ? uiCandidate.softWrapEditor
          : defaultAnalyzerWorkspacePreferences.ui.softWrapEditor,
    },
  };
}

function sanitizePositiveNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value));
}

function isAnalyzerProfile(value: unknown): value is AnalyzerProfile {
  return (
    value === "balanced" ||
    value === "strict-security" ||
    value === "open-source" ||
    value === "private-app" ||
    value === "deploy-release"
  );
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}
