# Contributing

Thanks for helping improve the GHA Workflow Analyzer.

## Development setup

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000

## Quality gates

```bash
npm run verify
CI=1 npm run test:e2e
```

## Adding an analyzer rule

1. Add the rule to `src/features/actions-analyzer/lib/rule-catalog.ts`.
2. Implement the rule under `src/features/actions-analyzer/lib/rules/`.
3. Register it in `src/features/actions-analyzer/lib/rules/index.ts`.
4. Add unit tests and update `docs/RULES.md`.
5. Update golden fixtures if the rule should appear in shipped samples.

## Pull requests

- Keep changes focused and include tests when behavior changes.
- Update user-facing docs when routes, privacy posture, or rule IDs change.
