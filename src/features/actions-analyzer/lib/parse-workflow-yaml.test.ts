import { describe, expect, it } from "vitest";

import {
  findLocationForPath,
  findJobLocation,
  findScalarValueLocation,
  findStepLocation,
  findTopLevelKeyLocation,
  getLineColumnFromOffset,
  getSourceSnippet,
  parseWorkflowYaml,
  parseWorkflowYamlFiles,
} from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

describe("parseWorkflowYaml", () => {
  it("parses a valid workflow with no parse findings", () => {
    const parsed = parseWorkflowYaml(
      createInput(
        ".github/workflows/ci.yml",
        `name: CI
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
      ),
    );

    expect(parsed.isSuccessful).toBe(true);
    expect(parsed.rootType).toBe("map");
    expect(parsed.parseFindings).toHaveLength(0);
    expect(parsed.parsedValue).toMatchObject({
      jobs: {
        test: {
          "runs-on": "ubuntu-latest",
        },
      },
      name: "CI",
    });
  });

  it("returns a parse finding with line and column for invalid YAML", () => {
    const parsed = parseWorkflowYaml(
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
    );

    expect(parsed.isSuccessful).toBe(false);
    expect(parsed.parseFindings[0]?.ruleId).toBe("GHA001");
    expect(parsed.parseFindings[0]?.location).toMatchObject({
      column: 3,
      line: 5,
    });
  });

  it("detects duplicate keys", () => {
    const parsed = parseWorkflowYaml(
      createInput(
        ".github/workflows/duplicate.yml",
        `name: First
name: Second
on: push
`,
      ),
    );

    expect(parsed.duplicateKeyWarnings).toHaveLength(1);
    expect(parsed.parseFindings.map((finding) => finding.ruleId)).toContain(
      "GHA002",
    );
  });

  it("treats empty YAML as a dedicated syntax finding", () => {
    const parsed = parseWorkflowYaml(
      createInput(".github/workflows/empty.yml", ""),
    );

    expect(parsed.parseFindings).toHaveLength(1);
    expect(parsed.parseFindings[0]?.ruleId).toBe("GHA003");
  });

  it("warns when multiple YAML documents are present", () => {
    const parsed = parseWorkflowYaml(
      createInput(
        ".github/workflows/multi.yml",
        `name: One
---
name: Two
`,
      ),
    );

    expect(parsed.documents).toHaveLength(2);
    expect(parsed.parseFindings.map((finding) => finding.ruleId)).toContain(
      "GHA004",
    );
  });

  it("parses YAML anchors and aliases without crashing", () => {
    const parsed = parseWorkflowYaml(
      createInput(
        ".github/workflows/anchors.yml",
        `defaults: &defaults
  timeout-minutes: 10
name: CI
on: push
jobs:
  test:
    <<: *defaults
    runs-on: ubuntu-latest
`,
      ),
    );

    expect(parsed.isSuccessful).toBe(true);
    expect(parsed.parseFindings).toHaveLength(0);
  });

  it("warns when the workflow root is not a mapping", () => {
    const parsed = parseWorkflowYaml(
      createInput(
        ".github/workflows/list.yml",
        `- name: nope
- on: push
`,
      ),
    );

    expect(parsed.rootType).toBe("sequence");
    expect(parsed.parseFindings.map((finding) => finding.ruleId)).toContain(
      "GHA005",
    );
  });

  it("exposes source map helpers for keys, jobs, steps, and scalar values", () => {
    const parsed = parseWorkflowYaml(
      createInput(
        ".github/workflows/source-map.yml",
        `name: CI
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Install
        run: npm ci
      - uses: actions/checkout@v4
`,
      ),
    );

    expect(findTopLevelKeyLocation(parsed, "jobs")).toMatchObject({
      line: 5,
      column: 1,
    });
    expect(findJobLocation(parsed, "test")).toMatchObject({
      line: 6,
      column: 3,
    });
    expect(findStepLocation(parsed, "test", 1)).toMatchObject({
      line: 11,
      column: 9,
    });
    expect(
      findScalarValueLocation(parsed, ["jobs", "test", "runs-on"]),
    ).toMatchObject({
      line: 7,
      column: 14,
    });
    expect(findLocationForPath(parsed, ["on"])).toMatchObject({
      line: 2,
      column: 1,
    });
    expect(findLocationForPath(parsed, ["permissions"])).toBeUndefined();
    expect(
      findLocationForPath(parsed, ["jobs", "test", "steps", 1, "uses"]),
    ).toMatchObject({
      line: 11,
      column: 15,
    });
  });

  it("resolves path-based locations for permissions and strategy.matrix", () => {
    const parsed = parseWorkflowYaml(
      createInput(
        ".github/workflows/locations.yml",
        `name: Matrix
on: push
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20]
    steps:
      - run: npm test
`,
      ),
    );

    expect(findLocationForPath(parsed, ["permissions"])).toMatchObject({
      line: 3,
      column: 1,
    });
    expect(
      findLocationForPath(parsed, ["jobs", "test", "strategy", "matrix"]),
    ).toMatchObject({
      line: 9,
      column: 7,
    });
    expect(
      findLocationForPath(parsed, ["jobs", "test", "steps", 0, "run"]),
    ).toMatchObject({
      line: 12,
      column: 14,
    });
  });
});

describe("parseWorkflowYamlFiles", () => {
  it("parses multiple files and continues past malformed input", () => {
    const results = parseWorkflowYamlFiles([
      createInput(".github/workflows/ci.yml", "name: CI\non: push\njobs: {}\n"),
      createInput(
        ".github/workflows/broken.yml",
        "jobs:\n  build\n    runs-on: ubuntu-latest\n",
      ),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]?.parseFindings).toHaveLength(0);
    expect(results[1]?.parseFindings[0]?.ruleId).toBe("GHA001");
  });
});

describe("parser helpers", () => {
  it("maps offsets to one-based line and column positions", () => {
    expect(getLineColumnFromOffset("one\ntwo", 5)).toEqual({
      column: 2,
      line: 2,
    });
  });

  it("returns a readable source snippet around a location", () => {
    expect(
      getSourceSnippet(
        "name: CI\njobs:\n  test:\n    runs-on: ubuntu-latest\n",
        {
          filePath: ".github/workflows/ci.yml",
          line: 3,
          column: 3,
          endLine: 3,
          endColumn: 7,
        },
        1,
      ),
    ).toContain("> 3 |   test:");
  });
});
