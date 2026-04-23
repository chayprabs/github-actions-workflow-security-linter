import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

type ReliabilityRuleId =
  | "GHA401"
  | "GHA402"
  | "GHA403"
  | "GHA404"
  | "GHA405";

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

function analyzeReliabilityRule(
  ruleId: ReliabilityRuleId,
  content: string,
) {
  return analyzeWorkflowFiles(
    [createInput(`.github/workflows/${ruleId.toLowerCase()}.yml`, content)],
    {
      enabledRuleIds: [ruleId],
    },
  );
}

describe("reliability rule pack", () => {
  it("emits GHA401 when a job is missing timeout-minutes", () => {
    const report = analyzeReliabilityRule(
      "GHA401",
      `name: Timeout
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA401",
      severity: "low",
      fix: {
        kind: "insert",
        safety: "safe",
      },
    });
  });

  it("emits GHA402 when a deploy-style job is missing concurrency", () => {
    const report = analyzeReliabilityRule(
      "GHA402",
      `name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA402",
      severity: "medium",
      fix: {
        kind: "insert",
        safety: "review",
      },
    });
  });

  it("emits GHA403 when a step sets continue-on-error to true", () => {
    const report = analyzeReliabilityRule(
      "GHA403",
      `name: Continue
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Optional check
        continue-on-error: true
        run: exit 1
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA403",
      severity: "medium",
      fix: {
        kind: "replace",
        safety: "review",
      },
    });
  });

  it("emits GHA404 when a cache key omits dependency fingerprints", () => {
    const report = analyzeReliabilityRule(
      "GHA404",
      `name: Cache
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: node-cache
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA404",
      severity: "medium",
      fix: {
        kind: "manual",
        safety: "manual",
      },
    });
  });

  it("does not emit GHA404 when hashFiles is already present in the cache key", () => {
    const report = analyzeReliabilityRule(
      "GHA404",
      `name: Cache
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: \${{ runner.os }}-deps-\${{ hashFiles('**/package-lock.json') }}
`,
    );

    expect(report.findings).toEqual([]);
  });

  it("emits GHA405 when upload-artifact omits retention-days", () => {
    const report = analyzeReliabilityRule(
      "GHA405",
      `name: Artifacts
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA405",
      severity: "low",
      fix: {
        kind: "insert",
        safety: "safe",
      },
    });
  });
});
