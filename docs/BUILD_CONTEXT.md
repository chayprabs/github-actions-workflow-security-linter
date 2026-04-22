# Build Context

- Product: Authos browser-based GitHub Actions Workflow Security and Lint Analyzer.
- Baseline stack: Next.js App Router, React 19, TypeScript strict mode, Tailwind CSS, ESLint, Vitest, and Playwright scaffolding.
- Core constraint: analysis is intended to run locally in the browser with no login, no AI APIs, no database, and no backend upload of pasted content.
- UI approach: token-driven and componentized so the visual system can be replaced later without rewriting product logic.
- Analyzer approach for Prompt 1: scaffold the route, docs, reusable primitives, worker boundary, sample fixtures, and deterministic analysis seed for future prompts.
