import type {
  AnalyzerFinding,
  Severity,
} from "@/features/actions-analyzer/types";
import { normalizeWorkflowPath } from "@/features/actions-analyzer/lib/workflow-input-utils";

export type SeverityCounts = Record<Severity, number>;

export const severityDisplayOrder = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;

export function createEmptySeverityCounts(): SeverityCounts {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
}

export function buildSeverityCounts(
  findings: readonly AnalyzerFinding[],
): SeverityCounts {
  const counts = createEmptySeverityCounts();

  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  return counts;
}

export function getFindingCountsByFile(
  findings: readonly AnalyzerFinding[],
): Map<string, SeverityCounts> {
  const countsByFile = new Map<string, SeverityCounts>();

  for (const finding of findings) {
    const normalizedPath = normalizeWorkflowPath(
      finding.filePath,
    ).toLowerCase();
    const currentCounts =
      countsByFile.get(normalizedPath) ?? createEmptySeverityCounts();

    currentCounts[finding.severity] += 1;
    countsByFile.set(normalizedPath, currentCounts);
  }

  return countsByFile;
}

export function getFindingsForFile(
  findings: readonly AnalyzerFinding[],
  filePath: string,
): AnalyzerFinding[] {
  const normalizedPath = normalizeWorkflowPath(filePath).toLowerCase();

  return findings.filter((finding) => {
    return (
      normalizeWorkflowPath(finding.filePath).toLowerCase() === normalizedPath
    );
  });
}

export function getSeverityTone(severity: Severity) {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "severity-high";
    case "medium":
      return "severity-medium";
    case "low":
      return "severity-low";
    case "info":
      return "info";
    default:
      return "subtle";
  }
}
