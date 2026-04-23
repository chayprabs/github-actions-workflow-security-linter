export const attackPathWorkflowFixtures = {
  privilegedThirdParty: `name: Privileged Third Party
on: push
permissions:
  contents: read
jobs:
  publish:
    permissions:
      contents: write
      id-token: write
    runs-on: ubuntu-latest
    steps:
      - uses: vendor/publish-action@v1
`,
  pullRequestTargetWriteToken: `name: PR Target Head Checkout
on: pull_request_target
permissions:
  contents: write
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - run: npm test
`,
  safeReadOnly: `name: Safe
on: push
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`,
  selfHostedShell: `name: Self Hosted Shell
on:
  pull_request:
    branches: [main]
permissions:
  contents: read
jobs:
  test:
    runs-on: [self-hosted, linux]
    steps:
      - run: ./ci.sh
`,
  untrustedContextPrivileged: `name: Untrusted Context
on:
  pull_request:
    branches: [main]
permissions:
  contents: read
jobs:
  comment:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - run: echo "\${{ github.event.pull_request.title }}" | gh api repos/$GITHUB_REPOSITORY/dispatches
`,
  workflowRunArtifacts: `name: Workflow Run Deploy
on:
  workflow_run:
    workflows: [Build]
    types: [completed]
permissions:
  contents: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
      - run: gh release create test
`,
} as const;
