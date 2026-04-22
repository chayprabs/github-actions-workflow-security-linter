import { describe, expect, it } from "vitest";

import { normalizerWorkflowFixtures } from "@/features/actions-analyzer/fixtures/normalizer-workflows";
import {
  normalizeParsedWorkflow,
  normalizeParsedWorkflowFiles,
} from "@/features/actions-analyzer/lib/normalize-workflow";
import { parseWorkflowYaml } from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function createParsedFixture(path: string, content: string) {
  return parseWorkflowYaml(
    createWorkflowInputFile({
      content,
      path,
      sourceKind: "sample",
    }),
  );
}

function normalizeFixture(
  fixture: (typeof normalizerWorkflowFixtures)[keyof typeof normalizerWorkflowFixtures],
) {
  return normalizeParsedWorkflow(
    createParsedFixture(fixture.path, fixture.content),
  );
}

describe("normalizeParsedWorkflow", () => {
  it("normalizes a basic push workflow shorthand", () => {
    const normalized = normalizeFixture(normalizerWorkflowFixtures.basicPush);

    expect(normalized.summary).toEqual({
      jobCount: 1,
      stepCount: 2,
      triggers: ["push"],
      workflowName: "Basic Push",
    });
    expect(normalized.permissions).toMatchObject({
      kind: "mapping",
      scopes: {
        contents: "read",
      },
    });
    expect(normalized.jobs[0]?.steps[0]?.uses).toMatchObject({
      kind: "repository-action",
      owner: "actions",
      ref: "v4",
      repo: "checkout",
    });
  });

  it("normalizes pull_request_target and keeps trigger filters", () => {
    const normalized = normalizeFixture(
      normalizerWorkflowFixtures.pullRequestTarget,
    );

    expect(normalized.on).toHaveLength(1);
    expect(normalized.on[0]).toMatchObject({
      branches: ["main"],
      isKnown: true,
      kind: "pull_request_target",
      name: "pull_request_target",
    });
    expect(normalized.permissions).toMatchObject({
      kind: "shorthand",
      shorthand: "write-all",
    });
  });

  it("normalizes reusable workflow calls at the job level", () => {
    const normalized = normalizeFixture(
      normalizerWorkflowFixtures.reusableWorkflowCall,
    );

    expect(normalized.on[0]).toMatchObject({
      inputs: {
        environment: {
          required: true,
          type: "choice",
        },
      },
      kind: "workflow_dispatch",
      name: "workflow_dispatch",
    });
    expect(normalized.jobs[0]?.reusableWorkflowCall).toMatchObject({
      kind: "repository-reusable-workflow",
      owner: "org",
      ref: "v2",
      repo: "platform",
      workflowPath: ".github/workflows/deploy.yml",
    });
    expect(normalized.jobs[0]?.with.value).toEqual({
      environment: "production",
    });
    expect(normalized.jobs[0]?.secrets.raw).toBe("inherit");
  });

  it("normalizes matrix workflows and mixed trigger object forms", () => {
    const normalized = normalizeFixture(
      normalizerWorkflowFixtures.matrixWorkflow,
    );

    expect(normalized.on.map((trigger) => trigger.name)).toEqual([
      "push",
      "merge_group",
    ]);
    expect(normalized.jobs[0]?.strategy?.matrix).toMatchObject({
      dimensions: {
        node: [18, 20],
        os: ["ubuntu-latest", "windows-latest"],
      },
      include: [
        {
          node: 22,
          os: "ubuntu-latest",
        },
      ],
    });
    expect(normalized.jobs[0]?.steps).toHaveLength(3);
  });

  it("normalizes local and Docker action uses", () => {
    const localAction = normalizeFixture(
      normalizerWorkflowFixtures.localAction,
    );
    const dockerAction = normalizeFixture(
      normalizerWorkflowFixtures.dockerAction,
    );

    expect(localAction.jobs[0]?.steps[0]?.uses).toMatchObject({
      kind: "local-action",
      path: "./actions/review",
    });
    expect(dockerAction.jobs[0]?.steps[0]?.uses).toMatchObject({
      image: "ghcr.io/actions/example",
      kind: "docker-action",
      tag: "1.2.3",
    });
    expect(dockerAction.jobs[0]?.steps[1]?.uses).toMatchObject({
      digest:
        "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      image: "ghcr.io/actions/example",
      kind: "docker-action",
    });
  });

  it("normalizes job needs when declared as a string or an array", () => {
    const normalized = normalizeFixture(
      normalizerWorkflowFixtures.needsStringAndArray,
    );

    expect(normalized.summary.jobCount).toBe(3);
    expect(normalized.jobs.map((job) => [job.id, job.needs.value])).toEqual([
      ["build", ["lint"]],
      ["release", ["build", "test"]],
      ["test", []],
    ]);
  });

  it("keeps unknown trigger names instead of treating them as fatal", () => {
    const normalized = normalizeParsedWorkflow(
      createParsedFixture(
        ".github/workflows/unknown-trigger.yml",
        `name: Unknown Trigger
on:
  repository_dispatch:
    types: [sync]
jobs:
  noop:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`,
      ),
    );

    expect(normalized.on[0]).toMatchObject({
      isKnown: false,
      kind: "unknown",
      name: "repository_dispatch",
      types: ["sync"],
    });
  });

  it("preserves malformed uses values as unknown instead of crashing", () => {
    const normalized = normalizeParsedWorkflow(
      createParsedFixture(
        ".github/workflows/unknown-uses.yml",
        `name: Unknown Uses
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: not a valid uses value
`,
      ),
    );

    expect(normalized.jobs[0]?.steps[0]?.uses).toMatchObject({
      kind: "unknown",
      raw: "not a valid uses value",
    });
  });

  it("does not crash on partially invalid workflows", () => {
    const parsed = createParsedFixture(
      ".github/workflows/broken.yml",
      `name: Broken
on:
  push
jobs:
  build
    runs-on: ubuntu-latest
`,
    );

    const normalized = normalizeParsedWorkflow(parsed);

    expect(parsed.parseFindings).not.toHaveLength(0);
    expect(normalized.filePath).toBe(".github/workflows/broken.yml");
    expect(normalized.summary.workflowName).toBe("Broken");
    expect(normalized.jobsRaw).toBeTypeOf("object");
  });
});

describe("normalizeParsedWorkflowFiles", () => {
  it("normalizes multiple parsed files deterministically", () => {
    const parsedFiles = [
      createParsedFixture(
        normalizerWorkflowFixtures.basicPush.path,
        normalizerWorkflowFixtures.basicPush.content,
      ),
      createParsedFixture(
        normalizerWorkflowFixtures.pullRequestTarget.path,
        normalizerWorkflowFixtures.pullRequestTarget.content,
      ),
    ];

    expect(
      normalizeParsedWorkflowFiles(parsedFiles).map(
        (workflow) => workflow.filePath,
      ),
    ).toEqual([
      ".github/workflows/basic-push.yml",
      ".github/workflows/pr-target.yml",
    ]);
  });
});
