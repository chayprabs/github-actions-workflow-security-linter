import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";

export const analyzerToolTitle =
  "GitHub Actions Workflow Security and Lint Analyzer - Authos";

export const analyzerToolDescription =
  "Paste or upload GitHub Actions workflow YAML to find syntax errors, risky permissions, unsafe triggers, unpinned actions, matrix issues, and CI reliability problems. Browser-local, no login.";

export const analyzerCheckAreas = [
  {
    description:
      "Catch invalid YAML, malformed `on` blocks, broken job definitions, missing runners, and other structural issues before GitHub rejects a workflow run.",
    title: "Syntax and workflow structure",
  },
  {
    description:
      "Review `${{ }}` expressions, context usage, dynamic refs, and untrusted data flowing into steps, jobs, or action references.",
    title: "Expressions and contexts",
  },
  {
    description:
      "Highlight broad token scopes, missing top-level permissions, `write-all`, and places where the workflow can likely be reduced to least privilege.",
    title: "Token permissions",
  },
  {
    description:
      "Flag risky triggers such as `pull_request_target`, privileged `workflow_run` follow-ups, and other event combinations that can expose secrets or write-capable tokens.",
    title: "Risky triggers like `pull_request_target`",
  },
  {
    description:
      "Surface floating action refs, mutable first-party tags, unreviewed third-party actions, short SHAs, and Docker tags without digests.",
    title: "Unpinned actions and supply-chain risks",
  },
  {
    description:
      "Call out shell-oriented risk patterns such as untrusted PR input reaching commands, unsafe interpolation in privileged jobs, and dangerous execution chains.",
    title: "Shell injection patterns",
  },
  {
    description:
      "Inspect matrix expansion size, unresolved combinations, missing timeouts, concurrency gaps, and other CI reliability issues that break builds or hide flaky behavior.",
    title: "Matrix and reliability issues",
  },
] as const;

export const analyzerUseCases = [
  "Review a workflow PR before merge and copy a PR-ready summary.",
  "Preflight a release workflow before it starts minting tokens or publishing artifacts.",
  "Check a public open-source workflow after editing it locally or importing it from GitHub.",
  "Audit unpinned actions and other supply-chain drift in an existing repo.",
  "Debug invalid workflow YAML without waiting on GitHub's parser.",
  "Generate a PR-ready report, SARIF file, or JSON snapshot for review.",
] as const;

export const analyzerHowItWorksSteps = [
  {
    description:
      "Paste YAML, upload local files, load an example, or import public workflows straight from GitHub in the browser.",
    title: "Paste, upload, or import",
  },
  {
    description:
      "Run deterministic checks locally without sending pasted or uploaded workflow content to Authos.",
    title: "Analyze locally",
  },
  {
    description:
      "Filter findings by severity, file, job, or category and inspect the exact workflow location tied to each issue.",
    title: "Review findings",
  },
  {
    description:
      "Apply safe local fixes where available, or copy ignore comments, remediation notes, and suggested patches.",
    title: "Apply or copy fixes",
  },
  {
    description:
      "Export a PR comment, SARIF, JSON, or HTML report for the next review step.",
    title: "Export review output",
  },
] as const;

export const analyzerExampleWorkflows = [
  {
    description:
      "A minimal Node CI workflow with explicit top-level permissions, timeouts, and pinned first-party actions.",
    sampleId: "safe-basic",
    title: "Safe Node CI workflow",
  },
  {
    description:
      "A deliberately risky `pull_request_target` example with broad permissions and a floating action ref.",
    sampleId: "risky-pull-request-target",
    title: "Risky pull_request_target workflow",
  },
  {
    description:
      "A dependency review workflow that uses unpinned third-party actions and should trigger supply-chain warnings.",
    sampleId: "unpinned-third-party-actions",
    title: "Unpinned third-party actions workflow",
  },
  {
    description:
      "A multi-axis matrix build that is useful for checking expansion count, runner usage, and reliability settings.",
    sampleId: "matrix-workflow",
    title: "Matrix build workflow",
  },
  {
    description:
      "A deployment-oriented workflow with explicit permissions, OIDC, concurrency, and environment intent.",
    sampleId: "deploy-release",
    title: "Deployment workflow with permissions",
  },
] as const satisfies ReadonlyArray<{
  description: string;
  sampleId: WorkflowSampleId;
  title: string;
}>;

export const analyzerFaqItems = [
  {
    answer:
      "Pasted and uploaded workflow content stays in your browser by default. Public GitHub imports are fetched directly from GitHub by your browser. Authos does not require login for this tool and does not proxy pasted or uploaded YAML through a backend.",
    question: "Is my workflow uploaded to a server?",
  },
  {
    answer:
      "No. It is a browser-local review layer that complements tools like actionlint and zizmor rather than replacing them. The goal is readable workflow review, local examples, exportable reports, and targeted fix guidance on top of deterministic checks.",
    question: "Does this replace actionlint or zizmor?",
  },
  {
    answer:
      "It can analyze private workflows if you paste or upload them locally. The GitHub import flow is intentionally public-only and does not support private repository browsing, OAuth, or backend proxying.",
    question: "Can it analyze private repositories?",
  },
  {
    answer:
      "`pull_request_target` runs with the base repository context, which can become dangerous when the workflow also checks out or executes untrusted pull request code. That combination can expose write-capable tokens, secrets, or deployment paths.",
    question: "Why does it warn about `pull_request_target`?",
  },
  {
    answer:
      "Mutable refs such as tags and branches can change after review. Pinning actions to an immutable full SHA makes the workflow less likely to drift to unreviewed code between runs.",
    question: "Why does it warn about unpinned actions?",
  },
  {
    answer:
      "Only some fixes are applied automatically, and only when the analyzer can make a safe local edit against the exact analyzed content. Many findings stay copy-first because the right fix depends on workflow intent, trust boundaries, or release policy.",
    question: "Does it automatically fix workflow files?",
  },
  {
    answer:
      "Yes. The report panel can copy a PR comment and export SARIF, JSON, and HTML output so findings can move into code review or downstream tooling.",
    question: "Can I export a report for a pull request?",
  },
] as const;

export const analyzerRelatedTools = [
  {
    description:
      "The live browser-local analyzer for GitHub Actions workflows.",
    href: "/tools/github-actions-workflow-analyzer",
    status: "available",
    title: "GitHub Actions Workflow Security and Lint Analyzer",
  },
  {
    description:
      "Check `dependabot.yml` structure, update groups, and registry config.",
    status: "coming-later",
    title: "Dependabot config validator",
  },
  {
    description:
      "Explain Renovate presets, package rules, and update behavior before rollout.",
    status: "coming-later",
    title: "Renovate config explainer",
  },
  {
    description:
      "Strip or mask secrets from config and CI snippets before sharing them.",
    status: "coming-later",
    title: "Secrets redactor",
  },
  {
    description:
      "Summarize package lockfile churn for easier pull request review.",
    status: "coming-later",
    title: "Lockfile diff",
  },
] as const;
