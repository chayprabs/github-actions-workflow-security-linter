import { severityDisplayOrder } from "@/features/actions-analyzer/lib/finding-presentation";
import { normalizeWorkflowPath } from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  AnalyzerFinding,
  FindingCategory,
  Severity,
  WorkflowAnalysisReport,
} from "@/features/actions-analyzer/types";

export type ResultsFindingGroupBy = "severity" | "file" | "category" | "flat";
export type ResultsFindingSort = "severity" | "file-line" | "category" | "rule";

export interface ResultsFindingFilters {
  searchQuery: string;
  selectedCategory: "all" | FindingCategory;
  selectedFilePath: "all" | string;
  selectedJobId: "all" | string;
  selectedSeverities: Severity[];
  showSecurityOnly: boolean;
  showWarningsOnly: boolean;
  sortBy: ResultsFindingSort;
}

export interface ResultsFindingGroup {
  id: string;
  title: string;
  findings: AnalyzerFinding[];
}

export interface ReliabilitySummary {
  maintainabilityFindingCount: number;
  matrixWarningCount: number;
  performanceFindingCount: number;
  reliabilityFindingCount: number;
  timeoutFindingCount: number;
  totalFindingCount: number;
  unresolvedMatrixJobCount: number;
}

const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function filterFindingsForResults(
  findings: readonly AnalyzerFinding[],
  filters: ResultsFindingFilters,
) {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();
  const severityFilter =
    filters.selectedSeverities.length > 0
      ? new Set(filters.selectedSeverities)
      : null;

  return findings.filter((finding) => {
    if (severityFilter && !severityFilter.has(finding.severity)) {
      return false;
    }

    if (
      filters.showWarningsOnly &&
      (finding.severity === "low" || finding.severity === "info")
    ) {
      return false;
    }

    if (
      filters.selectedCategory !== "all" &&
      finding.category !== filters.selectedCategory
    ) {
      return false;
    }

    if (
      filters.selectedFilePath !== "all" &&
      normalizeWorkflowPath(finding.filePath).toLowerCase() !==
        normalizeWorkflowPath(filters.selectedFilePath).toLowerCase()
    ) {
      return false;
    }

    if (
      filters.selectedJobId !== "all" &&
      !finding.relatedJobs.includes(filters.selectedJobId)
    ) {
      return false;
    }

    if (filters.showSecurityOnly && !isSecurityFocusedFinding(finding)) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return buildFindingSearchText(finding).includes(normalizedQuery);
  });
}

export function sortFindingsForResults(
  findings: readonly AnalyzerFinding[],
  sortBy: ResultsFindingSort,
) {
  return [...findings].sort((left, right) => {
    switch (sortBy) {
      case "file-line":
        return compareFindingByFileLine(left, right);
      case "category":
        return (
          categorySort(left.category, right.category) ||
          compareSeverity(left.severity, right.severity) ||
          compareFindingByFileLine(left, right)
        );
      case "rule":
        return (
          left.ruleId.localeCompare(right.ruleId) ||
          compareSeverity(left.severity, right.severity) ||
          compareFindingByFileLine(left, right)
        );
      case "severity":
      default:
        return (
          compareSeverity(left.severity, right.severity) ||
          compareFindingByFileLine(left, right)
        );
    }
  });
}

export function groupFindingsForResults(
  findings: readonly AnalyzerFinding[],
  groupBy: ResultsFindingGroupBy,
) {
  if (groupBy === "flat") {
    return findings.length > 0
      ? [
          {
            findings: [...findings],
            id: "flat",
            title: "All findings",
          },
        ]
      : [];
  }

  if (groupBy === "severity") {
    return severityDisplayOrder.reduce<ResultsFindingGroup[]>(
      (groups, severity) => {
        const groupedFindings = findings.filter(
          (finding) => finding.severity === severity,
        );

        if (groupedFindings.length === 0) {
          return groups;
        }

        groups.push({
          findings: groupedFindings,
          id: severity,
          title: `${capitalize(severity)} (${groupedFindings.length})`,
        });

        return groups;
      },
      [],
    );
  }

  if (groupBy === "file") {
    return createGroups(findings, (finding) => finding.filePath).sort(
      (left, right) => {
        return compareFilePath(left.title, right.title);
      },
    );
  }

  return createGroups(findings, (finding) =>
    formatCategoryLabel(finding.category),
  ).sort((left, right) => {
    const leftCategory = left.findings[0]?.category ?? "maintainability";
    const rightCategory = right.findings[0]?.category ?? "maintainability";

    return (
      categorySort(leftCategory, rightCategory) ||
      left.title.localeCompare(right.title)
    );
  });
}

export function getAvailableFindingFiles(findings: readonly AnalyzerFinding[]) {
  return uniqueValues(findings.map((finding) => finding.filePath)).sort(
    compareFilePath,
  );
}

export function getAvailableFindingJobs(findings: readonly AnalyzerFinding[]) {
  return uniqueValues(findings.flatMap((finding) => finding.relatedJobs)).sort(
    (left, right) => left.localeCompare(right),
  );
}

export function buildReliabilitySummary(
  report: WorkflowAnalysisReport,
): ReliabilitySummary {
  const totalFindingCount = report.findings.filter((finding) => {
    return isReliabilityFocusedFinding(finding);
  }).length;

  return {
    maintainabilityFindingCount: report.findings.filter(
      (finding) => finding.category === "maintainability",
    ).length,
    matrixWarningCount: report.matrixSummary.warningCount,
    performanceFindingCount: report.findings.filter(
      (finding) => finding.category === "performance",
    ).length,
    reliabilityFindingCount: report.findings.filter(
      (finding) => finding.category === "reliability",
    ).length,
    timeoutFindingCount: report.findings.filter((finding) =>
      ["GHA015", "GHA401"].includes(finding.ruleId),
    ).length,
    totalFindingCount,
    unresolvedMatrixJobCount: report.matrixSummary.jobs.filter(
      (job) => job.isUnresolved,
    ).length,
  };
}

export function formatFindingLocationLabel(finding: AnalyzerFinding) {
  if (!finding.location) {
    return finding.filePath;
  }

  return `${finding.filePath}:${finding.location.line}`;
}

export function formatCategoryLabel(category: "all" | FindingCategory) {
  if (category === "all") {
    return "All";
  }

  return category
    .split("-")
    .map((segment) => capitalize(segment))
    .join(" ");
}

export function isSecurityFocusedFinding(finding: AnalyzerFinding) {
  return [
    "permissions",
    "privacy",
    "runner",
    "security",
    "supply-chain",
    "triggers",
  ].includes(finding.category);
}

function isReliabilityFocusedFinding(finding: AnalyzerFinding) {
  return ["maintainability", "performance", "reliability"].includes(
    finding.category,
  );
}

function buildFindingSearchText(finding: AnalyzerFinding) {
  return [
    finding.title,
    finding.message,
    finding.ruleId,
    finding.filePath,
    finding.category,
    finding.confidence,
    ...finding.relatedJobs,
    ...finding.relatedSteps,
    ...finding.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function createGroups(
  findings: readonly AnalyzerFinding[],
  getTitle: (finding: AnalyzerFinding) => string,
) {
  const groups = new Map<string, ResultsFindingGroup>();

  for (const finding of findings) {
    const title = getTitle(finding);
    const existingGroup = groups.get(title);

    if (existingGroup) {
      existingGroup.findings.push(finding);
      continue;
    }

    groups.set(title, {
      findings: [finding],
      id: title.toLowerCase().replace(/\s+/gu, "-"),
      title,
    });
  }

  return Array.from(groups.values());
}

function uniqueValues(values: readonly string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue.length === 0 || seen.has(normalizedValue)) {
      continue;
    }

    seen.add(normalizedValue);
    unique.push(value);
  }

  return unique;
}

function compareSeverity(left: Severity, right: Severity) {
  return severityRank[left] - severityRank[right];
}

function compareFindingByFileLine(
  left: AnalyzerFinding,
  right: AnalyzerFinding,
) {
  return (
    compareFilePath(left.filePath, right.filePath) ||
    (left.location?.line ?? 0) - (right.location?.line ?? 0) ||
    (left.location?.column ?? 0) - (right.location?.column ?? 0) ||
    left.ruleId.localeCompare(right.ruleId)
  );
}

function compareFilePath(left: string, right: string) {
  return normalizeWorkflowPath(left)
    .toLowerCase()
    .localeCompare(normalizeWorkflowPath(right).toLowerCase());
}

function capitalize(value: string) {
  return value[0]?.toUpperCase() + value.slice(1);
}

function categorySort(left: FindingCategory, right: FindingCategory) {
  const order = [
    "security",
    "permissions",
    "runner",
    "supply-chain",
    "expressions",
    "matrix",
    "reliability",
    "syntax",
    "triggers",
    "performance",
    "maintainability",
    "privacy",
  ];

  return (
    (order.indexOf(left) === -1
      ? Number.POSITIVE_INFINITY
      : order.indexOf(left)) -
      (order.indexOf(right) === -1
        ? Number.POSITIVE_INFINITY
        : order.indexOf(right)) || left.localeCompare(right)
  );
}
