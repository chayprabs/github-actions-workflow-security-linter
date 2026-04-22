import { describe, expect, it } from "vitest";

import { matrixWorkflowFixtures } from "@/features/actions-analyzer/fixtures/matrix-workflows";
import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

type MatrixRuleId = "GHA407" | "GHA412" | "GHA413" | "GHA414";

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

function analyzeMatrixRule(
  ruleId: MatrixRuleId,
  content: string,
  settings: Parameters<typeof analyzeWorkflowFiles>[1] = {},
) {
  return analyzeWorkflowFiles(
    [createInput(`.github/workflows/${ruleId.toLowerCase()}.yml`, content)],
    {
      ...settings,
      enabledRuleIds: [ruleId],
    },
  );
}

describe("matrix rules", () => {
  it("emits GHA407 using the real static expansion count", () => {
    const report = analyzeMatrixRule(
      "GHA407",
      matrixWorkflowFixtures.largeStaticMatrix,
    );

    expect(report.matrixSummary).toMatchObject({
      maxCombinations: 18,
      totalJobs: 1,
    });
    expect(report.matrixSummary.jobs[0]).toMatchObject({
      axisNames: ["os", "node", "pnpm"],
      baseCombinationCount: 18,
      failFast: false,
      finalCombinationCount: 18,
      jobId: "test",
      maxParallel: 3,
    });
    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA407",
      severity: "low",
    });
    expect(report.findings[0]?.message).toContain(
      "18 static matrix combinations",
    );
  });

  it("emits GHA412 for unmatched include and exclude entries", () => {
    const report = analyzeMatrixRule(
      "GHA412",
      matrixWorkflowFixtures.unmatchedIncludeExclude,
    );

    expect(report.findings).toHaveLength(2);
    expect(report.findings.map((finding) => finding.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("`exclude` entry"),
        expect.stringContaining("`include` entry"),
      ]),
    );
  });

  it("emits GHA413 when exclusions leave the matrix empty", () => {
    const report = analyzeMatrixRule(
      "GHA413",
      matrixWorkflowFixtures.emptyAfterExclude,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA413",
      severity: "high",
    });
    expect(report.matrixSummary.jobs[0]?.finalCombinationCount).toBe(0);
  });

  it("emits GHA414 for unresolved dynamic matrices", () => {
    const report = analyzeMatrixRule(
      "GHA414",
      matrixWorkflowFixtures.dynamicMatrix,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA414",
      severity: "low",
    });
    expect(report.findings[0]?.message).toContain(
      "cannot be expanded statically",
    );
    expect(report.matrixSummary.jobs[0]?.isUnresolved).toBe(true);
  });
});
