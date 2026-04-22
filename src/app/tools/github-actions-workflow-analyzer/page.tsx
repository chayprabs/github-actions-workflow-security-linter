import type { Metadata } from "next";

import { AnalyzerPage } from "@/features/actions-analyzer/components/analyzer-page";

export const metadata: Metadata = {
  title: "GitHub Actions Workflow Security and Lint Analyzer",
  description:
    "Paste or upload workflow YAML to find syntax errors, risky permissions, unsafe triggers, unpinned actions, matrix issues, and reliability problems before you merge.",
};

export default function GitHubActionsWorkflowAnalyzerPage() {
  return <AnalyzerPage />;
}
