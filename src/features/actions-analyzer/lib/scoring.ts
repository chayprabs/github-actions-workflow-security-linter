import type {
  AnalyzerFinding,
  ReportGrade,
  Severity,
} from "@/features/actions-analyzer/types";

export const severityWeights: Record<Severity, number> = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  info: 0.5,
};

const severitySortOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function calculateScore(
  findings: Pick<AnalyzerFinding, "severity">[],
): number {
  const totalPenalty = findings.reduce((sum, finding) => {
    return sum + severityWeights[finding.severity];
  }, 0);

  const cappedPenalty = Math.min(totalPenalty, 100);

  return Number(Math.max(0, 100 - cappedPenalty).toFixed(1));
}

export function scoreFindings(
  findings: Pick<AnalyzerFinding, "severity">[],
): number {
  return calculateScore(findings);
}

export function gradeFromScore(score: number): ReportGrade {
  if (score >= 90) {
    return "A";
  }

  if (score >= 80) {
    return "B";
  }

  if (score >= 70) {
    return "C";
  }

  if (score >= 60) {
    return "D";
  }

  return "F";
}

export function sortFindings<T extends AnalyzerFinding>(findings: T[]): T[] {
  return [...findings].sort((left, right) => {
    const severityDifference =
      severitySortOrder[left.severity] - severitySortOrder[right.severity];

    if (severityDifference !== 0) {
      return severityDifference;
    }

    const fileDifference = left.filePath.localeCompare(right.filePath);

    if (fileDifference !== 0) {
      return fileDifference;
    }

    const leftLine = left.location?.line ?? Number.POSITIVE_INFINITY;
    const rightLine = right.location?.line ?? Number.POSITIVE_INFINITY;

    if (leftLine !== rightLine) {
      return leftLine - rightLine;
    }

    const leftColumn = left.location?.column ?? Number.POSITIVE_INFINITY;
    const rightColumn = right.location?.column ?? Number.POSITIVE_INFINITY;

    if (leftColumn !== rightColumn) {
      return leftColumn - rightColumn;
    }

    const ruleDifference = left.ruleId.localeCompare(right.ruleId);

    if (ruleDifference !== 0) {
      return ruleDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

export function createFindingId(
  filePath: string,
  ruleId: string,
  line: number,
  column: number,
  index: number,
): string {
  const normalizedPath = filePath
    .replace(/\\/gu, "/")
    .replace(/\s+/gu, "-")
    .replace(/[^a-zA-Z0-9/_-]/gu, "")
    .toLowerCase();

  return `${ruleId}:${normalizedPath}:${line}:${column}:${index}`;
}
