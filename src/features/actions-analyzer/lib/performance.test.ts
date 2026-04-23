import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function buildLargeSyntheticWorkflow(jobCount = 24, stepsPerJob = 14) {
  const sharedSteps = Array.from({ length: stepsPerJob }, (_, stepIndex) => {
    return `      - run: echo "job step ${stepIndex + 1}"`;
  }).join("\n");
  const jobs = Array.from({ length: jobCount }, (_, jobIndex) => {
    return `  job_${jobIndex + 1}:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
${sharedSteps}`;
  }).join("\n");

  return `name: Large Synthetic Workflow
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  matrix_job:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22, 24]
        shard: [1, 2, 3, 4, 5]
    steps:
      - run: echo "matrix build"
${jobs}
`;
}

describe("analysis performance", () => {
  it(
    "analyzes a large synthetic workflow within a reasonable local budget",
    () => {
      const content = buildLargeSyntheticWorkflow();
      const startTime = performance.now();
      const report = analyzeWorkflowFiles([
        createWorkflowInputFile({
          content,
          path: ".github/workflows/large-synthetic.yml",
          sourceKind: "sample",
        }),
      ]);
      const durationMs = performance.now() - startTime;

      expect(durationMs).toBeLessThan(4000);
      expect(report.summary.jobCount).toBe(25);
      expect(report.findings.map((finding) => finding.ruleId)).toContain(
        "GHA407",
      );
    },
    10_000,
  );
});
