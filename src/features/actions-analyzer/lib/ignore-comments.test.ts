import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function analyze(
  content: string,
  settings: Parameters<typeof analyzeWorkflowFiles>[1] = {
    enabledRuleIds: ["GHA401", "GHA901"],
  },
) {
  return analyzeWorkflowFiles(
    [
      createWorkflowInputFile({
        content,
        path: ".github/workflows/ignore.yml",
        sourceKind: "sample",
      }),
    ],
    settings,
  );
}

describe("ignore comments", () => {
  it("suppresses one matching finding and keeps other findings active", () => {
    const report = analyze(`name: Ignore
on: push
jobs:
  # gha-ignore GHA401: this benchmark intentionally runs without a timeout
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
  # gha-ignore GHA401
  build:
    runs-on: ubuntu-latest
`);

    expect(report.ignoredFindings).toEqual([]);
    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      "GHA901",
      "GHA401",
    ]);
  });

  it("always surfaces GHA901 even when the rule allowlist excludes it", () => {
    const report = analyze(
      `name: Ignore
on: push
jobs:
  # gha-ignore GHA401
  build:
    runs-on: ubuntu-latest
`,
      { enabledRuleIds: ["GHA401"] },
    );

    expect(report.findings.map((finding) => finding.ruleId)).toContain(
      "GHA901",
    );
  });

  it("supports authos-ignore as a legacy alias", () => {
    const report = analyze(`name: Ignore
on: push
jobs:
  # authos-ignore GHA401: legacy alias still works
  build:
    runs-on: ubuntu-latest
  test:
    runs-on: ubuntu-latest
`);

    expect(report.ignoredFindings).toHaveLength(1);
    expect(report.findings).toHaveLength(1);
  });

  it("can suppress workflow-level findings declared after the ignore comment", () => {
    const report = analyze(
      `# gha-ignore GHA100: permissions reviewed for this public repo
name: Public CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
      { enabledRuleIds: ["GHA100", "GHA901"] },
    );

    const permissionFinding = report.findings.find(
      (finding) => finding.ruleId === "GHA100",
    );

    expect(permissionFinding).toBeUndefined();
    expect(
      report.ignoredFindings.some((entry) => entry.finding.ruleId === "GHA100"),
    ).toBe(true);
  });
});
