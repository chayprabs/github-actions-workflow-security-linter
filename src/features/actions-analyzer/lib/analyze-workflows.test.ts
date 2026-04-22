import { describe, expect, it } from "vitest";

import { matrixWorkflowFixtures } from "@/features/actions-analyzer/fixtures/matrix-workflows";
import {
  analyzeWorkflowFiles,
  applyRuleSettings,
  createEmptyReport,
} from "@/features/actions-analyzer/lib/analyze-workflows";
import { registeredRuleModules } from "@/features/actions-analyzer/lib/rules";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

describe("createEmptyReport", () => {
  it("returns an empty-ish report with resolved settings", () => {
    const report = createEmptyReport();

    expect(report.files).toEqual([]);
    expect(report.findings).toEqual([]);
    expect(report.expressionSummary).toEqual({
      contexts: [],
      totalExpressions: 0,
      unknownContexts: [],
      untrustedContextUsages: 0,
    });
    expect(report.securitySummary).toEqual({
      criticalFindings: 0,
      highFindings: 0,
      totalFindings: 0,
    });
    expect(report.summary.totalFindings).toBe(0);
    expect(report.summary.score).toBe(100);
  });
});

describe("applyRuleSettings", () => {
  it("filters the rule registry by enabled and disabled ids", () => {
    expect(
      applyRuleSettings(registeredRuleModules, {
        enabledRuleIds: ["GHA900"],
      }).map((rule) => rule.definition.id),
    ).toEqual(["GHA900"]);

    expect(
      applyRuleSettings(registeredRuleModules, {
        disabledRuleIds: ["GHA900"],
      }).map((rule) => rule.definition.id),
    ).not.toContain("GHA900");
  });
});

describe("analyzeWorkflowFiles", () => {
  it("returns an empty-ish report for no files by default", () => {
    const report = analyzeWorkflowFiles([]);

    expect(report.findings).toEqual([]);
    expect(report.summary).toMatchObject({
      analyzedFileCount: 0,
      score: 100,
      totalFindings: 0,
      workflowCount: 0,
    });
  });

  it("emits the GHA900 smoke finding only when explicitly enabled for empty input", () => {
    const report = analyzeWorkflowFiles([], {
      includeEmptyInputFinding: true,
    });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      category: "maintainability",
      filePath: "<workspace>",
      ruleId: "GHA900",
      severity: "info",
    });
  });

  it("includes YAML parse findings in the final report", () => {
    const report = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/broken.yml",
        `name: Broken
on:
  push
jobs:
  build
    runs-on: ubuntu-latest
`,
      ),
    ]);

    expect(report.findings.map((finding) => finding.ruleId)).toContain(
      "GHA001",
    );
    expect(report.expressionSummary.totalExpressions).toBe(0);
    expect(report.summary.totalFindings).toBeGreaterThan(0);
  });

  it("respects disabled rule ids for parse findings", () => {
    const report = analyzeWorkflowFiles(
      [
        createInput(
          ".github/workflows/broken.yml",
          `name: Broken
on:
  push
jobs:
  build
    runs-on: ubuntu-latest
`,
        ),
      ],
      {
        disabledRuleIds: ["GHA001"],
      },
    );

    expect(report.findings.map((finding) => finding.ruleId)).not.toContain(
      "GHA001",
    );
  });

  it("changes score based on findings", () => {
    const cleanReport = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/clean.yml",
        `name: Clean
on: push
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`,
      ),
    ]);
    const brokenReport = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/broken.yml",
        `name: Broken
on:
  push
jobs:
  build
    runs-on: ubuntu-latest
`,
      ),
    ]);

    expect(cleanReport.summary.score).toBe(100);
    expect(brokenReport.summary.score).toBeLessThan(cleanReport.summary.score);
  });

  it("does not crash when multiple files are analyzed together", () => {
    const report = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/ci.yml",
        `name: CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`,
      ),
      createInput(
        ".github/workflows/reusable.yml",
        `name: Reusable
on: workflow_dispatch
jobs:
  deploy:
    uses: org/platform/.github/workflows/deploy.yml@v2
    with:
      environment: production
`,
      ),
      createInput(
        ".github/workflows/broken.yml",
        `name: Broken
jobs:
  build
    runs-on: ubuntu-latest
`,
      ),
    ]);

    expect(report.files).toHaveLength(3);
    expect(report.summary.analyzedFileCount).toBe(3);
    expect(report.summary.workflowCount).toBeGreaterThanOrEqual(1);
  });

  it("populates matrix summaries with static preview details per job", () => {
    const report = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/matrix.yml",
        matrixWorkflowFixtures.largeStaticMatrix,
      ),
    ]);

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
    expect(report.matrixSummary.jobs[0]?.sampleCombinations).toHaveLength(18);
  });
});
