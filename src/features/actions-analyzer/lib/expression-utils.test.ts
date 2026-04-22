import { describe, expect, it } from "vitest";

import {
  buildExpressionSummary,
  collectExpressionsFromWorkflow,
  containsUntrustedContext,
  extractExpressionContexts,
  extractExpressionsFromString,
  hydrateWorkflowExpressions,
  isProbablyExpression,
} from "@/features/actions-analyzer/lib/expression-utils";
import { normalizeParsedWorkflow } from "@/features/actions-analyzer/lib/normalize-workflow";
import { parseWorkflowYaml } from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function createNormalizedWorkflow(path: string, content: string) {
  const parsedFile = parseWorkflowYaml(
    createWorkflowInputFile({
      content,
      path,
      sourceKind: "sample",
    }),
  );

  return {
    normalizedWorkflow: normalizeParsedWorkflow(parsedFile),
    parsedFile,
  };
}

describe("extractExpressionsFromString", () => {
  it("extracts wrapped expressions and preserves best-effort locations", () => {
    const expressions = extractExpressionsFromString(
      "echo ${{ github.ref }}\n${{ matrix.os }}",
      {
        filePath: ".github/workflows/test.yml",
        line: 10,
        column: 7,
        endLine: 11,
        endColumn: 16,
      },
    );

    expect(expressions).toHaveLength(2);
    expect(expressions[0]).toMatchObject({
      expressionText: "github.ref",
      rawExpression: "${{ github.ref }}",
      startOffset: 5,
    });
    expect(expressions[1]?.location).toMatchObject({
      line: 11,
      column: 1,
    });
  });

  it("marks unclosed expressions as malformed", () => {
    expect(extractExpressionsFromString("${{ github.ref ")[0]).toMatchObject({
      expressionText: "github.ref",
      isClosed: false,
      isMalformed: true,
    });
  });
});

describe("expression context helpers", () => {
  it("extracts contexts, functions, references, and unknown roots", () => {
    expect(
      extractExpressionContexts(
        "contains(needs.build.outputs.result, github.ref_name) && mystery.flag",
      ),
    ).toEqual({
      contexts: ["github", "needs"],
      functions: ["contains"],
      references: [
        "github.ref_name",
        "mystery.flag",
        "needs.build.outputs.result",
      ],
      unknownContexts: ["mystery"],
    });
  });

  it("detects likely expressions and untrusted GitHub contexts", () => {
    expect(isProbablyExpression("github.ref == 'refs/heads/main'")).toBe(true);
    expect(isProbablyExpression("plain display name")).toBe(false);
    expect(
      containsUntrustedContext("github.event.pull_request.title"),
    ).toBe(true);
    expect(containsUntrustedContext("github.repository")).toBe(false);
  });
});

describe("collectExpressionsFromWorkflow", () => {
  it("collects expressions from if, run, with, env, name, and uses fields", () => {
    const { normalizedWorkflow, parsedFile } = createNormalizedWorkflow(
      ".github/workflows/expressions.yml",
      `name: Build \${{ github.ref_name }}
on: push
env:
  BRANCH_NAME: \${{ github.ref_name }}
jobs:
  build:
    if: github.ref == 'refs/heads/main'
    runs-on: \${{ matrix.os }}
    env:
      PR_TITLE: \${{ github.event.pull_request.title }}
    strategy:
      matrix:
        os: [ubuntu-latest]
    steps:
      - name: Step \${{ matrix.os }}
        with:
          artifact-name: \${{ format('artifact-{0}', matrix.os) }}
        uses: actions/checkout@\${{ github.ref_name }}
      - run: echo "\${{ github.event.comment.body }}"
`,
    );
    const hydratedExpressions = hydrateWorkflowExpressions(
      collectExpressionsFromWorkflow(normalizedWorkflow),
      parsedFile.sourceMap.findLocationForPath,
    );

    expect(
      hydratedExpressions.map((expression) => expression.fieldPathLabel),
    ).toEqual(
      expect.arrayContaining([
        "name",
        "env.BRANCH_NAME",
        "jobs.build.if",
        "jobs.build.runs-on",
        "jobs.build.env.PR_TITLE",
        "jobs.build.steps[0].name",
        "jobs.build.steps[0].with.artifact-name",
        "jobs.build.steps[0].uses",
        "jobs.build.steps[1].run",
      ]),
    );
    expect(
      hydratedExpressions.find(
        (expression) => expression.fieldPathLabel === "jobs.build.env.PR_TITLE",
      )?.location,
    ).toMatchObject({
      line: 10,
      column: 17,
    });
  });

  it("builds an expression summary from collected workflow expressions", () => {
    const { normalizedWorkflow } = createNormalizedWorkflow(
      ".github/workflows/summary.yml",
      `name: Summary
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: echo "\${{ github.event.issue.body }}"
      - run: echo "\${{ unknown.flag }}"
`,
    );

    expect(
      buildExpressionSummary(collectExpressionsFromWorkflow(normalizedWorkflow)),
    ).toEqual({
      contexts: ["github"],
      totalExpressions: 3,
      unknownContexts: ["unknown"],
      untrustedContextUsages: 1,
    });
  });
});
