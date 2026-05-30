# Launch Checklist

## Before launch

- `npm run verify` passes from a clean checkout.
- `CI=1 npm run test:e2e` passes with Playwright Chromium installed.
- README, RULES.md, and privacy/terms pages match shipped behavior.
- `NEXT_PUBLIC_SITE_URL` is documented in `.env.example`.

## Launch-day deploy

- Deploy with `npm run build` and your host's Next.js runtime (`npm run start` locally).
- Enable HTTPS on the public hostname.
- Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin.

## Post-deploy verification

- Open `/` and analyze a pasted workflow.
- Upload a workflow file and confirm findings appear.
- Import a public GitHub workflow URL.
- Confirm settings persist across reload.
- Confirm `/privacy` and `/terms` load from the footer.
- Confirm legacy `/tools/github-actions-workflow-analyzer` redirects to `/`.
- Run `SMOKE_BASE_URL=<origin> npm run smoke:prod`.
