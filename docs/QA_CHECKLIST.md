# QA Checklist

## Local setup

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- Optional browser suite: `npx playwright install chromium` then `npm run test:e2e`

## Functional flows

- Paste workflow YAML and analyze it locally.
- Upload one workflow file and analyze it locally.
- Upload multiple files or a folder and confirm the workspace tabs stay usable.
- Load a sample workflow and confirm findings appear.
- Import a public GitHub workflow URL and confirm the file enters the workspace as a GitHub source.
- Import a public GitHub repository URL and confirm `.github/workflows` files can be previewed before import.
- Copy a PR comment, download JSON, download SARIF, and download HTML.
- Open settings, change values, reload the page, and confirm they persist.
- Confirm history can reopen sample and public GitHub entries without storing local content by default.

## Security and privacy QA

- Confirm paste and upload analysis do not trigger network requests.
- Confirm GitHub import is the only explicit network-backed flow.
- Confirm share links do not include private workflow content by default.
- Confirm local history stores metadata only unless `Remember workflow content on this device` is enabled.
- Confirm HTML report output escapes user-controlled content.
- Confirm privacy page, tool page, and UI notices all describe the local-processing promise consistently.

## Accessibility QA

- Tab through the main workspace controls and confirm focus remains visible.
- Confirm all visible action buttons have accessible names.
- Confirm `Esc` closes dialogs and drawers and focus returns reasonably.
- Confirm severity appears as text labels, not only as color.
- Confirm tables expose readable headers and report sections are navigable.
- Confirm mobile tabs remain usable on narrow screens.

## Performance QA

- Confirm the analyzer uses the Web Worker path when the browser supports workers.
- Confirm the editor bundle loads lazily and the textarea fallback remains usable while it loads.
- Confirm a large synthetic workflow stays within the local time budget covered by the automated performance test.
- Confirm the tool page does not horizontally overflow on a narrow mobile viewport.

Performance note:

- The shipped test suite includes a large synthetic workflow performance check and a worker-path hook test. The editor is also lazy-loaded so the initial route does not eagerly ship the full CodeMirror bundle.

## SEO and metadata QA

- Confirm the tool page title, description, Open Graph metadata, canonical URL, and JSON-LD render in production output.
- Confirm `robots.txt` and `sitemap.xml` include the home page, privacy page, and tool route.
- Confirm the privacy page links back to the tool and the tool page links to home and privacy.

## Deployment QA

- Confirm the app builds without required environment variables.
- Confirm `NEXT_PUBLIC_SITE_URL` is optional locally and only needed for a real public origin in production.
- Confirm the built app serves `/`, `/privacy`, `/robots.txt`, `/sitemap.xml`, and `/tools/github-actions-workflow-analyzer`.
