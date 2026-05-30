# CI integration

The browser tool exports **SARIF 2.1.0** reports suitable for GitHub code scanning and other SARIF consumers.

## Export from the UI

1. Analyze your workflow on the home page.
2. Open the **Report** tab.
3. Download **SARIF** or copy the PR comment Markdown.

## Example: upload SARIF in GitHub Actions

```yaml
name: Workflow review
on:
  pull_request:
    paths:
      - ".github/workflows/**"

jobs:
  sarif:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Analyze workflows locally
        run: |
          echo "Run the browser analyzer or a future CLI, then produce findings.sarif"
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: findings.sarif
```

For fully automated CI today, export SARIF from a reviewed analysis run and commit or upload the artifact until a CLI wrapper ships (see `docs/ROADMAP.md`).
