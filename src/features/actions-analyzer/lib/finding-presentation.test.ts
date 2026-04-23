import { describe, expect, it } from "vitest";

import { sampleAnalysisReport } from "@/features/actions-analyzer/fixtures/reports";
import {
  buildSeverityCounts,
  getFindingCountsByFile,
  getFindingsForFile,
} from "@/features/actions-analyzer/lib/finding-presentation";

describe("finding presentation helpers", () => {
  it("groups severity counts by file", () => {
    const [firstFinding] = sampleAnalysisReport.findings;

    expect(firstFinding).toBeDefined();

    const findings = [
      ...sampleAnalysisReport.findings,
      {
        ...firstFinding!,
        filePath: ".github/workflows/ci.yml",
        id: "second-file-finding",
        location: {
          filePath: ".github/workflows/ci.yml",
          line: 3,
          column: 1,
          endLine: 3,
          endColumn: 12,
        },
        severity: "high" as const,
      },
    ];

    const countsByFile = getFindingCountsByFile(findings);

    expect(
      countsByFile.get(".github/workflows/release-risky.yml"),
    ).toMatchObject({
      medium: 2,
    });
    expect(countsByFile.get(".github/workflows/ci.yml")).toMatchObject({
      high: 1,
    });
  });

  it("filters findings for the active file using normalized paths", () => {
    const findingsForFile = getFindingsForFile(
      sampleAnalysisReport.findings,
      "\\.github\\workflows\\release-risky.yml",
    );

    expect(findingsForFile).toHaveLength(2);
    expect(buildSeverityCounts(findingsForFile)).toMatchObject({
      medium: 2,
    });
  });
});
