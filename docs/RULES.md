# Rule Inventory

Authos currently ships the following rule IDs in the GitHub Actions analyzer. Each entry lists the default severity, primary category, and a short explanation of what the rule is trying to catch.

## Parse and syntax

- `GHA001` | `high` | `syntax` | Invalid YAML prevents GitHub Actions from loading the workflow reliably.
- `GHA002` | `high` | `syntax` | Duplicate YAML keys can silently overwrite earlier values.
- `GHA003` | `medium` | `syntax` | Empty workflow files are not valid runnable GitHub Actions workflows.
- `GHA004` | `high` | `triggers` | The workflow is missing a usable top-level `on` trigger declaration.
- `GHA005` | `high` | `syntax` | The workflow is missing a top-level `jobs` mapping.
- `GHA006` | `high` | `syntax` | The `jobs` field is empty or not a mapping of job ids.
- `GHA007` | `high` | `syntax` | A job is missing `runs-on` or a reusable-workflow `uses` target.
- `GHA008` | `high` | `syntax` | A step defines both `run` and `uses`.
- `GHA009` | `medium` | `syntax` | A step defines neither `run` nor `uses`.
- `GHA010` | `medium` | `syntax` | A `uses` reference is malformed for an action or reusable workflow.
- `GHA011` | `high` | `reliability` | A job `needs` dependency points at an unknown job id.
- `GHA012` | `high` | `syntax` | Duplicate job ids were declared under `jobs`.
- `GHA013` | `high` | `permissions` | Workflow or job permissions syntax is invalid.
- `GHA014` | `medium` | `runner` | A `runs-on` value is empty or structurally invalid.
- `GHA015` | `medium` | `reliability` | A statically known timeout value is invalid.
- `GHA016` | `high` | `syntax` | A reusable workflow caller mixes incompatible job fields.
- `GHA017` | `low` | `maintainability` | A suspicious workflow key typo will likely be ignored by GitHub Actions.
- `GHA018` | `medium` | `syntax` | The file contains multiple YAML documents instead of one workflow document.
- `GHA019` | `high` | `syntax` | The workflow root is not a YAML mapping.

## Expressions and contexts

- `GHA050` | `medium` | `expressions` | An expression is malformed, empty, or unclosed.
- `GHA051` | `medium` | `expressions` | An expression starts from an unknown GitHub Actions context root.
- `GHA052` | `medium` | `expressions` | A secret is referenced directly in an `if:` conditional.
- `GHA053` | `medium` | `expressions` | The `matrix` context is used outside a matrix job.
- `GHA054` | `medium` | `expressions` | A `needs.<job>` expression reference targets an unknown job id.
- `GHA055` | `medium` | `expressions` | Potentially untrusted GitHub event data is used directly in an expression.

## Permissions, triggers, and security

- `GHA100` | `medium` | `permissions` | Top-level permissions are missing and token scope is not explicit.
- `GHA101` | `high` | `permissions` | The workflow uses `permissions: write-all`.
- `GHA102` | `high` | `permissions` | The workflow or a job grants broad write-capable token scopes.
- `GHA103` | `high` | `security` | The workflow uses `pull_request_target`.
- `GHA104` | `critical` | `security` | A `pull_request_target` workflow checks out pull request head code.
- `GHA105` | `high` | `runner` | A self-hosted runner is reachable from an untrusted pull request trigger.
- `GHA106` | `medium` | `security` | A `workflow_run` follow-up may act on artifacts or privileges across trust boundaries.
- `GHA107` | `medium` | `security` | A secret is defined at workflow or job `env` scope.
- `GHA108` | `medium` | `security` | A long-lived cloud credential secret name was detected.
- `GHA109` | `high` | `security` | A deploy-like job runs on an untrusted pull request trigger.
- `GHA110` | `high` | `security` | Broad token access is available to a third-party action.

## Supply chain and action pinning

- `GHA200` | `high` | `supply-chain` | A third-party action or workflow is not pinned to a full commit SHA.
- `GHA201` | `medium` | `supply-chain` | A first-party reference uses a mutable tag such as `v4`.
- `GHA202` | `high` | `supply-chain` | A reference uses a branch name.
- `GHA203` | `medium` | `supply-chain` | A reference uses a short commit SHA.
- `GHA204` | `medium` | `supply-chain` | A Docker action image is not pinned by digest.
- `GHA205` | `high` | `supply-chain` | A `uses` reference is dynamic at runtime.
- `GHA206` | `medium` | `supply-chain` | `actions/checkout` persists credentials in a write-capable job.
- `GHA207` | `high` | `supply-chain` | A reference uses the unstable `latest` tag.
- `GHA208` | `high` | `supply-chain` | A third-party reference runs inside a privileged job.

## Reliability, performance, and matrix behavior

- `GHA401` | `low` | `reliability` | A job is missing `timeout-minutes`.
- `GHA402` | `medium` | `reliability` | A deploy-style job is missing `concurrency`.
- `GHA403` | `medium` | `reliability` | A step enables `continue-on-error`.
- `GHA404` | `medium` | `performance` | A cache key is too broad and lacks a dependency fingerprint.
- `GHA405` | `low` | `reliability` | An artifact upload step does not set `retention-days`.
- `GHA407` | `medium` | `matrix` | A matrix expands beyond the configured review threshold.
- `GHA412` | `low` | `matrix` | A matrix `include` or `exclude` entry does not match the base matrix as expected.
- `GHA413` | `high` | `matrix` | A matrix resolves to zero combinations.
- `GHA414` | `low` | `matrix` | A matrix cannot be expanded statically and remains unresolved.

## Tooling and review hygiene

- `GHA900` | `info` | `maintainability` | Analysis was requested with no workflow files in the workspace.
- `GHA901` | `low` | `maintainability` | An `# authos-ignore` comment omitted its reason.
