# Authos Ecosystem — Resolved Facts (2026-05-19)

This document answers the open questions from the repository archaeology pass using **evidence gathered from this repo, GitHub’s public API, the author’s public GitHub profile, and the local `authos - apps/tools` workspace on disk**.

## 1. Production URL and `NEXT_PUBLIC_SITE_URL`

| Finding | Evidence |
|--------|----------|
| **No public deployment is configured today** | GitHub API `homepage: null`, `has_pages: false` for `chayprabs/github-actions-workflow-security-linter` |
| **Common Vercel hostname does not resolve** | `https://github-actions-workflow-security-linter.vercel.app` returned HTTP 404 when probed |
| **`NEXT_PUBLIC_SITE_URL` is optional** | `src/lib/site.ts` falls back to `https://authos.local` when unset |
| **Production requirement** | Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin before launch so `robots.txt`, `sitemap.xml`, canonical URLs, and JSON-LD match the live site (see `.env.example`) |

**Action for launch:** Deploy (Vercel or any Next.js host), set `NEXT_PUBLIC_SITE_URL`, verify `/tools/github-actions-workflow-analyzer` loads over HTTPS.

## 2. Other Authos tools and shared design system

Authos is a **product line of separate Next.js apps**, not a published npm design-system package. Each tool copies the same architectural pattern (App Router, tokenized Tailwind, tool registry, browser-local analysis, Vitest + Playwright).

Local sibling workspaces (author machine, `Desktop/authos - apps/tools/`):

| Folder | Package name | Product (from README) |
|--------|----------------|------------------------|
| `tools/2` | `authos` | PostgreSQL Migration Safety Checker |
| `tools/3` | `authos` | Kubernetes Manifest Analyzer |
| `tools/4` | `authos-terraform-plan-visualizer` | Terraform Plan Visualizer |
| `tools/5` | `authos-github-actions-workflow-analyzer` | **This repo** (GitHub Actions analyzer) |
| `tools/1` | (workspace present; root README not found in scan) | Likely an earlier JSON/schema tool iteration |

**Public GitHub:** As of this investigation, `chayprabs`’s public repos list includes **`github-actions-workflow-security-linter`** as the Authos-related shipping target; other tools appear to live in the private/local monorepo folder above.

**Shared UI:** Reimplemented per repo under `src/components/ui/` — **no shared package** in this repository.

## 3. CI and test status on `main`

| Finding | Evidence |
|--------|----------|
| **Remote had no CI** | `GET .../contents/.github/workflows` → 404 before this pass |
| **CI added in-repo** | `.github/workflows/ci.yml` — `typecheck`, `lint`, `test`, `build`, and Playwright `test:e2e` on Ubuntu |
| **Local verify (2026-05-19)** | `npm run typecheck`, `lint`, `build` succeeded; Vitest had fork-worker timeouts on Windows paths with spaces until `vitest.config.ts` was switched to `pool: "threads"` |
| **Launch commit** | `1304d87` (“Harden GitHub Actions analyzer for launch”) — full green CI should be confirmed on GitHub Actions after pushing the new workflow |

## 4. Why `zod` is in `package.json`

**Resolved:** `zod` validates **browser-persisted analyzer preferences** (`src/features/actions-analyzer/lib/preferences-schema.ts`) so corrupted `localStorage` cannot crash the settings drawer. It is not used for workflow YAML parsing (that remains custom parser + rules).

## 5. Monorepo vs one app per tool

**Resolved:** **One Next.js app per tool** today. Each tool is a standalone deployable with its own `package.json` and route under `/tools/...`. A future Authos “directory” site could link out to multiple deployments or merge into a turborepo — nothing in this repo implements that yet. The home page already models a **multi-tool catalog** with one live entry.

## 6. Licensing and commercial model

| Finding | Evidence |
|--------|----------|
| **GitHub `license: null`** before LICENSE commit | Public API |
| **In-repo license added** | `LICENSE` (MIT), `package.json` `"license": "MIT"` |
| **Commercial model** | **Not stated** — product is MIT OSS; no pricing, SaaS backend, or entitlement logic in code |

## 7. Accuracy and false positives

**No production telemetry** (by design — see `docs/ROADMAP.md`).

**How accuracy is enforced today:**

1. **Golden fixtures** — `src/features/actions-analyzer/fixtures/golden/*.yml` + `expected-findings.json`, tested by `golden-fixtures.test.ts`
2. **Rule pack unit tests** — per-domain `*.rules.test.ts` files
3. **Deterministic static analysis** — no ML; rules document conservative heuristics (e.g. permission minimizer, attack paths)
4. **Rule execution failures surfaced** — `GHA902` + `report.ruleExecutionFailures[]` when an internal rule throws (no silent drops)

See `docs/ACCURACY.md` for how to extend golden coverage when tuning rules.
