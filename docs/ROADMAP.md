# Roadmap

Post-launch improvements for the Authos analyzer should live here instead of as placeholder UI copy.

## Analyzer depth

- Add more shell-execution and command-construction rules beyond the current untrusted-context coverage.
- Expand reusable workflow and composite action heuristics.
- Add richer action-version provenance and review metadata where static analysis can stay deterministic.

## Editing and fixes

- Add comment-preserving YAML formatting once the implementation can avoid destructive rewrites.
- Expand the safe auto-fix catalog for reliability and permissions findings.
- Add richer multi-file remediation workflows for compare mode and batch review.

## Imports and sharing

- Consider richer public GitHub import ergonomics such as repo browsing hints and branch suggestions.
- Evaluate private-repo import only as a separate product decision with an explicit privacy and auth design.
- Explore opt-in local report snapshots for longer-lived on-device review sessions.

## Product surface

- Add branded Open Graph images for the home page and tool page.
- Expand the Authos tool catalog with adjacent config tools listed in the landing page.
- Add more end-to-end QA automation across browsers and deployment previews.

## Performance and operations

- Run bundle analysis periodically and keep trimming client-side dependencies.
- Keep growing worker-path coverage so expensive analysis stays off the main thread.
- Add lightweight production telemetry only if it can preserve the local-first privacy model.
