export const permissionWorkflowFixtures = {
  mixedPrivilegePipeline: `name: Delivery
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: write
  packages: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
  publish:
    runs-on: ubuntu-latest
    steps:
      - run: npm publish
  release:
    runs-on: ubuntu-latest
    steps:
      - run: gh release create v1.2.3
  auth:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
  comment:
    runs-on: ubuntu-latest
    steps:
      - run: gh pr comment 123 --body "ok"
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: github/codeql-action/upload-sarif@v3
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
} as const;
