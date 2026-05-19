# Performance notes

## Bundle analysis

Run `npm run analyze` with `ANALYZE=true` to generate a Next.js bundle report. The largest client chunks are expected to be:

- CodeMirror editor (`workflow-code-editor`, lazy-loaded from `input-panel`)
- `yaml` parser/stringifier used by the analyzer engine and formatter
- Analyzer results UI (`results-panel`)

## Runtime budgets

- `src/features/actions-analyzer/lib/performance.test.ts` keeps multi-file analysis under the configured budget on CI hardware.
- Heavy analysis runs in a Web Worker when supported, with a main-thread fallback.

## Lazy loading

- The workflow editor is loaded with `React.lazy` inside `input-panel.tsx` so the initial tool route ships a smaller JS payload.
