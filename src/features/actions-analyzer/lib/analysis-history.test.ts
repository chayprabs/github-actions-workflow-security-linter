import { describe, expect, it } from "vitest";

import { sampleAnalysisReport } from "@/features/actions-analyzer/fixtures/reports";
import {
  appendStoredAnalysisHistory,
  buildRecentAnalysisHistoryEntry,
  canReloadHistoryEntry,
} from "@/features/actions-analyzer/lib/analysis-history";

describe("analysis history", () => {
  it("stores metadata only by default", () => {
    const entry = buildRecentAnalysisHistoryEntry({
      rememberWorkflowContent: false,
      report: {
        ...sampleAnalysisReport,
        files: [
          {
            ...sampleAnalysisReport.files[0]!,
            sourceKind: "github",
            sourceMetadata: {
              githubImportUrl: "https://github.com/octo-org/example-repo",
              githubPath: ".github/workflows/ci.yml",
              githubRef: "main",
            },
          },
        ],
      },
    });

    expect(entry.rememberedFiles).toBeUndefined();
    expect(entry.githubImports).toEqual([
      {
        importUrl: "https://github.com/octo-org/example-repo",
        ref: "main",
        remotePath: ".github/workflows/ci.yml",
        workspacePath: sampleAnalysisReport.files[0]!.path,
      },
    ]);
  });

  it("stores workflow content only when explicitly enabled", () => {
    const entry = buildRecentAnalysisHistoryEntry({
      rememberWorkflowContent: true,
      report: sampleAnalysisReport,
      selectedSampleId: "risky-pull-request-target",
    });

    expect(entry.rememberedFiles).toBeDefined();
    expect(entry.rememberedFiles).toHaveLength(
      sampleAnalysisReport.files.length,
    );
    expect(canReloadHistoryEntry(entry)).toBe(true);
  });

  it("keeps sample and public GitHub entries reloadable without content", () => {
    const sampleEntry = buildRecentAnalysisHistoryEntry({
      rememberWorkflowContent: false,
      report: sampleAnalysisReport,
      selectedSampleId: "risky-pull-request-target",
    });
    const githubEntry = buildRecentAnalysisHistoryEntry({
      rememberWorkflowContent: false,
      report: {
        ...sampleAnalysisReport,
        files: sampleAnalysisReport.files.map((file) => ({
          ...file,
          sourceKind: "github",
          sourceMetadata: {
            githubImportUrl: "https://github.com/octo-org/example-repo",
            githubPath: file.path,
            githubRef: "main",
          },
        })),
      },
    });

    expect(canReloadHistoryEntry(sampleEntry)).toBe(true);
    expect(canReloadHistoryEntry(githubEntry)).toBe(true);
  });

  it("deduplicates repeated history entries while keeping newest first", () => {
    const firstEntry = buildRecentAnalysisHistoryEntry({
      rememberWorkflowContent: false,
      report: sampleAnalysisReport,
    });
    const secondEntry = buildRecentAnalysisHistoryEntry({
      rememberWorkflowContent: false,
      report: {
        ...sampleAnalysisReport,
        generatedAt: "2026-04-23T13:00:00.000Z",
        summary: {
          ...sampleAnalysisReport.summary,
          score: sampleAnalysisReport.summary.score - 5,
        },
      },
    });

    const history = appendStoredAnalysisHistory([firstEntry], firstEntry);
    const nextHistory = appendStoredAnalysisHistory(history, secondEntry);

    expect(history).toHaveLength(1);
    expect(nextHistory).toHaveLength(2);
    expect(nextHistory[0]?.timestamp).toBe("2026-04-23T13:00:00.000Z");
  });
});
