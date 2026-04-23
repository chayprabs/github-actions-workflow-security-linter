# Authos GitHub Actions Workflow Security and Lint Analyzer

Authos is a browser-local GitHub Actions workflow analyzer built for code review, CI hardening, and fast workflow debugging. Paste, upload, sample-load, or public GitHub-import workflow YAML and get deterministic findings for syntax, expressions, permissions, risky triggers, supply-chain pinning, matrix scale, and CI reliability.

## What the product includes

- Browser-local analysis for pasted and uploaded workflow files.
- Public GitHub import for public repos and public workflow URLs without login.
- Multi-file workspace with editor diagnostics, findings filters, detail panels, fixes, compare mode, exports, settings, dark mode, and mobile tabs.
- PR-ready Markdown, JSON, SARIF, and escaped static HTML exports.
- Local history metadata by default, with optional on-device content memory.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the local app:

```bash
npm run dev
```

3. Open `http://127.0.0.1:3000`.

Optional environment variable:

- `NEXT_PUBLIC_SITE_URL`
  Use this in deployed environments so canonical URLs, JSON-LD, `robots.txt`, and `sitemap.xml` point at the real public origin. It is optional in local development because the app falls back to `https://authos.local`.

## Scripts

- `npm run dev`: Start the Next.js development server.
- `npm run typecheck`: Generate route types and run TypeScript checks.
- `npm run lint`: Run ESLint with zero warnings allowed.
- `npm run test`: Run the Vitest unit and component suite.
- `npm run test:e2e`: Run the Playwright browser suite.
- `npm run build`: Create a production build.
- `npm run start`: Serve the production build locally.
- `npm run format`: Run Prettier across the repo.

Playwright note:

```bash
npx playwright install chromium
```

Run that once on a fresh machine before `npm run test:e2e`.

## Privacy model

- Pasted and uploaded workflow content is analyzed locally in the browser.
- Authos does not require login for the live analyzer.
- There is no backend proxy or server upload path for pasted or uploaded workflow YAML.
- Public GitHub import is the only network-backed product feature, and it is explicit in the UI.
- Local history stores metadata only by default.
- Full workflow content is only stored locally if the user explicitly enables `Remember workflow content on this device`.
- Privacy-safe share links do not embed pasted or uploaded workflow content by default.
- Static HTML reports escape user-controlled content before rendering.

## Analyzer architecture

- `src/app/tools/github-actions-workflow-analyzer/page.tsx`
  Server-rendered route metadata, canonical configuration, and JSON-LD for the tool.
- `src/features/actions-analyzer/components/analyzer-page.tsx`
  Main client surface that coordinates settings, history, shortcuts, imports, analysis, compare mode, and page-level interaction state.
- `src/features/actions-analyzer/lib/use-workflow-inputs.ts`
  Normalizes pasted, uploaded, sampled, and GitHub-imported files into `WorkflowInputFile[]`.
- `src/features/actions-analyzer/lib/use-workflow-analysis.ts`
  Runs analysis in a Web Worker when available, with a safe main-thread fallback.
- `src/features/actions-analyzer/workers/analysis.worker.ts`
  Browser worker entrypoint for the local analyzer pipeline.
- `src/features/actions-analyzer/lib/analyze-workflows.ts`
  Pure analysis orchestration: parse, normalize, run rules, apply ignore comments, score findings, build summaries, and derive exports.
- `src/features/actions-analyzer/lib/parse-workflow-yaml.ts`
  YAML parsing, source maps, and parse diagnostics.
- `src/features/actions-analyzer/lib/normalize-workflow.ts`
  GitHub Actions-specific normalization into typed workflow models.
- `src/features/actions-analyzer/lib/rules/*.ts`
  Rule packs for syntax, expressions, security, supply chain, reliability, and matrix behavior.
- `src/features/actions-analyzer/lib/report-exports.ts`
  Markdown, JSON, SARIF, and static HTML report generation.

## How to add a rule

1. Add the rule definition to `src/features/actions-analyzer/lib/rule-catalog.ts`.
2. Implement a `RuleModule` in the appropriate file under `src/features/actions-analyzer/lib/rules/`.
3. Register the module in `src/features/actions-analyzer/lib/rules/index.ts`.
4. Add focused unit coverage for the new rule and update golden fixture expectations if the new rule should appear in a shipped fixture.
5. Update `docs/RULES.md` so the public rule inventory stays accurate.

## Deployment

This product deploys as a standard Next.js app with no backend service and no required environment variables.

Provider-neutral deployment steps:

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

Then deploy the Next.js app using your host's standard build and runtime flow.

- Build command: `npm run build`
- Start command: `npm run start`
- Required env vars: none
- Optional env vars: `NEXT_PUBLIC_SITE_URL`

Vercel notes:

- Import the repo as a normal Next.js project.
- No backend functions or private runtime secrets are required for the current product.
- Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin so metadata and sitemap output use the public hostname.
- The public GitHub import feature works client-side and does not need a server proxy.

## Additional docs

- [docs/RULES.md](</C:/Users/chait/OneDrive/Desktop/authos - apps/tools/5/docs/RULES.md>)
- [docs/QA_CHECKLIST.md](</C:/Users/chait/OneDrive/Desktop/authos - apps/tools/5/docs/QA_CHECKLIST.md>)
- [docs/LAUNCH_CHECKLIST.md](</C:/Users/chait/OneDrive/Desktop/authos - apps/tools/5/docs/LAUNCH_CHECKLIST.md>)
- [docs/ROADMAP.md](</C:/Users/chait/OneDrive/Desktop/authos - apps/tools/5/docs/ROADMAP.md>)
