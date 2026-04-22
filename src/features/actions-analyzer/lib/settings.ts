import type { AnalyzerSettings } from "@/features/actions-analyzer/types";

export const defaultAnalyzerSettings: AnalyzerSettings = {
  profile: "balanced",
  requireShaPinning: true,
  warnOnMissingTopLevelPermissions: true,
  allowSelfHostedOnPullRequest: false,
  maxMatrixCombinationsBeforeWarning: 16,
  detectSecretsInInput: true,
  includeEmptyInputFinding: false,
};

export function resolveAnalyzerSettings(
  overrides: Partial<AnalyzerSettings> = {},
): AnalyzerSettings {
  return {
    ...defaultAnalyzerSettings,
    ...overrides,
    enabledRuleIds:
      overrides.enabledRuleIds ?? defaultAnalyzerSettings.enabledRuleIds,
    disabledRuleIds:
      overrides.disabledRuleIds ?? defaultAnalyzerSettings.disabledRuleIds,
  };
}
