# Launch Checklist

## Before launch

- Confirm `npm install`, `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` pass from a clean checkout.
- Confirm `npm run test:e2e` passes on a machine with Playwright Chromium installed.
- Confirm the README and launch docs reflect the shipped behavior.
- Confirm `docs/RULES.md` matches the current rule catalog.
- Confirm the privacy page, metadata, canonical URLs, JSON-LD, `robots.txt`, and `sitemap.xml` are present in the production build.
- Confirm there are no required environment variables.
- Confirm `NEXT_PUBLIC_SITE_URL` is set in production so public metadata uses the deployed origin.

## Launch-day deploy

- Deploy the standard Next.js build output on the chosen platform.
- Use `npm run build` as the build command and `npm run start` as the local runtime equivalent.
- Confirm HTTPS is enabled on the public hostname.
- Confirm the tool route loads without any backend setup.

## Post-deploy verification

- Open `/` and verify the tool link is visible.
- Open `/tools/github-actions-workflow-analyzer` and verify the analyzer loads above the fold.
- Paste a workflow and confirm local analysis works.
- Upload a workflow file and confirm findings appear.
- Import a public GitHub workflow URL and confirm the browser fetch succeeds.
- Confirm settings persist across reloads.
- Confirm the dark theme toggle and system theme behavior work.
- Confirm `robots.txt` and `sitemap.xml` resolve on the public origin.
- Confirm the privacy page states the local-processing promise accurately.

## Hosting notes

- Provider-neutral: any platform that supports standard Next.js App Router builds is sufficient.
- Vercel: works without custom server code or API routes; set `NEXT_PUBLIC_SITE_URL` to the production origin for clean metadata output.
