import type { RuleDefinition } from "@/features/actions-analyzer/types";

export interface RuleIdRangeReservation {
  start: string;
  end: string;
  description: string;
}

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
    enabledByDefault: true,
    tags: ["yaml", "empty-file", "syntax"],
  },
  {
    id: "GHA004",
    title: "Workflow file contains multiple YAML documents",
    description:
      "GitHub Actions expects a single workflow document per file under .github/workflows/.",
    category: "syntax",
    defaultSeverity: "medium",
    enabledByDefault: true,
    tags: ["yaml", "multi-document", "syntax"],
  },
  {
    id: "GHA005",
    title: "Workflow root should be a mapping",
    description:
      "GitHub Actions workflow files should use a top-level YAML mapping rather than a scalar or sequence.",
    category: "syntax",
    defaultSeverity: "high",
    enabledByDefault: true,
    tags: ["yaml", "root-object", "syntax"],
  },
  {
    id: "GHA006",
    title: "Workflow structure is invalid",
    description:
      "The workflow parsed as YAML but does not match the expected GitHub Actions object structure.",
    category: "syntax",
    defaultSeverity: "high",
    enabledByDefault: true,
    tags: ["yaml", "schema", "syntax"],
  },
  {
    id: "GHA101",
    title: "Top-level permissions are not declared",
    description:
      "Declare top-level permissions explicitly so the default token scope stays auditable and least-privilege.",
    category: "permissions",
    defaultSeverity: "medium",
    enabledByDefault: true,
    tags: ["permissions", "token", "least-privilege"],
  },
  {
    id: "GHA102",
    title: "Workflow trigger declaration is missing",
    description:
      "Workflows should declare their trigger configuration explicitly to avoid surprising execution paths.",
    category: "triggers",
    defaultSeverity: "high",
    enabledByDefault: true,
    tags: ["triggers", "events"],
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
