# Implementation Log

## Prompt 1

- Status: Completed.
- Outcome: Initialized a Next.js App Router project in the empty folder, converted styling to a config-driven Tailwind setup, added reusable UI primitives, scaffolded the Authos home page and the `/tools/github-actions-workflow-analyzer` route, created analyzer feature folders and deterministic seed logic, and wrote the requested docs.

## Commands Run

- `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`
- `npm install yaml zod clsx tailwind-merge lucide-react`
- `npm install -D tailwindcss@^3.4.17 postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom happy-dom prettier @vitejs/plugin-react @playwright/test`
- `npm uninstall @tailwindcss/postcss`
- `npm run format`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm uninstall vite-tsconfig-paths`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run start -- --hostname 127.0.0.1 --port 3000` with `Invoke-WebRequest` checks for `/` and `/tools/github-actions-workflow-analyzer`

## Known Issues / Notes

- The analyzer page is intentionally a placeholder shell for Prompt 1; deeper editor, file import, and browser-worker UX will be built in later prompts.
- `test:e2e` is configured with Playwright, but E2E browsers were not installed or executed in this prompt.

## Prompt 2

- Status: Completed.
- Outcome: Reworked the app shell into reusable `SiteHeader`, `SiteFooter`, and `PageShell` components; expanded the token system in global CSS; added the requested UI primitives and clean export barrels; wired the home page, analyzer placeholder, and a new `/privacy` route into the shared foundation; and added `data-testid` markers for major UI regions.

### Commands Run

- `npm run typecheck`
- `npx prettier --write src\\app\\layout.tsx src\\app\\page.tsx src\\app\\globals.css src\\app\\privacy\\page.tsx src\\features\\actions-analyzer\\components\\analyzer-placeholder.tsx src\\components\\layout\\index.ts src\\components\\layout\\page-shell.tsx src\\components\\layout\\site-footer.tsx src\\components\\layout\\site-header.tsx src\\components\\ui\\alert.tsx src\\components\\ui\\badge.tsx src\\components\\ui\\button.tsx src\\components\\ui\\card.tsx src\\components\\ui\\copy-button.tsx src\\components\\ui\\empty-state.tsx src\\components\\ui\\index.ts src\\components\\ui\\input.tsx src\\components\\ui\\progress.tsx src\\components\\ui\\select.tsx src\\components\\ui\\switch.tsx src\\components\\ui\\tabs.tsx src\\components\\ui\\textarea.tsx src\\components\\ui\\toolbar.tsx src\\lib\\site.ts tailwind.config.ts tests\\e2e\\smoke.spec.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run start -- --hostname 127.0.0.1 --port 3000` with `Invoke-WebRequest` checks for `/`, `/privacy`, and `/tools/github-actions-workflow-analyzer`

### Known Issues / Notes

- The UI foundation is intentionally plain and token-driven so later prompts can restyle it without reworking component behavior.
- `test:e2e` remains configured but Playwright browsers were not installed or executed in this prompt.

## Prompt 3

- Status: Completed.
- Outcome: Rebuilt the home page into a credible Authos tools-directory landing page, added a typed tool registry in `src/content/tools.ts`, promoted the GitHub Actions analyzer as the first real tool, updated site-level copy and footer structure to reflect a growing browser-based tools collection, and kept future categories clearly non-interactive instead of adding fake pages.

### Commands Run

- `npx prettier --write src\\content\\tools.ts src\\app\\page.tsx src\\components\\layout\\site-footer.tsx src\\app\\layout.tsx src\\lib\\site.ts tests\\e2e\\smoke.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run start -- --hostname 127.0.0.1 --port 3000` with `Invoke-WebRequest` checks for `/` and `/tools/github-actions-workflow-analyzer`

### Known Issues / Notes

- Only one real tool exists today by design; other categories are intentionally displayed as planned placeholders without broken links.
- `typecheck` now runs `next typegen` before `tsc --noEmit` so typed route generation stays in sync with the App Router.
- `test:e2e` remains configured but Playwright browsers were not installed or executed in this prompt.

## Prompt 4

- Status: Completed.
- Outcome: Replaced the analyzer placeholder page with a full product-shaped shell, including a real hero section, sticky desktop workspace toolbar, two-column desktop layout, mobile tabs for Input/Findings/Report, functional textarea and sample-loading state, placeholder results and export areas, and SEO content below the workspace. Added realistic safe and risky sample workflows so the page behaves like a real tool shell even before the analyzer engine is implemented.

### Commands Run

- `npx prettier --write src\\app\\tools\\github-actions-workflow-analyzer\\page.tsx src\\features\\actions-analyzer\\components\\analyzer-page.tsx src\\features\\actions-analyzer\\components\\analyzer-hero.tsx src\\features\\actions-analyzer\\components\\analyzer-workspace.tsx src\\features\\actions-analyzer\\components\\input-panel.tsx src\\features\\actions-analyzer\\components\\privacy-notice.tsx src\\features\\actions-analyzer\\components\\results-panel.tsx src\\features\\actions-analyzer\\components\\seo-content.tsx src\\features\\actions-analyzer\\components\\workspace-toolbar.tsx src\\features\\actions-analyzer\\fixtures\\samples.ts tests\\e2e\\smoke.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run start -- --hostname 127.0.0.1 --port 3000` with `Invoke-WebRequest` checks for `/tools/github-actions-workflow-analyzer`

### Known Issues / Notes

- The page shell is now functional, but the actual analyzer engine still shows the temporary message `Analyzer engine coming next.` until rule execution is added in a later prompt.
- The textarea is a deliberate placeholder for the future editor upgrade; CodeMirror and worker-backed analysis are still pending.
- `test:e2e` remains configured but Playwright browsers were not installed or executed in this prompt.

## Prompt 5

- Status: Completed.
- Outcome: Introduced the stable pure-TypeScript analyzer domain model, including shared report contracts, findings/settings/rule types, severity weights, score and grade helpers, deterministic finding sorting and ID generation, reserved GitHub Actions rule ID ranges, default analyzer settings, and typed empty/sample report fixtures. Updated the existing lightweight analyzer implementation to emit the new finding shape and reserved `GHA` rule IDs while keeping the current app and worker scaffold compiling.

### Commands Run

- `npx prettier --write src\\features\\actions-analyzer\\types\\domain.ts src\\features\\actions-analyzer\\types\\compat.ts src\\features\\actions-analyzer\\types\\index.ts src\\features\\actions-analyzer\\lib\\settings.ts src\\features\\actions-analyzer\\lib\\scoring.ts src\\features\\actions-analyzer\\lib\\summary.ts src\\features\\actions-analyzer\\lib\\rule-catalog.ts src\\features\\actions-analyzer\\fixtures\\reports.ts src\\features\\actions-analyzer\\fixtures\\sample-workflows.ts src\\features\\actions-analyzer\\lib\\analyze-workflows.ts src\\features\\actions-analyzer\\lib\\domain-model.test.ts src\\features\\actions-analyzer\\lib\\analyze-workflows.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- The stable `WorkflowAnalysisReport` contract and fixtures now exist, but the current worker and lightweight analyzer runtime still use a transitional per-file wrapper until the full report-producing analyzer flow is implemented in a later prompt.
- The analyzer remains deterministic and local-only; this prompt intentionally focused on contracts and testable domain logic rather than new UI behavior.

## Prompt 6

- Status: Completed.
- Outcome: Replaced the single-textarea placeholder state with a real browser-only workflow input ingestion layer built around `useWorkflowInputs()`. The workspace now supports paste drafts with editable virtual paths, multi-file uploads, folder uploads with `.github/workflows/` filtering and an "Include all YAML files" toggle, removable file entries with stable IDs, clearer privacy messaging, richer sample coverage, sample-load confirmation for typed content, and reset behavior that restores default settings and a fresh draft. Added pure file validation and folder-filter utilities with tests for size limits and eligible-file selection.

### Commands Run

- `npx prettier --write src\\features\\actions-analyzer\\components\\analyzer-page.tsx src\\features\\actions-analyzer\\components\\analyzer-workspace.tsx src\\features\\actions-analyzer\\components\\input-panel.tsx src\\features\\actions-analyzer\\components\\privacy-notice.tsx src\\features\\actions-analyzer\\components\\workspace-toolbar.tsx src\\features\\actions-analyzer\\fixtures\\samples.ts src\\features\\actions-analyzer\\lib\\use-workflow-inputs.ts src\\features\\actions-analyzer\\lib\\workflow-input-utils.ts src\\features\\actions-analyzer\\lib\\workflow-input-utils.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- Folder upload still depends on browser support for `webkitdirectory`; unsupported browsers now get a visible fallback message and can still use regular multi-file upload.
- The ingestion layer is real, but analysis results remain placeholder-only until the next prompt connects the analyzer engine to these normalized `WorkflowInputFile[]` inputs.

## Prompt 7

- Status: Completed.
- Outcome: Added a dedicated YAML parser layer using the `yaml` package, with typed parsed-file contracts, line/column helpers, source-snippet extraction, and source-map helpers for top-level keys, jobs, steps, and scalar values. The analyzer now parses workflow files safely in the browser, surfaces real YAML diagnostics such as invalid syntax, duplicate keys, empty files, multi-document files, and invalid root structures, and renders those parse findings in the Results panel when the user clicks Analyze.

### Commands Run

- `npx prettier --write src\\features\\actions-analyzer\\types\\parser.ts src\\features\\actions-analyzer\\types\\index.ts src\\features\\actions-analyzer\\lib\\parse-workflow-yaml.ts src\\features\\actions-analyzer\\lib\\parse-workflow-yaml.test.ts src\\features\\actions-analyzer\\lib\\analyze-workflows.ts src\\features\\actions-analyzer\\lib\\rule-catalog.ts src\\features\\actions-analyzer\\components\\analyzer-page.tsx src\\features\\actions-analyzer\\components\\analyzer-workspace.tsx src\\features\\actions-analyzer\\components\\results-panel.tsx tests\\e2e\\smoke.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- The current Analyze action now shows real YAML parser findings only; broader GitHub Actions rule evaluation and richer report/export content still need to be layered on top in future prompts.
- The Playwright smoke spec was updated to reflect the parser-backed Analyze flow, but `test:e2e` was not executed in this prompt because Playwright browsers were not installed.

## Prompt 8

- Status: Completed.
- Outcome: Added a GitHub Actions-specific normalization layer that converts parsed YAML into typed `NormalizedWorkflow` models with preserved raw values, best-effort source locations, trigger/job/step normalization, `uses` parsing for local, Docker, repository, and reusable workflow references, and a generic `findLocationForPath()` helper for AST-backed path lookups. Added fixture-backed unit tests for the requested workflow shapes and minimally connected the UI so successful parse runs now show workflow name, triggers, job count, and step count in the existing results area.

### Commands Run

- `npx prettier --write src\\features\\actions-analyzer\\types\\parser.ts src\\features\\actions-analyzer\\lib\\parse-workflow-yaml.ts src\\features\\actions-analyzer\\types\\normalized.ts src\\features\\actions-analyzer\\types\\index.ts src\\features\\actions-analyzer\\lib\\normalize-workflow.ts src\\features\\actions-analyzer\\lib\\normalize-workflow.test.ts src\\features\\actions-analyzer\\lib\\parse-workflow-yaml.test.ts src\\features\\actions-analyzer\\fixtures\\normalizer-workflows.ts src\\features\\actions-analyzer\\components\\analyzer-page.tsx src\\features\\actions-analyzer\\components\\analyzer-workspace.tsx src\\features\\actions-analyzer\\components\\results-panel.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- The new normalizer is now the bridge between parsed YAML and future rules, but the existing lightweight analyzer runtime has not yet been fully refactored to consume it for every finding path.
- Best-effort normalization intentionally preserves partial structures from invalid YAML when the parser can still recover an AST, so future rules can decide whether to ignore, warn on, or inspect those fragments.

## Prompt 9

- Status: Completed.
- Outcome: Replaced the transitional per-file analyzer path with a real local analysis pipeline centered on `analyzeWorkflowFiles()`, `RuleContext`, `RuleModule`, `runRules()`, `createEmptyReport()`, `applyRuleSettings()`, `dedupeFindings()`, and the existing `buildAnalysisSummary()`. The pipeline now parses YAML, normalizes valid workflows, includes parser findings, runs a registry-backed rule set, builds placeholder action/trigger/permission/matrix summaries, sorts and scores findings, and returns a full `WorkflowAnalysisReport`. Added the initial `GHA900` no-files smoke rule, a Web Worker-backed `useWorkflowAnalysis()` hook with main-thread fallback, and connected the UI to real analysis with auto-run, debounce, and loading/error states.

### Commands Run

- `npx prettier --write src\\features\\actions-analyzer\\types\\domain.ts src\\features\\actions-analyzer\\types\\analysis.ts src\\features\\actions-analyzer\\types\\compat.ts src\\features\\actions-analyzer\\types\\index.ts src\\features\\actions-analyzer\\lib\\settings.ts src\\features\\actions-analyzer\\lib\\rule-catalog.ts src\\features\\actions-analyzer\\lib\\create-rule-finding.ts src\\features\\actions-analyzer\\lib\\rules\\no-files.rule.ts src\\features\\actions-analyzer\\lib\\rules\\index.ts src\\features\\actions-analyzer\\lib\\analyze-workflows.ts src\\features\\actions-analyzer\\lib\\use-workflow-analysis.ts src\\features\\actions-analyzer\\workers\\analysis.worker.ts src\\features\\actions-analyzer\\components\\workspace-toolbar.tsx src\\features\\actions-analyzer\\components\\input-panel.tsx src\\features\\actions-analyzer\\components\\analyzer-workspace.tsx src\\features\\actions-analyzer\\components\\results-panel.tsx src\\features\\actions-analyzer\\components\\analyzer-page.tsx src\\features\\actions-analyzer\\lib\\analyze-workflows.test.ts tests\\e2e\\smoke.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run lint`
- `npm run build`
- `npm run typecheck`
- `npm run test`

### Known Issues / Notes

- The worker-backed hook is now live and build-safe in the current Next.js setup, but the exported report sections beyond findings and score are still intentionally placeholder-shaped until more rule prompts populate them with deeper analysis.
- The analyzer page now supports manual empty-workspace analysis via `GHA900`, while auto-run intentionally skips empty draft state so the page does not produce a finding before the user asks for one.

## Prompt 10

- Status: Completed.
- Outcome: Added the first real deterministic GitHub Actions syntax-and-semantics rule pack to the analyzer pipeline. The registry now includes workflow-level rules for missing `on`, missing or invalid `jobs`, duplicate job ids, and suspicious key typos; job-level rules for missing `runs-on` or reusable-workflow `uses`, unknown `needs`, invalid permissions, invalid `runs-on`, invalid `timeout-minutes`, and reusable-workflow caller mixing; and step-level rules for conflicting `run`/`uses`, empty steps, and malformed `uses` references. The Results panel now groups parser and rule findings under a dedicated `Syntax and semantics` section. Parser-only multi-document and root-shape diagnostics were remapped to `GHA018` and `GHA019` so `GHA004` through `GHA017` now match the requested semantic rule IDs.

### Commands Run

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Known Issues / Notes

- The semantic rule pack stays intentionally conservative: unknown permission scopes are medium-severity instead of high, and typo detection is limited to explicit common misspellings so future valid keys do not trigger noisy findings.
- The reusable-workflow caller, permissions, and `runs-on` validation logic was aligned to the current GitHub Actions docs during implementation, so the analyzer now accepts `runs-on` group or labels mappings and the current documented reusable-workflow caller keyword set.

## Prompt 11

- Status: Completed.
- Outcome: Added a best-effort GitHub Actions expression analyzer on top of the normalized workflow model. The analyzer now extracts wrapped and bare `if` expressions from workflow, job, and step fields; recognizes documented context roots and common functions; tracks untrusted GitHub event references; and produces an `expressionSummary` in the main `WorkflowAnalysisReport`. Added expression rules `GHA050` through `GHA056` for malformed expressions, unknown contexts, direct secret usage in conditionals, matrix context misuse, unknown `needs.*` references inside expressions, untrusted GitHub context usage outside env boundaries, and dynamic `uses` refs. The Results UI now has an `Expressions` category filter, groups expression findings separately, and shows expression text as evidence for the new rules.

### Commands Run

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Known Issues / Notes

- The expression layer is intentionally scanner-based rather than a full evaluator. It focuses on `${{ ... }}` extraction, plain `if` conditions, known context roots, and clearly static path checks so it stays deterministic and avoids guessing at runtime values.
- Context recognition and `secrets` conditional handling were aligned to the current GitHub Actions docs during implementation, including the documented context availability table and the guidance that secrets should not be referenced directly in `if:` conditionals.

## Prompt 12

- Status: Completed.
- Outcome: Added the first security-focused GitHub Actions rule pack, covering explicit permissions, `write-all`, broad write scopes, `pull_request_target`, dangerous checkout of pull request head, self-hosted runners on pull request triggers, risky `workflow_run` follow-ups, workflow/job env secret scope, long-lived cloud credential secret names, deployment-like jobs on untrusted pull request triggers, and privileged third-party actions. The analyzer pipeline now builds real `permissionSummary`, richer `triggerSummary`, and a new `securitySummary`, and the Results UI now groups security findings separately, shows confidence plus docs links, and surfaces permission/trigger security summary data in the report card. Added fixture-backed tests for every `GHA100` through `GHA110` rule, plus safe-workflow and profile-severity coverage.

### Commands Run

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Known Issues / Notes

- The security pack is intentionally conservative and static. It flags documented risky combinations and broad privilege patterns, but it does not attempt to prove exploitability, repository fork policy, or runtime trust boundaries that are only knowable from GitHub repository settings.
- Remediation text and rule docs URLs were aligned against the current GitHub Actions docs for permissions, `pull_request_target`, `workflow_run`, self-hosted runner access guidance, secrets usage, and OpenID Connect during implementation.

## Prompt 13

- Status: Completed.
- Outcome: Replaced the placeholder action inventory with a real `uses:` reference model that records step-level actions and job-level reusable workflows, classifies local/first-party/third-party/docker/reusable-workflow references, derives ref kinds and mutability, carries source locations, and attaches effective job permission context. Added the requested supply-chain rule pack `GHA200` through `GHA208` for third-party SHA pinning, first-party mutable tags, branch refs, short SHAs, Docker digests, dynamic `uses`, `actions/checkout` persisted credentials in write-capable jobs, `latest` tags, and privileged third-party references. Updated the Results UI with a dedicated Supply chain findings group plus an Action inventory table and filters for first-party, third-party, unpinned, and privileged references. Added fixture-backed tests for `actions/checkout@v4`, `thirdparty/action@main`, full SHA pins, Docker tag versus digest behavior, and reusable workflow inventory coverage.

### Commands Run

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Known Issues / Notes

- The branch-versus-tag distinction for arbitrary custom refs is still heuristic because GitHub Actions does not encode ref type directly in the YAML string. The analyzer treats obvious branch names such as `main`, `master`, and `refs/heads/*` as branches, while the broader unpinned-reference rules still catch other mutable refs.
- The analyzer intentionally does not generate automatic SHA replacement fixes for external actions or reusable workflows, because it cannot safely infer which reviewed commit the workflow author intended to trust.

## Prompt 14

- Status: Completed.
- Outcome: Added a static matrix preview engine via `expandMatrix()` that expands scalar axes, object-valued axes, `include`, and `exclude` entries, carries unresolved reasons for dynamic matrix expressions, and records per-job matrix summaries with counts, samples, `fail-fast`, and `max-parallel`. Upgraded `GHA407` to use the real expansion count and added matrix findings `GHA412`, `GHA413`, and `GHA414` for unmatched include and exclude entries, empty matrices, and unresolved dynamic matrices while preserving the existing `GHA053` matrix-context misuse rule from the expression pack. Updated the Results UI with a dedicated Matrix preview panel, per-job matrix badges, first-20 combination tables, a JSON copy button, and grouped matrix findings in the main findings view. Added pure expansion tests plus analyzer-level matrix rule coverage and summary assertions.

### Commands Run

- `npx prettier --write src\\features\\actions-analyzer\\components\\results-panel.tsx src\\features\\actions-analyzer\\components\\matrix-preview-panel.tsx src\\features\\actions-analyzer\\fixtures\\reports.ts src\\features\\actions-analyzer\\fixtures\\matrix-workflows.ts src\\features\\actions-analyzer\\lib\\analyze-workflows.ts src\\features\\actions-analyzer\\lib\\analyze-workflows.test.ts src\\features\\actions-analyzer\\lib\\expand-matrix.ts src\\features\\actions-analyzer\\lib\\expand-matrix.test.ts src\\features\\actions-analyzer\\lib\\rule-catalog.ts src\\features\\actions-analyzer\\lib\\rules\\index.ts src\\features\\actions-analyzer\\lib\\rules\\matrix.rules.ts src\\features\\actions-analyzer\\lib\\rules\\matrix.rules.test.ts src\\features\\actions-analyzer\\types\\analysis.ts src\\features\\actions-analyzer\\types\\domain.ts`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Known Issues / Notes

- Dynamic matrices such as `fromJSON(...)` are intentionally reported as unresolved rather than guessed. The preview engine preserves the job metadata and unresolved reasons, but it does not attempt to evaluate runtime-generated matrix data.
- Include matching follows static base-axis matching so the preview stays deterministic and review-friendly. That is sufficient for CI review and warning generation, but it still cannot mirror every runtime nuance of GitHub-hosted expression evaluation.

## Prompt 15

- Status: Completed.
- Outcome: Replaced the plain workflow textarea with a real `WorkflowCodeEditor` built directly on CodeMirror 6, including YAML highlighting, line numbers, search, copy/download/select-all actions, soft-wrap toggle, readable monospace styling, lint gutter diagnostics, active-finding line highlighting, and an explicit textarea fallback path for manual resilience or files over 1 MB. Wired analyzer findings into file-scoped editor diagnostics, added click-to-line from the Results panel with mobile-tab handoff back to the editor, and upgraded the multi-file tabs to show per-file severity counts while keeping edits synced into each `WorkflowInputFile`. Added focused tests for finding presentation helpers and finding-card selection, refreshed the smoke spec for the editor flow, and updated the input/results state wiring without breaking the worker-backed analyzer pipeline.

### Commands Run

- `npm install @codemirror/state @codemirror/view @codemirror/lang-yaml @codemirror/lint @codemirror/search`
- `npx prettier --write src/components/ui/textarea.tsx src/features/actions-analyzer/lib/finding-presentation.ts src/features/actions-analyzer/lib/finding-presentation.test.ts src/features/actions-analyzer/components/workflow-code-editor.tsx src/features/actions-analyzer/components/input-panel.tsx src/features/actions-analyzer/components/results-panel.tsx src/features/actions-analyzer/components/results-panel.test.tsx src/features/actions-analyzer/components/analyzer-workspace.tsx src/features/actions-analyzer/components/analyzer-page.tsx tests/e2e/smoke.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- YAML formatting remains intentionally deferred. The toolbar exposes the future slot, but it stays disabled for now so comments and author formatting are not accidentally lost by a naive stringify pass.
- The Playwright smoke spec was updated for the CodeMirror-based editor flow, but `test:e2e` was not executed in this prompt because Playwright browsers were not installed.

## Prompt 16

- Status: Completed.
- Outcome: Rebuilt the Results interface into a production-quality review surface. The analyzer summary now carries `jobCount`, and the Results panel now includes a score header with grade, severity counts, file/workflow/job/action metrics, analyzed-locally privacy badge, and last-analyzed timestamp. Added a full findings toolbar with search, severity toggles, category/file/job filters, security-only and warnings-only switches, grouping modes, and sort controls. Findings now render as compact review rows with a dedicated detail preview panel, while the report tab now presents explicit Security, Permission, Trigger, Reliability, Action Inventory, and Matrix Preview sections with accessible inventory tables and clearer empty/error states. Added helper-level tests for filtering/grouping logic, richer Results panel interaction tests, and small accessibility upgrades like table captions and header scopes.

### Commands Run

- `npx prettier --write src/features/actions-analyzer/types/domain.ts src/features/actions-analyzer/lib/summary.ts src/features/actions-analyzer/lib/analyze-workflows.ts src/features/actions-analyzer/lib/analyze-workflows.test.ts src/features/actions-analyzer/fixtures/reports.ts src/features/actions-analyzer/lib/results-presentation.ts src/features/actions-analyzer/lib/results-presentation.test.ts src/features/actions-analyzer/components/results-panel.tsx src/features/actions-analyzer/components/results-panel.test.tsx src/features/actions-analyzer/components/matrix-preview-panel.tsx src/features/actions-analyzer/components/analyzer-page.tsx src/features/actions-analyzer/components/analyzer-workspace.tsx docs/IMPLEMENTATION_LOG.md`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- The finding detail panel is intentionally a lightweight review preview for this prompt. It supports click-to-open and remediation review now, but deeper workflows such as richer navigation and fix actions remain for later prompts.
- The Playwright smoke spec remains present, but `test:e2e` was not executed in this prompt because Playwright browsers were not installed.

## Prompt 17

- Status: Completed.
- Outcome: Added a full finding-detail and remediation workflow across both the analyzer engine and the Results UI. The report contract now carries `ignoredFindings`, the analyzer parses `# authos-ignore RULE_ID: reason` comments, suppresses one matching finding on the relevant next line, and emits low-severity `GHA901` when a suppression comment omits its reason. Added patchable `SuggestedFix` support with preview/apply helpers, stale-analysis protection, and new reliability rules `GHA401` through `GHA405` for missing job timeouts, missing deploy concurrency, `continue-on-error: true`, broad cache keys, and missing artifact retention. Safe fixes now exist for missing top-level permissions, missing job timeouts, artifact retention, and `actions/checkout` persisted credentials when the source range is reliable; review/manual previews now exist for deploy concurrency, `continue-on-error`, cache-key guidance, and untrusted-context env-boundary guidance. The Results panel now renders richer finding detail with why-it-matters copy, remediation, docs link, evidence, affected actions, Markdown/remediation/ignore-comment copy actions, suggested patch previews, explicit apply-fix controls, and a collapsed Ignored findings section.

### Commands Run

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- Safe patch application is intentionally conservative. Authos only applies a fix when the finding includes an exact range and the current file content still matches the last analyzed snapshot; otherwise the UI asks the user to re-run analysis first.
- Review/manual fixes intentionally favor explicit copied patches or snippets over automatic mutation when the target change depends on workflow intent, trust boundaries, or ecosystem-specific cache semantics.

## Prompt 18

- Status: Completed.
- Outcome: Added two higher-signal review differentiators to the analyzer report: a best-effort permission minimizer and an attack-path explanation panel. The analyzer now derives workflow-level and job-level permission recommendations with a conservative `contents: read` baseline, trust labels, risk labels, third-party action awareness, scope-by-scope rationale, and copyable YAML snippets for both workflow-level reductions and job overrides. It also derives `attackPaths` from static combinations of enabled findings and workflow structure, covering `pull_request_target` plus PR-head checkout with write tokens, self-hosted shell execution on untrusted triggers, privileged unpinned third-party actions, `workflow_run` artifact handoffs into privileged follow-up jobs, and untrusted shell-context usage in privileged jobs. The Results UI now exposes both a `PermissionMinimizerPanel` and an `AttackPathPanel` with accessible tables, explicit heuristic language, copyable YAML, and actionable mitigation checklists. Added dedicated fixture-backed tests for permission recommendation behavior and all five attack-path patterns, plus updated sample report fixtures and Results panel assertions.

### Commands Run

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Known Issues / Notes

- Permission minimizer output is intentionally conservative and review-oriented. It uses static workflow heuristics, not repository settings or runtime API traces, so recommendations are labeled as review guidance rather than certainty.
- Attack paths are explanation aids, not exploit proofs. The panel is careful to describe what a risky combination could allow or increase, while leaving room for branch protections, approvals, and repository policy that are not encoded in workflow YAML alone.

## Prompt 19

- Status: Completed.
- Outcome: Added production-ready export, sharing, and report-comparison flows so analyzer output is easier to use in real code review. The Results panel now exposes a `ReportExportPanel` with `Copy PR comment`, `Copy share link`, `Download JSON`, `Download SARIF`, and `Download HTML` actions backed by browser-safe clipboard/download helpers and toast feedback. Markdown exports summarize score, top findings, action pinning, permissions, and matrix impact without embedding full workflow content; JSON exports serialize the full `WorkflowAnalysisReport`; SARIF exports produce a SARIF 2.1.0-like structure with rule metadata and location mapping; and HTML exports render a standalone escaped report with no external scripts. Added privacy-safe share-state helpers so copied links preserve safe filters, sample IDs, and analyzer settings without embedding pasted or uploaded YAML in the URL, and updated the page bootstrap path so those safe settings restore when a shared link is opened.
- Outcome continued: Added a dedicated `Compare reports` workspace tab with a `CompareReportsPanel` that treats the current analysis as "Current" and compares it against either a second pasted/uploaded/sample input or the previously analyzed current report. The compare workflow now categorizes findings into new, resolved, and unchanged buckets using stable finding keys, highlights score delta and new high-or-critical findings, and supports copying a Markdown compare summary for PR review. Added focused tests for markdown export snapshots, JSON and SARIF shape, HTML escaping, privacy-safe share parsing, and compare-mode categorization behavior.

### Commands Run

- `npx prettier --write src/features/actions-analyzer/components/analyzer-page.tsx src/features/actions-analyzer/components/analyzer-workspace.tsx src/features/actions-analyzer/components/results-panel.tsx src/features/actions-analyzer/components/results-panel.test.tsx src/features/actions-analyzer/components/report-export-panel.tsx src/features/actions-analyzer/components/compare-reports-panel.tsx src/features/actions-analyzer/components/action-toast.tsx src/features/actions-analyzer/lib/report-compare.ts src/features/actions-analyzer/lib/report-compare.test.ts src/features/actions-analyzer/lib/report-share.ts src/features/actions-analyzer/lib/report-share.test.ts src/features/actions-analyzer/lib/report-exports.ts src/features/actions-analyzer/lib/report-exports.test.ts src/features/actions-analyzer/lib/browser-actions.ts src/features/actions-analyzer/lib/use-action-toast.ts`
- `npx prettier --write src/features/actions-analyzer/lib/use-workflow-inputs.ts src/features/actions-analyzer/components/analyzer-page.tsx src/features/actions-analyzer/components/report-export-panel.tsx src/features/actions-analyzer/components/compare-reports-panel.tsx src/features/actions-analyzer/lib/report-exports.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- Share links remain privacy-safe by default and intentionally do not support embedding full workflow content. Content-including compressed URL state is still deferred until there is a safer transport and size strategy.
- The compare workflow currently uses either an explicitly analyzed previous input or the last analyzed current report as its baseline. That covers before/after review well today, but persistent saved report history is still a later enhancement.

## Prompt 20

- Status: Completed.
- Outcome: Added optional public GitHub import as a browser-only workflow ingestion path with no login, OAuth, backend proxy, or private-repository support. The analyzer input toolbar now includes an `Import from GitHub` modal that auto-detects repository, blob, raw, and tree URLs; accepts an optional branch/ref override; shows public-only/privacy notices plus unauthenticated API rate-limit guidance; previews fetched workflow files before import when multiple files are found; and imports GitHub content into the existing `WorkflowInputFile` pipeline with source kind `github`. Added a dedicated `github-import` utility layer with URL parsing, blob-to-raw conversion, public file fetching, public workflow-directory listing with `main` to `master` fallback, workflow-path detection, and clear user-facing error mapping for invalid URLs, repo/file misses, missing workflows, rate limits, network/CORS failures, and file-size limits. Updated the privacy copy to reflect the live public GitHub import behavior and added focused unit tests for parser coverage, API response mapping, fallback behavior, and error cases.

### Commands Run

- `npx prettier --write src\\features\\actions-analyzer\\lib\\github-import.ts src\\features\\actions-analyzer\\lib\\github-import.test.ts src\\features\\actions-analyzer\\components\\github-import-dialog.tsx src\\features\\actions-analyzer\\lib\\use-workflow-inputs.ts src\\features\\actions-analyzer\\components\\input-panel.tsx src\\features\\actions-analyzer\\components\\analyzer-workspace.tsx src\\features\\actions-analyzer\\components\\compare-reports-panel.tsx src\\features\\actions-analyzer\\components\\analyzer-page.tsx src\\features\\actions-analyzer\\components\\privacy-notice.tsx src\\app\\privacy\\page.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- Public repository import uses GitHub's unauthenticated public API for directory listing, so rate limiting can still block repository browsing temporarily even though direct raw-file imports do not require a GitHub login.
- GitHub imports stay in the live browser workspace and are not added to privacy-safe share links. There is still no persistent content-history feature in this app, so imported GitHub workflow content is not stored beyond the current session state.

## Prompt 21

- Status: Completed.
- Outcome: Polished the GitHub Actions analyzer into a more reusable, bookmarkable product surface. Added a persistent settings drawer with analyzer profiles, rule toggles, matrix threshold control, auto-run, soft-wrap, and an explicit opt-in for remembering workflow content on the device. Added local recent-history storage that keeps metadata by default, can reopen public GitHub imports and samples without saving content, and only stores pasted/uploaded workflow YAML when the user explicitly enables local content memory. Added a reusable overlay panel foundation plus a recent history drawer and keyboard shortcuts dialog, wired global shortcuts for analyze, findings search, and PR-comment copy, and moved copy/download/import/apply-fix feedback onto the shared toast system.
- Outcome continued: Added a theme toggle with system-preference support and dark theme CSS variables, tightened responsive behavior with overflow-safe layout updates and horizontally scrollable file tabs, improved privacy copy to explain local-history behavior, and added focused tests for preferences, history privacy behavior, and overlay accessibility/focus restoration.

### Commands Run

- `npx prettier --write src/features/actions-analyzer/components/analyzer-page.tsx src/features/actions-analyzer/components/analyzer-workspace.tsx src/features/actions-analyzer/components/workspace-toolbar.tsx src/features/actions-analyzer/components/report-export-panel.tsx src/features/actions-analyzer/components/compare-reports-panel.tsx src/features/actions-analyzer/components/github-import-dialog.tsx src/features/actions-analyzer/components/analyzer-settings-drawer.tsx src/features/actions-analyzer/components/analysis-history-panel.tsx src/features/actions-analyzer/components/keyboard-shortcuts-dialog.tsx src/features/actions-analyzer/components/privacy-notice.tsx src/features/actions-analyzer/components/action-toast.tsx src/features/actions-analyzer/components/results-panel.tsx src/features/actions-analyzer/components/results-panel.test.tsx src/features/actions-analyzer/lib/analyzer-preferences.test.ts src/features/actions-analyzer/lib/analysis-history.test.ts src/components/ui/overlay-panel.test.tsx src/test/setup.ts src/app/privacy/page.tsx src/features/actions-analyzer/lib/analyzer-preferences.ts src/features/actions-analyzer/lib/analysis-history.ts src/features/actions-analyzer/lib/use-workflow-inputs.ts src/components/layout/theme-provider.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- Local history still intentionally caps itself to recent runs and is device-local only. There is no backend sync, login-based portability, or server-side retention path in this prompt.
- `test:e2e` remains configured but was not executed in this prompt.

## Prompt 22

- Status: Completed.
- Outcome: Turned the GitHub Actions analyzer route into a more crawlable landing page without pushing the tool below the fold. Added page-specific title, description, Open Graph metadata, canonical configuration, and two JSON-LD blocks for `WebApplication` and `FAQPage`. Expanded the developer-focused content below the workspace to cover checks, use cases, workflow, examples, FAQ, and related tools, with each example wired to load a real sample back into the tool and scroll to the workspace. Added a deployment-friendly `NEXT_PUBLIC_SITE_URL` override so canonical, sitemap, robots, and structured data can emit a real origin in production while keeping a local fallback for development.
- Outcome continued: Added `robots` and `sitemap` metadata routes for the home page, privacy page, and analyzer page; strengthened privacy-to-tool internal linking around the local-processing promise; and added focused tests for the structured data serialization and shapes.

### Commands Run

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Known Issues / Notes

- Canonical, sitemap, and structured-data URLs default to `https://authos.local` in local development. Set `NEXT_PUBLIC_SITE_URL` in deployment so crawlers see the real production origin.
- `test:e2e` remains configured but was not executed in this prompt.
