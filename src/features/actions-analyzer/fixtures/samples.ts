export type WorkflowSampleId =
  | "invalid-workflow"
  | "matrix-workflow"
  | "risky-pull-request-target"
  | "safe-basic"
  | "unpinned-third-party-actions";

export const safeBasicWorkflow = `name: CI
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
          cache: npm
      - run: npm ci
      - run: npm test
`;

export const riskyPullRequestTargetWorkflow = `name: Pull Request Target Review
on:
  pull_request_target:
    branches: [main]
permissions: write-all
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - uses: actions/setup-node@main
      - name: Install dependencies
        run: npm install
      - name: Run review script
        run: node scripts/review-pr.js
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      - name: Comment on PR
        run: gh pr comment \${{ github.event.pull_request.number }} --body "Checks completed"
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;

export const unpinnedThirdPartyActionsWorkflow = `name: Dependency Review
on:
  pull_request:
permissions:
  contents: read
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: some-org/dependency-audit-action@main
      - uses: security/vendor-license-check@master
      - run: npm ci
      - run: npm audit --production
`;

export const matrixWorkflow = `name: Matrix Test
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  test:
    runs-on: \${{ matrix.os }}
    timeout-minutes: 20
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
      - run: npm ci
      - run: npm test
`;

export const invalidWorkflow = `name: Broken Workflow
on:
  push
jobs:
  build
    runs-on: ubuntu-latest
`;

export const workflowSamples = [
  {
    content: safeBasicWorkflow,
    description:
      "A minimal baseline workflow with explicit permissions, timeouts, and standard first-party action tags.",
    id: "safe-basic",
    label: "Safe basic workflow",
    path: ".github/workflows/ci-safe.yml",
  },
  {
    content: riskyPullRequestTargetWorkflow,
    description:
      "A risky `pull_request_target` example with broad permissions and a floating action ref.",
    id: "risky-pull-request-target",
    label: "Risky pull_request_target workflow",
    path: ".github/workflows/pr-target-risky.yml",
  },
  {
    content: unpinnedThirdPartyActionsWorkflow,
    description:
      "A workflow with unpinned third-party actions that should later trigger supply-chain findings.",
    id: "unpinned-third-party-actions",
    label: "Unpinned third-party actions workflow",
    path: ".github/workflows/dependency-review.yml",
  },
  {
    content: matrixWorkflow,
    description:
      "A matrix-heavy workflow that helps exercise future matrix previews and reliability checks.",
    id: "matrix-workflow",
    label: "Matrix workflow",
    path: ".github/workflows/test-matrix.yml",
  },
  {
    content: invalidWorkflow,
    description:
      "An intentionally broken workflow sample for future syntax diagnostics and parser edge cases.",
    id: "invalid-workflow",
    label: "Invalid workflow",
    path: ".github/workflows/broken.yml",
  },
] as const;
