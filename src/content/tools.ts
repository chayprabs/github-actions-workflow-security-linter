import type { Route } from "next";

export type ToolStatus = "available" | "planned";
export type ToolCategoryName =
  | "API and schema"
  | "Kubernetes and DevOps"
  | "CI/CD and GitHub"
  | "Database and SQL"
  | "Security and supply chain";

export interface ToolRegistryItem {
  category: ToolCategoryName;
  href: Route;
  name: string;
  privacy: string;
  shortDescription: string;
  slug: string;
  status: ToolStatus;
  tags: readonly string[];
}

export interface ToolCategoryCard {
  description: string;
  href?: Route | undefined;
  name: ToolCategoryName;
  note: string;
  status: ToolStatus;
}

export const tools = [
  {
    category: "CI/CD and GitHub",
    href: "/tools/github-actions-workflow-analyzer" as Route,
    name: "GitHub Actions Workflow Security and Lint Analyzer",
    privacy: "Browser-local analysis",
    shortDescription:
      "Find syntax, reliability, permissions, trigger, and supply-chain risks in GitHub Actions workflow YAML.",
    slug: "github-actions-workflow-analyzer",
    status: "available",
    tags: [
      "GitHub Actions",
      "CI/CD",
      "YAML",
      "Security",
      "Linting",
      "Supply chain",
    ],
  },
] as const satisfies readonly ToolRegistryItem[];

export const featuredTool = tools[0];

export const toolCategories: readonly ToolCategoryCard[] = [
  {
    description:
      "Validate API contracts, JSON schemas, and interface definitions before they drift into production.",
    name: "API and schema",
    note: "Planned category",
    status: "planned",
  },
  {
    description:
      "Inspect manifests, deployment settings, and release configuration before they hit runtime environments.",
    name: "Kubernetes and DevOps",
    note: "Planned category",
    status: "planned",
  },
  {
    description:
      "Analyze GitHub Actions workflows and related CI configuration with deterministic local checks.",
    href: featuredTool.href,
    name: "CI/CD and GitHub",
    note: featuredTool.name,
    status: "available",
  },
  {
    description:
      "Check migrations, SQL, and operational database config for risky changes and reliability issues.",
    name: "Database and SQL",
    note: "Planned category",
    status: "planned",
  },
  {
    description:
      "Audit configuration and delivery files for supply-chain, permission, and security policy problems.",
    name: "Security and supply chain",
    note: "Planned category",
    status: "planned",
  },
];

export const homePageContent = {
  featuredBenefits: [
    {
      description: "Workflow YAML stays in the browser by default.",
      title: "Browser-local analysis",
    },
    {
      description: "No account is required for the core analyzer flow.",
      title: "No login",
    },
    {
      description: "Outputs are designed to be easy to share in pull requests.",
      title: "PR-ready report",
    },
    {
      description:
        "Checks include permissions, triggers, and supply-chain risk.",
      title: "Security checks",
    },
  ],
  hero: {
    ctaLabel: "Open GitHub Actions Analyzer",
    headline:
      "Developer tools that catch production mistakes before they ship.",
    subheadline:
      "Paste or upload config, schema, CI, and infrastructure files. Get fast local diagnostics, readable reports, and copyable fixes.",
  },
  trustStrip: [
    "Browser-first",
    "No login for core tools",
    "Deterministic checks",
    "Built for developers",
  ],
} as const;

export const futureToolCategories = toolCategories.filter(
  (category) => category.status === "planned",
);
