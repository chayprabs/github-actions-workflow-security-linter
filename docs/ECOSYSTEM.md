# Project deployment and ecosystem notes

## Production URL and `NEXT_PUBLIC_SITE_URL`

| Finding | Notes |
|--------|--------|
| **`NEXT_PUBLIC_SITE_URL` is optional locally** | `src/lib/site.ts` falls back to `http://127.0.0.1:3000` when unset |
| **Production requirement** | Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin so `robots.txt`, `sitemap.xml`, canonical URLs, and JSON-LD match the live site |

**Launch action:** Deploy as a standard Next.js app (Vercel or any host), set `NEXT_PUBLIC_SITE_URL`, verify `/` loads over HTTPS.

## Architecture

This repository is a **standalone Next.js app** with browser-local workflow analysis. There is no backend upload path for pasted YAML. Public GitHub import uses the browser to call GitHub APIs directly.

## CI

`.github/workflows/ci.yml` runs `typecheck`, `lint`, `test`, `build`, and Playwright `test:e2e`.

## Dependencies

- `zod` validates browser-persisted analyzer preferences (`preferences-schema.ts`).
- Workflow YAML parsing uses a custom parser and rule packs under `src/features/actions-analyzer/lib/rules/`.

## Licensing

MIT — see `LICENSE` and `package.json`.
