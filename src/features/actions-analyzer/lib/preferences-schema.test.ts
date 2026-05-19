import { describe, expect, it } from "vitest";

import { defaultAnalyzerWorkspacePreferences } from "@/features/actions-analyzer/lib/analyzer-preferences";
import { parseAnalyzerWorkspacePreferences } from "@/features/actions-analyzer/lib/preferences-schema";

describe("parseAnalyzerWorkspacePreferences", () => {
  it("returns defaults for invalid payloads", () => {
    expect(parseAnalyzerWorkspacePreferences(null)).toEqual(
      defaultAnalyzerWorkspacePreferences,
    );
    expect(parseAnalyzerWorkspacePreferences({ analyzer: "bad" })).toEqual(
      defaultAnalyzerWorkspacePreferences,
    );
  });

  it("accepts valid stored preferences", () => {
    const valid = {
      analyzer: {
        ...defaultAnalyzerWorkspacePreferences.analyzer,
        allowSelfHostedOnPullRequest: false,
        maxMatrixCombinationsBeforeWarning: 32,
        profile: "strict-security",
      },
      theme: "dark" as const,
      ui: {
        ...defaultAnalyzerWorkspacePreferences.ui,
        autoRunAnalysis: false,
        rememberWorkflowContent: true,
        softWrapEditor: false,
      },
    };

    expect(parseAnalyzerWorkspacePreferences(valid)).toEqual(valid);
  });

  it("rejects out-of-range matrix thresholds", () => {
    expect(
      parseAnalyzerWorkspacePreferences({
        ...defaultAnalyzerWorkspacePreferences,
        analyzer: {
          ...defaultAnalyzerWorkspacePreferences.analyzer,
          maxMatrixCombinationsBeforeWarning: 0,
        },
      }),
    ).toEqual(defaultAnalyzerWorkspacePreferences);
  });
});
