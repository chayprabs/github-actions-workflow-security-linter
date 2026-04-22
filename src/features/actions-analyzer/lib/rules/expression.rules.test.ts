import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

const expressionRuleIds = [
  "GHA050",
  "GHA051",
  "GHA052",
  "GHA053",
  "GHA054",
  "GHA055",
] as const;

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

function analyzeRule(
  ruleId: (typeof expressionRuleIds)[number],
  content: string,
) {
  return analyzeWorkflowFiles(
    [createInput(`.github/workflows/${ruleId.toLowerCase()}.yml`, content)],
    {
      enabledRuleIds: [ruleId],
    },
  );
}

describe("expression rules", () => {
  it("emits GHA050 for malformed or unclosed expressions", () => {
    const report = analyzeRule(
      "GHA050",
      `name: Broken Expression
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    if: \${{ github.ref
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      evidence: "${{ github.ref",
      ruleId: "GHA050",
      severity: "high",
    });
  });

  it("emits GHA051 for unknown expression contexts", () => {
    const report = analyzeRule(
      "GHA051",
      `name: Unknown Context
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    if: \${{ mystery.flag }}
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      evidence: "${{ mystery.flag }}",
      ruleId: "GHA051",
      severity: "medium",
    });
  });

  it("emits GHA052 when secrets are used directly in if conditionals", () => {
    const report = analyzeRule(
      "GHA052",
      `name: Secrets In If
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    if: \${{ secrets.DEPLOY_TOKEN != '' }}
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      evidence: "${{ secrets.DEPLOY_TOKEN != '' }}",
      ruleId: "GHA052",
      severity: "medium",
    });
  });

  it("emits GHA053 when matrix context is used without strategy.matrix", () => {
    const report = analyzeRule(
      "GHA053",
      `name: Matrix Outside Matrix
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    name: Build \${{ matrix.os }}
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      evidence: "${{ matrix.os }}",
      ruleId: "GHA053",
      severity: "medium",
    });
  });

  it("emits GHA054 when needs references an unknown job in an expression", () => {
    const report = analyzeRule(
      "GHA054",
      `name: Unknown Needs Expression
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    if: \${{ needs.build.outputs.ready == 'true' }}
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      evidence: "${{ needs.build.outputs.ready == 'true' }}",
      ruleId: "GHA054",
      severity: "high",
    });
  });

  it("emits GHA055 for untrusted GitHub event data used outside env boundaries", () => {
    const report = analyzeRule(
      "GHA055",
      `name: Untrusted Event
on: issue_comment
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "\${{ github.event.comment.body }}"
`,
    );

    expect(report.findings[0]).toMatchObject({
      evidence: "${{ github.event.comment.body }}",
      ruleId: "GHA055",
      severity: "medium",
    });
  });

  it("does not emit expression findings for a valid expression workflow", () => {
    const report = analyzeWorkflowFiles(
      [
        createInput(
          ".github/workflows/valid-expressions.yml",
          `name: Valid Expressions
on: push
env:
  BRANCH_NAME: \${{ github.ref_name }}
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        os: [ubuntu-latest]
    if: github.ref == 'refs/heads/main'
    steps:
      - env:
          COMMENT_BODY: \${{ github.event.comment.body }}
        run: echo "$COMMENT_BODY"
      - uses: actions/checkout@v4
      - run: echo "\${{ matrix.os }}"
`,
        ),
      ],
      {
        enabledRuleIds: [...expressionRuleIds],
      },
    );

    expect(report.findings).toEqual([]);
    expect(report.expressionSummary.totalExpressions).toBeGreaterThan(0);
  });

  it("handles multiple files without crashing and isolates the invalid file", () => {
    const report = analyzeWorkflowFiles(
      [
        createInput(
          ".github/workflows/bad.yml",
          `name: Bad
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    if: \${{ unknown.flag }}
    steps:
      - run: echo ok
`,
        ),
        createInput(
          ".github/workflows/good.yml",
          `name: Good
on: workflow_dispatch
jobs:
  deploy:
    uses: org/platform/.github/workflows/deploy.yml@v1
`,
        ),
      ],
      {
        enabledRuleIds: [...expressionRuleIds],
      },
    );

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.filePath).toBe(".github/workflows/bad.yml");
    expect(report.findings[0]?.ruleId).toBe("GHA051");
  });
});
