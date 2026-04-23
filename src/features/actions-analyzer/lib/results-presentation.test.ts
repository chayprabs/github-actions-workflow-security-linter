import { describe, expect, it } from "vitest";

import { sampleAnalysisReport } from "@/features/actions-analyzer/fixtures/reports";
import {
  buildReliabilitySummary,
  filterFindingsForResults,
  formatFindingLocationLabel,
  getAvailableFindingFiles,
  getAvailableFindingJobs,
  groupFindingsForResults,
  sortFindingsForResults,
  type ResultsFindingFilters,
} from "@/features/actions-analyzer/lib/results-presentation";

const defaultFilters: ResultsFindingFilters = {
  searchQuery: "",
  selectedCategory: "all",
  selectedFilePath: "all",
  selectedJobId: "all",
  selectedSeverities: [],
  showSecurityOnly: false,
  showWarningsOnly: false,
  sortBy: "severity",
};

describe("results presentation helpers", () => {
  it("filters findings by search, severity, and file", () => {
    const findings = filterFindingsForResults(sampleAnalysisReport.findings, {
      ...defaultFilters,
      searchQuery: "mutable tag",
      selectedFilePath: ".github/workflows/release-risky.yml",
      selectedSeverities: ["medium"],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("GHA201");
  });

  it("supports warnings-only and security-only toggles", () => {
    const findings = filterFindingsForResults(sampleAnalysisReport.findings, {
      ...defaultFilters,
      selectedCategory: "permissions",
      showSecurityOnly: true,
      showWarningsOnly: true,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("GHA100");
  });

  it("groups findings by severity and category", () => {
    const severityGroups = groupFindingsForResults(
      sampleAnalysisReport.findings,
      "severity",
    );
    const categoryGroups = groupFindingsForResults(
      sampleAnalysisReport.findings,
      "category",
    );

    expect(severityGroups).toHaveLength(1);
    expect(severityGroups[0]?.title).toContain("Medium");
    expect(categoryGroups.map((group) => group.title)).toEqual([
      "Permissions",
      "Supply Chain",
    ]);
  });

  it("sorts findings by rule and exposes file and job filters", () => {
    const sortedFindings = sortFindingsForResults(
      sampleAnalysisReport.findings,
      "rule",
    );

    expect(sortedFindings.map((finding) => finding.ruleId)).toEqual([
      "GHA100",
      "GHA201",
    ]);
    expect(getAvailableFindingFiles(sampleAnalysisReport.findings)).toEqual([
      ".github/workflows/release-risky.yml",
    ]);
    expect(getAvailableFindingJobs(sampleAnalysisReport.findings)).toEqual([
      "release",
    ]);
  });

  it("builds a reliability summary and formats file locations", () => {
    const report = {
      ...sampleAnalysisReport,
      findings: [
        ...sampleAnalysisReport.findings,
        {
          ...sampleAnalysisReport.findings[0]!,
          category: "reliability" as const,
          id: "reliability-finding",
          ruleId: "GHA401",
          title: "Job is missing timeout-minutes",
        },
      ],
    };

    expect(buildReliabilitySummary(report)).toMatchObject({
      reliabilityFindingCount: 1,
      timeoutFindingCount: 1,
      totalFindingCount: 1,
    });
    expect(formatFindingLocationLabel(sampleAnalysisReport.findings[0]!)).toBe(
      ".github/workflows/release-risky.yml:7",
    );
  });
});
