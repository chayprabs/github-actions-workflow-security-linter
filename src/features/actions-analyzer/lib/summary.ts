import {
  calculateScore,
  gradeFromScore,
} from "@/features/actions-analyzer/lib/scoring";
import type {
  AnalysisSummary,
  AnalyzerFinding,
  FindingCategory,
  Severity,
} from "@/features/actions-analyzer/types";
import {
  findingCategories,
  severities,
} from "@/features/actions-analyzer/types";

export function createEmptySeverityCounts(): Record<Severity, number> {
  return Object.fromEntries(
    severities.map((severity) => [severity, 0]),
  ) as Record<Severity, number>;
}

export function createEmptyCategoryCounts(): Record<FindingCategory, number> {
  return Object.fromEntries(
    findingCategories.map((category) => [category, 0]),
  ) as Record<FindingCategory, number>;
}

export function buildAnalysisSummary(
  findings: AnalyzerFinding[],
  analyzedFileCount: number,
  workflowCount: number,
  jobCount: number,
): AnalysisSummary {
  const severityCounts = createEmptySeverityCounts();
  const categoryCounts = createEmptyCategoryCounts();

  for (const finding of findings) {
    severityCounts[finding.severity] += 1;
    categoryCounts[finding.category] += 1;
  }

  const score = calculateScore(findings);

  return {
    severityCounts,
    categoryCounts,
    totalFindings: findings.length,
    score,
    grade: gradeFromScore(score),
    analyzedFileCount,
    workflowCount,
    jobCount,
  };
}
