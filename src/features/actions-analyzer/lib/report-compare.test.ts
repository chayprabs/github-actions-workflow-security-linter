import { describe, expect, it } from "vitest";

import { sampleAnalysisReport } from "@/features/actions-analyzer/fixtures/reports";
import {
  buildCompareMarkdownSummary,
  compareWorkflowReports,
  createStableFindingKey,
} from "@/features/actions-analyzer/lib/report-compare";

describe("report comparison", () => {
  it("categorizes new, resolved, and unchanged findings using stable keys", () => {
    const unchangedCurrent = sampleAnalysisReport.findings[0]!;
    const unchangedPrevious = {
      ...unchangedCurrent,
      id: "different-id",
    };
    const resolvedFinding = {
      ...sampleAnalysisReport.findings[1]!,
      id: "resolved-id",
      ruleId: "GHA401",
      title: "Job timeout is not declared",
    };
    const newFinding = {
      ...sampleAnalysisReport.findings[1]!,
      id: "new-id",
      ruleId: "GHA104",
      severity: "critical" as const,
      title: "pull_request_target checks out PR head",
    };
    const comparison = compareWorkflowReports(
      {
        ...sampleAnalysisReport,
        findings: [unchangedCurrent, newFinding],
      },
      {
        ...sampleAnalysisReport,
        findings: [unchangedPrevious, resolvedFinding],
      },
    );

    expect(createStableFindingKey(unchangedCurrent)).toBe(
      createStableFindingKey(unchangedPrevious),
    );
    expect(comparison.summary).toMatchObject({
      newFindingCount: 1,
      newHighOrCriticalCount: 1,
      resolvedFindingCount: 1,
      unchangedFindingCount: 1,
    });
    expect(comparison.newFindings[0]?.ruleId).toBe("GHA104");
    expect(comparison.resolvedFindings[0]?.ruleId).toBe("GHA401");
    expect(comparison.unchangedFindings[0]?.current.ruleId).toBe(
      unchangedCurrent.ruleId,
    );
  });

  it("exports a markdown compare summary for PR review", () => {
    const comparison = compareWorkflowReports(sampleAnalysisReport, {
      ...sampleAnalysisReport,
      findings: sampleAnalysisReport.findings.slice(0, 1),
    });

    expect(
      buildCompareMarkdownSummary({
        comparison,
        currentLabel: "Current sample",
        previousLabel: "Previous sample",
      }),
    ).toContain("## Authos Compare Summary");
  });
});
