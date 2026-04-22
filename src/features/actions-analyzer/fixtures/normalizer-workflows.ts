export const normalizerWorkflowFixtures = {
  basicPush: {
    content: `name: Basic Push
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`,
    path: ".github/workflows/basic-push.yml",
  },
  dockerAction: {
    content: `name: Docker Action
on: push
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: docker://ghcr.io/actions/example:1.2.3
      - uses: docker://ghcr.io/actions/example@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
`,
    path: ".github/workflows/docker-action.yml",
  },
  localAction: {
    content: `name: Local Action
on:
  pull_request_target:
    branches: [main]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: ./actions/review
      - run: node scripts/review.js
`,
    path: ".github/workflows/local-action.yml",
  },
  matrixWorkflow: {
    content: `name: Matrix Workflow
on:
  push:
    branches: [main]
  merge_group:
    types: [checks_requested]
jobs:
  test:
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [18, 20]
        include:
          - os: ubuntu-latest
            node: 22
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
      - run: npm test
`,
    path: ".github/workflows/matrix.yml",
  },
  needsStringAndArray: {
    content: `name: Needs Shapes
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - run: npm run build
  release:
    runs-on: ubuntu-latest
    needs: [build, test]
    steps:
      - run: npm publish
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`,
    path: ".github/workflows/needs.yml",
  },
  pullRequestTarget: {
    content: `name: PR Target
on:
  pull_request_target:
    branches: [main]
permissions: write-all
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
    path: ".github/workflows/pr-target.yml",
  },
  reusableWorkflowCall: {
    content: `name: Reusable Workflow Call
on:
  workflow_dispatch:
    inputs:
      environment:
        required: true
        type: choice
jobs:
  deploy:
    uses: org/platform/.github/workflows/deploy.yml@v2
    with:
      environment: production
    secrets: inherit
`,
    path: ".github/workflows/reusable.yml",
  },
} as const;
