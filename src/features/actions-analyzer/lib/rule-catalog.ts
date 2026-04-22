import type { RuleDefinition } from "@/features/actions-analyzer/types";

export interface RuleIdRangeReservation {
  start: string;
  end: string;
  description: string;
}

const workflowSyntaxDocsUrl =
  "https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions";
const reusableWorkflowDocsUrl =
  "https://docs.github.com/actions/reference/workflows-and-actions/reusable-workflows";
const expressionsDocsUrl =
  "https://docs.github.com/en/actions/reference/workflows-and-actions/expressions";
const contextsDocsUrl =
  "https://docs.github.com/en/actions/reference/workflows-and-actions/contexts";
const secretsDocsUrl =
  "https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets";
const oidcDocsUrl =
  "https://docs.github.com/en/actions/concepts/security/openid-connect";
const permissionsDocsUrl =
  "https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#permissions";
const pullRequestTargetDocsUrl =
  "https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target";
const selfHostedRunnerDocsUrl =
  "https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/manage-access";
const workflowRunDocsUrl =
  "https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run";

export const reservedRuleIdRanges: RuleIdRangeReservation[] = [
  {
    start: "GHA001",
    end: "GHA099",
    description: "Parse and syntax.",
  },
  {
    start: "GHA100",
    end: "GHA199",
    description: "Permissions, triggers, and security.",
  },
  {
    start: "GHA200",
    end: "GHA299",
    description: "Supply chain and action pinning.",
  },
  {
    start: "GHA300",
    end: "GHA399",
    description: "Shell or script injection and unsafe command execution.",
  },
  {
    start: "GHA400",
    end: "GHA499",
    description: "Reliability, performance, and matrix behavior.",
  },
  {
    start: "GHA500",
    end: "GHA599",
    description: "Privacy, secrets, and redaction.",
  },
  {
    start: "GHA900",
    end: "GHA999",
    description: "Internal and tool warnings.",
  },
];

export const ruleCatalog = [
  {
    id: "GHA001",
    title: "Workflow YAML could not be parsed",
    description:
      "The workflow file contains invalid YAML and GitHub Actions cannot load it reliably.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["yaml", "parse", "syntax"],
  },
  {
    id: "GHA002",
    title: "Workflow contains duplicate mapping keys",
    description:
      "YAML mappings must not repeat the same key within the same object.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["yaml", "duplicate-keys", "syntax"],
  },
  {
    id: "GHA003",
    title: "Workflow file is empty",
    description:
      "GitHub Actions workflow files should contain a single YAML mapping with workflow keys.",
    category: "syntax",
    defaultSeverity: "medium",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["yaml", "empty-file", "syntax"],
  },
  {
    id: "GHA004",
    title: "Workflow trigger declaration is missing",
    description:
      "A workflow without a top-level on declaration does not define when GitHub should run it.",
    category: "triggers",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["workflow", "triggers", "events"],
  },
  {
    id: "GHA005",
    title: "Workflow jobs declaration is missing",
    description:
      "A workflow without a top-level jobs mapping cannot define any runnable jobs.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["workflow", "jobs", "syntax"],
  },
  {
    id: "GHA006",
    title: "Workflow jobs declaration is empty or invalid",
    description:
      "The top-level jobs field must be a mapping keyed by job id and should contain at least one job.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["workflow", "jobs", "syntax"],
  },
  {
    id: "GHA007",
    title: "Job is missing runs-on or reusable workflow uses",
    description:
      "A standard job needs runs-on, while a reusable workflow caller job needs a job-level uses reference.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["jobs", "runner", "reusable-workflows"],
  },
  {
    id: "GHA008",
    title: "Step defines both run and uses",
    description:
      "A workflow step must either run a shell command or call an action, but not both at the same time.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["steps", "actions", "syntax"],
  },
  {
    id: "GHA009",
    title: "Step defines neither run nor uses",
    description:
      "Each workflow step should either execute a shell command with run or call an action with uses.",
    category: "syntax",
    defaultSeverity: "medium",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["steps", "actions", "syntax"],
  },
  {
    id: "GHA010",
    title: "Action or reusable workflow uses value is malformed",
    description:
      "The uses reference should match the supported GitHub Actions syntax for actions or reusable workflows.",
    category: "syntax",
    defaultSeverity: "medium",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["uses", "actions", "reusable-workflows"],
  },
  {
    id: "GHA011",
    title: "Job needs references an unknown job",
    description:
      "Every needs dependency should point at another defined job id in the same workflow file.",
    category: "reliability",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["jobs", "needs", "dependencies"],
  },
  {
    id: "GHA012",
    title: "Workflow declares duplicate job ids",
    description:
      "Job ids must be unique within the top-level jobs mapping so downstream dependencies resolve deterministically.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["jobs", "duplicate-keys", "syntax"],
  },
  {
    id: "GHA013",
    title: "Workflow permissions declaration is invalid",
    description:
      "Permissions should use read-all or write-all shorthand, or a mapping of known scopes to read, write, or none.",
    category: "permissions",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["permissions", "token", "syntax"],
  },
  {
    id: "GHA014",
    title: "Job runs-on value is invalid",
    description:
      "The runs-on field should be a non-empty string, a non-empty array of runner labels, or a valid runner group or labels mapping.",
    category: "runner",
    defaultSeverity: "medium",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["runner", "runs-on", "jobs"],
  },
  {
    id: "GHA015",
    title: "Timeout value is invalid",
    description:
      "timeout-minutes should be a positive number when the value is statically known.",
    category: "reliability",
    defaultSeverity: "medium",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["timeout", "reliability", "jobs", "steps"],
  },
  {
    id: "GHA016",
    title: "Reusable workflow caller job mixes incompatible fields",
    description:
      "A job that calls a reusable workflow can only use the supported caller-job keywords and should not also define standard execution fields such as runs-on or steps.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: reusableWorkflowDocsUrl,
    enabledByDefault: true,
    tags: ["reusable-workflows", "jobs", "syntax"],
  },
  {
    id: "GHA017",
    title: "Suspicious workflow key typo",
    description:
      "Common misspellings such as job instead of jobs or runs_on instead of runs-on are usually ignored by GitHub Actions and can change workflow behavior.",
    category: "maintainability",
    defaultSeverity: "low",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["typo", "workflow", "keys"],
  },
  {
    id: "GHA018",
    title: "Workflow file contains multiple YAML documents",
    description:
      "GitHub Actions expects a single workflow document per file under .github/workflows/.",
    category: "syntax",
    defaultSeverity: "medium",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["yaml", "multi-document", "syntax"],
  },
  {
    id: "GHA019",
    title: "Workflow root should be a mapping",
    description:
      "GitHub Actions workflow files should use a top-level YAML mapping rather than a scalar or sequence.",
    category: "syntax",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["yaml", "root-object", "syntax"],
  },
  {
    id: "GHA050",
    title: "Workflow expression is malformed or unclosed",
    description:
      "GitHub Actions expressions should use balanced `${{ ... }}` delimiters and contain non-empty expression content.",
    category: "expressions",
    defaultSeverity: "medium",
    docsUrl: expressionsDocsUrl,
    enabledByDefault: true,
    tags: ["expressions", "syntax"],
  },
  {
    id: "GHA051",
    title: "Workflow expression uses an unknown context",
    description:
      "Expressions should start from a known GitHub Actions context such as github, env, vars, secrets, inputs, matrix, needs, strategy, runner, job, or steps.",
    category: "expressions",
    defaultSeverity: "medium",
    docsUrl: contextsDocsUrl,
    enabledByDefault: true,
    tags: ["expressions", "contexts"],
  },
  {
    id: "GHA052",
    title: "Secret is referenced directly in an if conditional",
    description:
      "Secrets cannot be referenced directly in `if:` conditionals. Use an environment variable as an intermediate value when appropriate.",
    category: "expressions",
    defaultSeverity: "medium",
    docsUrl: secretsDocsUrl,
    enabledByDefault: true,
    tags: ["expressions", "secrets", "if"],
  },
  {
    id: "GHA053",
    title: "Matrix context is used outside a matrix job",
    description:
      "The `matrix` context is only available when the current job defines `strategy.matrix`.",
    category: "expressions",
    defaultSeverity: "medium",
    docsUrl: contextsDocsUrl,
    enabledByDefault: true,
    tags: ["expressions", "matrix", "contexts"],
  },
  {
    id: "GHA054",
    title: "Expression references an unknown needs job",
    description:
      "Static `needs.<job_id>` references in expressions should point at a defined job id in the same workflow.",
    category: "expressions",
    defaultSeverity: "medium",
    docsUrl: contextsDocsUrl,
    enabledByDefault: true,
    tags: ["expressions", "needs", "dependencies"],
  },
  {
    id: "GHA055",
    title: "Untrusted GitHub context is used directly in an expression",
    description:
      "Potentially attacker-controlled GitHub event data should usually be passed through an environment variable boundary before use, especially in shell commands.",
    category: "expressions",
    defaultSeverity: "medium",
    docsUrl: contextsDocsUrl,
    enabledByDefault: true,
    tags: ["expressions", "github-event", "input-handling"],
  },
  {
    id: "GHA056",
    title: "Action or reusable workflow reference is dynamic",
    description:
      "Dynamic `uses` references make review and pinning difficult because the action or workflow ref is chosen at runtime.",
    category: "expressions",
    defaultSeverity: "high",
    docsUrl: workflowSyntaxDocsUrl,
    enabledByDefault: true,
    tags: ["expressions", "uses", "supply-chain"],
  },
  {
    id: "GHA100",
    title: "Top-level permissions are not declared explicitly",
    description:
      "Declare top-level permissions explicitly so the `GITHUB_TOKEN` stays auditable and closer to least privilege.",
    category: "permissions",
    defaultSeverity: "medium",
    docsUrl: permissionsDocsUrl,
    enabledByDefault: true,
    tags: ["permissions", "token", "least-privilege"],
  },
  {
    id: "GHA101",
    title: "Top-level permissions use write-all",
    description:
      "Avoid `write-all` at the workflow level when narrower `GITHUB_TOKEN` scopes can accomplish the same job.",
    category: "permissions",
    defaultSeverity: "high",
    docsUrl: permissionsDocsUrl,
    enabledByDefault: true,
    tags: ["permissions", "token", "least-privilege"],
  },
  {
    id: "GHA102",
    title: "Workflow grants broad write permissions",
    description:
      "Broad write permissions expand the blast radius of the `GITHUB_TOKEN`; verify each write scope is required.",
    category: "permissions",
    defaultSeverity: "high",
    docsUrl: permissionsDocsUrl,
    enabledByDefault: true,
    tags: ["permissions", "token", "write-access"],
  },
  {
    id: "GHA103",
    title: "Workflow uses pull_request_target",
    description:
      "The `pull_request_target` event runs with the base repository context and needs careful handling of untrusted pull request data and code.",
    category: "security",
    defaultSeverity: "high",
    docsUrl: pullRequestTargetDocsUrl,
    enabledByDefault: true,
    tags: ["triggers", "pull_request_target", "security"],
  },
  {
    id: "GHA104",
    title: "Workflow checks out pull request head under pull_request_target",
    description:
      "Checking out the pull request head in a `pull_request_target` workflow can combine untrusted code with elevated token or secret access.",
    category: "security",
    defaultSeverity: "critical",
    docsUrl: pullRequestTargetDocsUrl,
    enabledByDefault: true,
    tags: ["pull_request_target", "checkout", "security"],
  },
  {
    id: "GHA105",
    title: "Self-hosted runner is reachable from an untrusted pull request trigger",
    description:
      "Self-hosted runners should be isolated carefully because pull request workflows can execute contributor-controlled code.",
    category: "runner",
    defaultSeverity: "high",
    docsUrl: selfHostedRunnerDocsUrl,
    enabledByDefault: true,
    tags: ["runner", "self-hosted", "pull-request"],
  },
  {
    id: "GHA106",
    title: "Workflow_run follow-up may perform privileged work on untrusted artifacts",
    description:
      "A workflow triggered by `workflow_run` can have secrets and write permissions, so artifact and trust boundaries need careful review.",
    category: "security",
    defaultSeverity: "medium",
    docsUrl: workflowRunDocsUrl,
    enabledByDefault: true,
    tags: ["workflow_run", "artifacts", "privilege"],
  },
  {
    id: "GHA107",
    title: "Secret is defined at workflow or job env scope",
    description:
      "Secrets placed in workflow-level or job-level `env` are exposed to more steps than a step-scoped environment variable.",
    category: "security",
    defaultSeverity: "medium",
    docsUrl: secretsDocsUrl,
    enabledByDefault: true,
    tags: ["secrets", "env", "exposure"],
  },
  {
    id: "GHA108",
    title: "Long-lived cloud credential secret name detected",
    description:
      "Long-lived cloud credentials are often replaceable with short-lived OpenID Connect credentials.",
    category: "security",
    defaultSeverity: "medium",
    docsUrl: oidcDocsUrl,
    enabledByDefault: true,
    tags: ["secrets", "oidc", "cloud-credentials"],
  },
  {
    id: "GHA109",
    title: "Deployment-like job runs on an untrusted pull request trigger",
    description:
      "Deploy, release, or publish jobs should be reviewed carefully when they run for pull request events that may involve untrusted contributions.",
    category: "security",
    defaultSeverity: "high",
    docsUrl: pullRequestTargetDocsUrl,
    enabledByDefault: true,
    tags: ["deploy", "release", "pull-request"],
  },
  {
    id: "GHA110",
    title: "Privileged token is available to a third-party action",
    description:
      "Any action in a job can use the job's `GITHUB_TOKEN` permissions, so third-party actions in broadly privileged jobs need extra scrutiny.",
    category: "security",
    defaultSeverity: "high",
    docsUrl: permissionsDocsUrl,
    enabledByDefault: true,
    tags: ["permissions", "third-party-actions", "token"],
  },
  {
    id: "GHA201",
    title: "Action uses a floating ref",
    description:
      "Third-party actions should use immutable commit SHAs or trusted release tags instead of floating refs such as main or master.",
    category: "supply-chain",
    defaultSeverity: "high",
    enabledByDefault: true,
    tags: ["actions", "pinning", "supply-chain"],
  },
  {
    id: "GHA401",
    title: "Job is missing timeout-minutes",
    description:
      "Set timeout-minutes on each job to reduce hung runners and uncontrolled CI spend.",
    category: "reliability",
    defaultSeverity: "low",
    enabledByDefault: true,
    tags: ["timeouts", "reliability", "ci"],
  },
  {
    id: "GHA900",
    title: "No workflow files were provided",
    description:
      "Load, paste, or upload at least one workflow file before running analysis.",
    category: "maintainability",
    defaultSeverity: "info",
    enabledByDefault: true,
    tags: ["input", "workflow", "empty-state"],
  },
] satisfies RuleDefinition[];

export const ruleCatalogById = Object.fromEntries(
  ruleCatalog.map((rule) => [rule.id, rule]),
) as Record<(typeof ruleCatalog)[number]["id"], RuleDefinition>;

export function getRuleDefinition(ruleId: string): RuleDefinition | undefined {
  return ruleCatalog.find((rule) => rule.id === ruleId);
}
