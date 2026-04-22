import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

const syntaxSemanticsRuleIds = [
  "GHA004",
  "GHA005",
  "GHA006",
  "GHA007",
  "GHA008",
  "GHA009",
  "GHA010",
  "GHA011",
  "GHA012",
  "GHA013",
  "GHA014",
  "GHA015",
  "GHA016",
  "GHA017",
] as const;

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

function analyzeRule(ruleId: (typeof syntaxSemanticsRuleIds)[number], content: string) {
  return analyzeWorkflowFiles(
    [createInput(`.github/workflows/${ruleId.toLowerCase()}.yml`, content)],
    {
      enabledRuleIds: [ruleId],
    },
  );
}

describe("syntax and semantics rule pack", () => {
  it("emits GHA004 when the top-level on key is missing", () => {
    const report = analyzeRule(
      "GHA004",
      `name: Missing On
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA004",
      severity: "high",
    });
  });

  it("emits GHA005 when the top-level jobs key is missing", () => {
    const report = analyzeRule(
      "GHA005",
      `name: Missing Jobs
on: push
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA005",
      severity: "high",
    });
  });

  it("emits GHA006 when jobs is empty", () => {
    const report = analyzeRule(
      "GHA006",
      `name: Empty Jobs
on: push
jobs: {}
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA006",
      severity: "high",
    });
  });

  it("emits GHA007 when a job has neither runs-on nor job-level uses", () => {
    const report = analyzeRule(
      "GHA007",
      `name: Missing Runner
on: push
jobs:
  build:
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      relatedJobs: ["build"],
      ruleId: "GHA007",
      severity: "high",
    });
  });

  it("emits GHA008 when a step defines both run and uses", () => {
    const report = analyzeRule(
      "GHA008",
      `name: Step Conflict
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        run: echo nope
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA008",
      severity: "high",
    });
  });

  it("emits GHA009 when a step defines neither run nor uses", () => {
    const report = analyzeRule(
      "GHA009",
      `name: Empty Step
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Placeholder
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA009",
      severity: "medium",
    });
  });

  it("emits GHA010 when a step uses value is malformed", () => {
    const report = analyzeRule(
      "GHA010",
      `name: Bad Uses
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA010",
      severity: "medium",
    });
  });

  it("emits GHA011 when needs references an unknown job", () => {
    const report = analyzeRule(
      "GHA011",
      `name: Unknown Needs
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      relatedJobs: ["test", "build"],
      ruleId: "GHA011",
      severity: "high",
    });
  });

  it("emits GHA012 when duplicate job ids are declared", () => {
    const report = analyzeRule(
      "GHA012",
      `name: Duplicate Jobs
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo first
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo second
`,
    );

    expect(report.findings[0]).toMatchObject({
      relatedJobs: ["build"],
      ruleId: "GHA012",
      severity: "high",
    });
  });

  it("emits GHA013 for invalid permission scopes and access levels", () => {
    const report = analyzeWorkflowFiles(
      [
        createInput(
          ".github/workflows/permissions.yml",
          `name: Bad Permissions
on: push
permissions:
  id-token: read
  typo-scope: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`,
        ),
      ],
      {
        enabledRuleIds: ["GHA013"],
      },
    );

    expect(report.findings.map((finding) => [finding.ruleId, finding.severity])).toEqual([
      ["GHA013", "high"],
      ["GHA013", "medium"],
    ]);
  });

  it("emits GHA014 for invalid runs-on values", () => {
    const report = analyzeRule(
      "GHA014",
      `name: Bad Runs On
on: push
jobs:
  build:
    runs-on: []
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA014",
      severity: "medium",
    });
  });

  it("emits GHA015 for invalid timeout values", () => {
    const report = analyzeRule(
      "GHA015",
      `name: Bad Timeout
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 0
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA015",
      severity: "medium",
    });
  });

  it("emits GHA016 when a reusable workflow caller mixes incompatible fields", () => {
    const report = analyzeRule(
      "GHA016",
      `name: Mixed Caller
on: workflow_dispatch
jobs:
  deploy:
    uses: org/platform/.github/workflows/deploy.yml@v1
    runs-on: ubuntu-latest
    steps:
      - run: echo nope
`,
    );

    expect(report.findings[0]).toMatchObject({
      relatedJobs: ["deploy"],
      ruleId: "GHA016",
      severity: "high",
    });
  });

  it("emits GHA017 for suspicious workflow key typos", () => {
    const report = analyzeRule(
      "GHA017",
      `name: Typo
on: push
job:
  build:
    runs_on: ubuntu-latest
    steps:
      - run: echo ok
`,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA017",
      severity: "medium",
    });
  });

  it("does not emit syntax or semantics findings for valid workflows", () => {
    const report = analyzeWorkflowFiles(
      [
        createInput(
          ".github/workflows/valid.yml",
          `name: Valid
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: []
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`,
        ),
        createInput(
          ".github/workflows/reusable.yml",
          `name: Reusable Caller
on: workflow_dispatch
jobs:
  deploy:
    uses: org/platform/.github/workflows/deploy.yml@v2
    with:
      environment: production
    secrets: inherit
`,
        ),
      ],
      {
        enabledRuleIds: [...syntaxSemanticsRuleIds],
      },
    );

    expect(report.findings).toEqual([]);
  });

  it("handles multiple files by reporting only the invalid workflow", () => {
    const report = analyzeWorkflowFiles(
      [
        createInput(
          ".github/workflows/invalid.yml",
          `name: Invalid
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - run: echo ok
`,
        ),
        createInput(
          ".github/workflows/valid.yml",
          `name: Valid
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
        ),
      ],
      {
        enabledRuleIds: [...syntaxSemanticsRuleIds],
      },
    );

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.filePath).toBe(".github/workflows/invalid.yml");
    expect(report.findings[0]?.ruleId).toBe("GHA011");
  });
});
