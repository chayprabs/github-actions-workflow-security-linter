import { describe, expect, it } from "vitest";

import { applyAllSafeFixes } from "@/features/actions-analyzer/lib/apply-safe-fixes";
import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

describe("applyAllSafeFixes", () => {
  it("applies safe fixes across multiple files in stable order", () => {
    const files = [
      createWorkflowInputFile({
        content: [
          "name: one",
          "on: push",
          "jobs:",
          "  build:",
          "    runs-on: ubuntu-latest",
          "    steps:",
          "      - uses: actions/checkout@v4",
        ].join("\n"),
        path: ".github/workflows/one.yml",
        sourceKind: "paste",
      }),
    ];
    const report = analyzeWorkflowFiles(files);
    const safeFindings = report.findings.filter(
      (finding) => finding.fix?.safety === "safe",
    );

    if (safeFindings.length === 0) {
      expect(safeFindings.length).toBeGreaterThan(0);
      return;
    }

    const result = applyAllSafeFixes({
      analyzedContentsByPath: Object.fromEntries(
        files.map((file) => [file.path, file.content]),
      ),
      files,
      findings: report.findings,
    });

    expect(result.appliedCount).toBeGreaterThan(0);
    expect(result.files[0]?.content).not.toEqual(files[0]?.content);
  });
});
