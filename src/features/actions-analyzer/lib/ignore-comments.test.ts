import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function analyze(content: string) {
  return analyzeWorkflowFiles(
    [
      createWorkflowInputFile({
        content,
        path: ".github/workflows/ignore.yml",
        sourceKind: "sample",
      }),
    ],
    {
      enabledRuleIds: ["GHA401", "GHA901"],
    },
  );
}

describe("ignore comments", () => {
  it("suppresses one matching finding and keeps other findings active", () => {
    const report = analyze(`name: Ignore
on: push
jobs:
  # authos-ignore GHA401: this benchmark intentionally runs without a timeout
  build:
    runs-on: ubuntu-latest
  test:
    runs-on: ubuntu-latest
`);

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      relatedJobs: ["test"],
      ruleId: "GHA401",
    });
    expect(report.ignoredFindings).toMatchObject([
      {
        finding: {
          relatedJobs: ["build"],
          ruleId: "GHA401",
        },
        reason: "this benchmark intentionally runs without a timeout",
      },
    ]);
  });

  it("creates GHA901 when the ignore comment omits a reason", () => {
    const report = analyze(`name: Ignore
on: push
jobs:
  # authos-ignore GHA401
  build:
    runs-on: ubuntu-latest
`);

    expect(report.ignoredFindings).toEqual([]);
    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      "GHA901",
      "GHA401",
    ]);
  });
});
