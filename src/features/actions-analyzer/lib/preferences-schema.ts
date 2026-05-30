import { z } from "zod";

import type { AnalyzerWorkspacePreferences } from "@/features/actions-analyzer/lib/analyzer-preferences";

const ruleIdSchema = z
  .string()
  .regex(/^GHA\d{3}$/u)
  .max(7);

const fallbackPreferences: AnalyzerWorkspacePreferences = {
  analyzer: {
    allowSelfHostedOnPullRequest: false,
    detectSecretsInInput: true,
    disabledRuleIds: [],
    maxMatrixCombinationsBeforeWarning: 16,
    profile: "balanced",
    requireShaPinning: true,
    warnOnMissingTopLevelPermissions: true,
  },
  theme: "light",
  ui: {
    autoRunAnalysis: true,
    rememberReportSnapshots: false,
    rememberWorkflowContent: false,
    softWrapEditor: true,
  },
};

const analyzerProfileSchema = z.enum([
  "balanced",
  "strict-security",
  "open-source",
  "private-app",
  "deploy-release",
]);

const themePreferenceSchema = z.enum(["system", "light", "dark"]);

export const analyzerWorkspacePreferencesSchema = z.object({
  analyzer: z.object({
    allowSelfHostedOnPullRequest: z.boolean(),
    detectSecretsInInput: z.boolean(),
    maxMatrixCombinationsBeforeWarning: z.number().int().min(1),
    profile: analyzerProfileSchema,
    requireShaPinning: z.boolean(),
    warnOnMissingTopLevelPermissions: z.boolean(),
    disabledRuleIds: z.array(ruleIdSchema).max(80),
  }),
  theme: themePreferenceSchema,
  ui: z.object({
    autoRunAnalysis: z.boolean(),
    rememberReportSnapshots: z.boolean(),
    rememberWorkflowContent: z.boolean(),
    softWrapEditor: z.boolean(),
  }),
});

export function parseAnalyzerWorkspacePreferences(
  value: unknown,
): AnalyzerWorkspacePreferences {
  const parsed = analyzerWorkspacePreferencesSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  return fallbackPreferences;
}
