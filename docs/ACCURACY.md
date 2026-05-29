# Analyzer Accuracy Model

This tool does **not** phone home with workflow content or finding telemetry. Accuracy is maintained through **deterministic tests** and explicit reviewer heuristics.

## Golden workflows

Golden files live in `src/features/actions-analyzer/fixtures/golden/`:

- Each `*.yml` file represents a real-world pattern (safe CI, `pull_request_target` risk, large matrix, unpinned actions, etc.).
- `expected-findings.json` lists required rule IDs per file (`exact` or `mustInclude`).

`npm run test` runs `golden-fixtures.test.ts`, which fails if:

- A fixture file is added without expectations
- Expected rule IDs are missing from analysis output

**When changing a rule:** update golden expectations if behavior intentionally changes; add a new golden file for new rule classes.

## Rule unit tests

Each rule pack has focused tests under `src/features/actions-analyzer/lib/rules/`. Prefer adding a minimal YAML snippet that triggers exactly the rule under test.

## Heuristic panels (not proofs)

These features are **review aids**, not runtime guarantees:

- **Permission minimizer** — static scope inference; labeled as review guidance in UI copy
- **Attack paths** — combinations of enabled findings; does not model branch protection or org policy
- **Matrix preview** — static expansion only; dynamic `fromJSON` matrices stay unresolved (`GHA414`)

## Internal rule failures

If a rule module throws, analysis continues for other rules and records:

- `report.ruleExecutionFailures[]` — structured `{ ruleId, message }`
- User-visible finding **`GHA902`** per failure

This replaces the previous silent `catch { continue }` behavior.

## Reporting false positives

Until optional privacy-safe telemetry exists (see `docs/ROADMAP.md`), report issues with:

1. Minimal workflow YAML (redacted secrets)
2. Rule ID and finding title
3. Why GitHub Actions runtime behavior differs from the finding
