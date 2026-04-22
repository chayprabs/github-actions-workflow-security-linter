export const securityWorkflowFixtures = {
  broadWritePermissions: `name: Broad Write
on: push
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`,
  longLivedCloudSecret: `name: Cloud Keys
on: push
permissions:
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - env:
          AWS_ACCESS_KEY_ID: \${{ secrets.AWS_ACCESS_KEY_ID }}
        run: aws sts get-caller-identity
`,
  missingTopLevelPermissions: `name: Missing Permissions
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`,
  privilegedThirdPartyAction: `name: Third Party Privilege
on: push
permissions:
  contents: read
jobs:
  publish:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: vendor/publish-action@v1
`,
  pullRequestTarget: `name: Pull Request Target
on: pull_request_target
permissions:
  contents: read
jobs:
  metadata:
    runs-on: ubuntu-latest
    steps:
      - run: echo review
`,
  pullRequestTargetCheckoutHead: `name: Pull Request Target Checkout
on: pull_request_target
permissions:
  contents: read
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
`,
  safeReadOnlyPush: `name: Safe Read Only
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`,
  secretsInJobEnv: `name: Job Env Secret
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      API_TOKEN: \${{ secrets.API_TOKEN }}
    steps:
      - run: echo ok
`,
  selfHostedPullRequest: `name: Self Hosted PR
on:
  pull_request:
    branches: [main]
permissions:
  contents: read
jobs:
  test:
    runs-on: [self-hosted, linux]
    steps:
      - run: echo ok
`,
  untrustedDeployment: `name: Deploy On PR
on:
  pull_request:
    branches: [main]
permissions:
  contents: read
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo deploy
`,
  workflowRunPrivileged: `name: Workflow Run Follow Up
on:
  workflow_run:
    workflows: [Build]
    types: [completed]
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - run: gh release create test
`,
  writeAllPermissions: `name: Write All
on: push
permissions: write-all
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`,
} as const;
