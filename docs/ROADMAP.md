# Roadmap

Future improvements for the GHA Workflow Analyzer.

## Analyzer depth

- Richer shell-execution rules beyond current untrusted-context coverage.
- Deeper reusable-workflow and composite-action call-site checks.
- Optional action provenance metadata when it can stay deterministic.

## Editing and fixes

- Comment-preserving YAML formatting.
- Broader safe auto-fix catalog (see `docs/FIX_COVERAGE.md`).
- Batch remediation flows in compare mode.

## Imports and sharing

- Improved public GitHub import ergonomics (branch hints, clearer rate-limit messaging).
- Private-repo import only as a separate product decision with explicit auth and privacy design.

## Product surface

- Optional CLI or GitHub Action wrapper for CI pipelines using SARIF exports.
- Additional Playwright coverage mapped to this checklist.

## Performance

- Periodic bundle analysis and dependency trimming.
- Expand Web Worker coverage for large workspaces.
