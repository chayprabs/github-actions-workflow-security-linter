export const matrixWorkflowFixtures = {
  dynamicMatrix: `name: Dynamic Matrix
on: workflow_dispatch
jobs:
  build:
    runs-on: ubuntu-latest
    needs: setup
    strategy:
      fail-fast: true
      matrix:
        version: \${{ fromJSON(needs.setup.outputs.versions) }}
    steps:
      - run: echo "\${{ matrix.version }}"
`,
  emptyAfterExclude: `name: Empty Matrix
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        os: [ubuntu-latest]
        exclude:
          - os: ubuntu-latest
    steps:
      - run: echo ok
`,
  largeStaticMatrix: `name: Large Matrix
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      max-parallel: 3
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
        pnpm: [8, 9]
    steps:
      - run: echo ok
`,
  unmatchedIncludeExclude: `name: Unmatched Entries
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        os: [ubuntu-latest]
        node: [20]
        include:
          - os: windows-latest
            node: 22
            experimental: true
        exclude:
          - os: windows-latest
            node: 20
    steps:
      - run: echo ok
`,
} as const;
