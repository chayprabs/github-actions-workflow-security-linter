import { describe, expect, it } from "vitest";

import {
  defaultAnalyzerWorkspacePreferences,
  readStoredAnalyzerWorkspacePreferences,
  sanitizeAnalyzerWorkspacePreferences,
  writeStoredAnalyzerWorkspacePreferences,
} from "@/features/actions-analyzer/lib/analyzer-preferences";

describe("analyzer preferences", () => {
  it("round-trips stored preferences through localStorage", () => {
    window.localStorage.clear();

    writeStoredAnalyzerWorkspacePreferences({
      analyzer: {
        ...defaultAnalyzerWorkspacePreferences.analyzer,
        profile: "strict-security",
        requireShaPinning: false,
      },
      theme: "dark",
      ui: {
        autoRunAnalysis: false,
        rememberWorkflowContent: true,
        softWrapEditor: false,
      },
    });

    expect(readStoredAnalyzerWorkspacePreferences()).toMatchObject({
      analyzer: {
        profile: "strict-security",
        requireShaPinning: false,
      },
      theme: "dark",
      ui: {
        autoRunAnalysis: false,
        rememberWorkflowContent: true,
        softWrapEditor: false,
      },
    });
  });

  it("falls back to safe defaults for invalid stored values", () => {
    expect(
      sanitizeAnalyzerWorkspacePreferences({
        analyzer: {
          maxMatrixCombinationsBeforeWarning: "bad",
          profile: "not-a-real-profile",
          requireShaPinning: "yes",
        },
        theme: "neon",
        ui: {
          autoRunAnalysis: "sometimes",
          rememberWorkflowContent: null,
          softWrapEditor: "wrapped",
        },
      }),
    ).toEqual(defaultAnalyzerWorkspacePreferences);
  });
});
