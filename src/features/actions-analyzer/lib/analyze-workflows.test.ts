import { describe, expect, it } from "vitest";

import {
  fixtureWorkflows,
  sampleWorkflowBatch,
} from "@/features/actions-analyzer/fixtures/sample-workflows";
import {
  analyzeWorkflow,
  analyzeWorkflows,
} from "@/features/actions-analyzer/lib/analyze-workflows";

describe("analyzeWorkflow", () => {
  it("returns a clean result for the hardened fixture", () => {
    const result = analyzeWorkflow(fixtureWorkflows.hardened);

    expect(result.isValid).toBe(true);
    expect(result.findings).toHaveLength(0);
    expect(result.score).toBe(100);
    expect(result.summary.hasExplicitPermissions).toBe(true);
    expect(result.summary.triggers).toEqual(["push", "pull_request"]);
    expect(result.summary.matrixJobs).toEqual(["test"]);
  });

  it("flags risky patterns with stable rule ids", () => {
    const result = analyzeWorkflow(fixtureWorkflows.risky);

    expect(result.isValid).toBe(true);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      "GHA201",
      "GHA201",
      "GHA101",
      "GHA401",
    ]);
    expect(result.score).toBe(73);
    expect(result.summary.actionInventory).toEqual([
      "actions/checkout@main",
      "docker/login-action@master",
    ]);
  });

  it("reports invalid yaml as a syntax finding", () => {
    const result = analyzeWorkflow(fixtureWorkflows.invalid);

    expect(result.isValid).toBe(false);
    expect(result.findings[0]?.ruleId).toBe("GHA001");
    expect(result.findings[0]?.category).toBe("syntax");
  });
});

describe("analyzeWorkflows", () => {
  it("analyzes multiple workflow files deterministically", () => {
    const results = analyzeWorkflows(sampleWorkflowBatch);

    expect(results).toHaveLength(3);
    expect(results.map((result) => result.filePath)).toEqual([
      ".github/workflows/ci-secure.yml",
      ".github/workflows/release-risky.yml",
      ".github/workflows/broken.yml",
    ]);
  });
});
