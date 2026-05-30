# QA Checklist

## Local setup

- `npm install`
- `npm run verify` (typecheck, lint, unit tests, production build)
- Optional browser suite: `npx playwright install chromium` then `CI=1 npm run test:e2e`

## Functional flows (home page analyzer at `/`)

- Paste workflow YAML and analyze it locally.
- Upload one workflow file and analyze it locally.
- Upload multiple files or a folder and confirm workspace tabs stay usable.
- Load a sample workflow and confirm findings appear.
- Import a public GitHub workflow URL and confirm the file enters the workspace.
- Import a public GitHub repository URL and confirm `.github/workflows` files can be previewed before import.
- Copy a PR comment, download JSON, download SARIF, and download HTML.
- Open settings, change values, reload the page, and confirm they persist.
- Confirm history can reopen sample and public GitHub entries without storing content by default.
- Confirm compare mode can diff two analysis runs.
- Confirm `# gha-ignore RULE_ID: reason` suppresses matching findings.

## Security and privacy QA

- Confirm paste and upload analysis do not trigger network requests.
- Confirm GitHub import is the only explicit network-backed flow.
- Confirm share links do not include private workflow content by default.
- Confirm local history stores metadata only unless content memory is enabled.
- Confirm HTML report output escapes user-controlled content.

## Deployment QA

- Confirm the app builds without required environment variables.
- Set `NEXT_PUBLIC_SITE_URL` in production for canonical URLs and sitemap.
- Confirm `/`, `/privacy`, `/terms`, `robots.txt`, and `sitemap.xml` load.
- Confirm `/tools/github-actions-workflow-analyzer` redirects to `/`.
- Run `SMOKE_BASE_URL=https://your-origin npm run smoke:prod` after deploy.
