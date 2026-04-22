import type { WorkflowInputFile } from "@/features/actions-analyzer/types";

function createWorkflowInput(path: string, content: string): WorkflowInputFile {
  return {
    id: path,
    path,
    content,
    sizeBytes: new TextEncoder().encode(content).byteLength,
    sourceKind: "sample",
  };
}

export const fixtureWorkflows = {
  hardened: createWorkflowInput(
    ".github/workflows/ci-secure.yml",
    `name: Secure CI
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      matrix:
        node: [20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
      - run: npm ci
      - run: npm test
`,
  ),
  risky: createWorkflowInput(
    ".github/workflows/release-risky.yml",
    `name: Release
on: push
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - uses: docker/login-action@master
      - run: npm publish
`,
  ),
  invalid: createWorkflowInput(
    ".github/workflows/broken.yml",
    `name: Broken
on:
  push
jobs:
  test
    runs-on: ubuntu-latest
`,
  ),
};

export const sampleWorkflowBatch = [
  fixtureWorkflows.hardened,
  fixtureWorkflows.risky,
  fixtureWorkflows.invalid,
];
