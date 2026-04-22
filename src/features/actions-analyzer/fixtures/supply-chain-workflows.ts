export const supplyChainWorkflowFixtures = {
  checkoutWithPersistedCredentials: `name: Checkout Credentials
on: push
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: git status
`,
  checkoutWithPersistedCredentialsDisabled: `name: Checkout Credentials Disabled
on: push
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - run: git status
`,
  dockerDigest: `name: Docker Digest
on: push
permissions:
  contents: read
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: docker://alpine@sha256:1111111111111111111111111111111111111111111111111111111111111111
`,
  dockerTag: `name: Docker Tag
on: push
permissions:
  contents: read
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: docker://alpine:3.20
`,
  dynamicUses: `name: Dynamic Uses
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: vendor/action@\${{ github.ref_name }}
`,
  firstPartyMutableTag: `name: First Party Tag
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
  inventoryCoverage: `name: Inventory Coverage
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Audit
        uses: vendor/audit-action@main
      - name: Local Setup
        uses: ./.github/actions/setup
      - name: Pinned Image
        uses: docker://alpine@sha256:2222222222222222222222222222222222222222222222222222222222222222
  deploy:
    uses: vendor/platform/.github/workflows/deploy.yml@v1
`,
  latestTagAction: `name: Latest Action
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: vendor/action@latest
`,
  latestTagDocker: `name: Latest Docker
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: docker://alpine:latest
`,
  privilegedThirdPartyAction: `name: Privileged Third Party
on: workflow_dispatch
permissions:
  id-token: write
jobs:
  deploy:
    permissions:
      contents: write
      id-token: write
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: vendor/release-action@v1
`,
  reusableWorkflow: `name: Reusable Call
on: workflow_dispatch
permissions:
  contents: read
jobs:
  deploy:
    uses: vendor/platform/.github/workflows/deploy.yml@v1
`,
  thirdPartyBranch: `name: Third Party Branch
on: push
permissions:
  contents: read
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: vendor/action@main
`,
  thirdPartyFullSha: `name: Third Party SHA
on: push
permissions:
  contents: read
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: vendor/action@0123456789abcdef0123456789abcdef01234567
`,
  thirdPartyShortSha: `name: Third Party Short SHA
on: push
permissions:
  contents: read
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: vendor/action@0123456789abcd
`,
} as const;
