# GHA Workflow Analyzer

Browser-local **GitHub Actions workflow security and lint analyzer**. Paste, upload, sample-load, or import public GitHub workflow YAML and get deterministic findings for syntax, expressions, permissions, risky triggers, supply-chain pinning, matrix scale, and CI reliability.

## Features

- Local analysis for pasted and uploaded workflow files (no server upload).
- Public GitHub import for public repos and workflow URLs (browser fetch; no login).
- Multi-file workspace with editor diagnostics, findings, detail panels, safe fixes, compare mode, and exports.
- PR-ready Markdown, JSON, SARIF, and static HTML exports.
- Optional on-device history and preferences.

## Quick start

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000 — the analyzer runs on the home page.

Optional environment variable:

- `NEXT_PUBLIC_SITE_URL` — canonical URLs, Open Graph, `robots.txt`, and `sitemap.xml` for production (see `.env.example`).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run verify` | typecheck + lint + test + build |
| `npm run test:e2e` | Playwright browser tests |
| `npm run smoke:prod` | Post-deploy route checks (`SMOKE_BASE_URL` required) |

Install Chromium once before e2e:

```bash
npx playwright install chromium
```

## Privacy

- Pasted and uploaded YAML is analyzed in your browser.
- No login required.
- No backend proxy for pasted or uploaded content.
- Public GitHub import is explicit and browser-initiated only.

See [Privacy Policy](/privacy) and [Terms & Conditions](/terms).

## Deployment

```bash
npm install
npm run verify
npm run build
npm run start
```

Set `NEXT_PUBLIC_SITE_URL` to your HTTPS origin. Vercel: import as a standard Next.js project.

## Docs

- [docs/RULES.md](docs/RULES.md) — rule catalog
- [docs/ACCURACY.md](docs/ACCURACY.md) — testing and heuristics
- [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md)
- [docs/CI_INTEGRATION.md](docs/CI_INTEGRATION.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CHANGELOG.md](CHANGELOG.md)
- [SECURITY.md](SECURITY.md)

## License

MIT — see [LICENSE](LICENSE).
