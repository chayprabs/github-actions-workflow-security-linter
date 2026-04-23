import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createSourceRangeFromOffsets } from "@/features/actions-analyzer/lib/source-location-utils";
import { applySuggestedFix } from "@/features/actions-analyzer/lib/suggested-fixes";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";
import { parseWorkflowYaml } from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import type { SuggestedFix } from "@/features/actions-analyzer/types";

describe("suggested fixes", () => {
  it("applies insert patches", () => {
    const content = "name: CI\n";
    const fix: SuggestedFix = {
      description: "Insert permissions",
      filePath: ".github/workflows/ci.yml",
      kind: "insert",
      label: "Add permissions",
      range: createSourceRangeFromOffsets(
        ".github/workflows/ci.yml",
        content,
        0,
        0,
      ),
      replacement: "permissions:\n  contents: read\n",
      safety: "safe",
    };

    const result = applySuggestedFix({
      analyzedContent: content,
      currentContent: content,
      fix,
    });

    expect(result).toMatchObject({
      ok: true,
      nextContent: "permissions:\n  contents: read\nname: CI\n",
    });
  });

  it("applies replacement patches", () => {
    const content = "continue-on-error: true\n";
    const fix: SuggestedFix = {
      description: "Flip continue-on-error",
      filePath: ".github/workflows/ci.yml",
      kind: "replace",
      label: "Replace true with false",
      range: createSourceRangeFromOffsets(
        ".github/workflows/ci.yml",
        content,
        content.indexOf("true"),
        content.indexOf("true") + "true".length,
      ),
      replacement: "false",
      safety: "review",
    };

    const result = applySuggestedFix({
      analyzedContent: content,
      currentContent: content,
      fix,
    });

    expect(result).toMatchObject({
      ok: true,
      nextContent: "continue-on-error: false\n",
    });
  });

  it("detects stale fixes when the input changed after analysis", () => {
    const content = "name: CI\n";
    const fix: SuggestedFix = {
      description: "Insert permissions",
      filePath: ".github/workflows/ci.yml",
      kind: "insert",
      label: "Add permissions",
      range: createSourceRangeFromOffsets(
        ".github/workflows/ci.yml",
        content,
        0,
        0,
      ),
      replacement: "permissions:\n  contents: read\n",
      safety: "safe",
    };

    const result = applySuggestedFix({
      analyzedContent: content,
      currentContent: "name: CI\n# changed\n",
      fix,
    });

    expect(result).toEqual({
      code: "stale",
      message: "Re-run analysis before applying this fix.",
      ok: false,
    });
  });

  it("keeps YAML valid and removes the targeted safe finding on sample fixtures", () => {
    const content = `name: Repairs
on: push
jobs:
  build:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
`;
    const filePath = ".github/workflows/repairs.yml";
    const ruleIds = ["GHA100", "GHA401", "GHA206", "GHA405"] as const;

    for (const ruleId of ruleIds) {
      const report = analyzeWorkflowFiles(
        [
          createWorkflowInputFile({
            content,
            path: filePath,
            sourceKind: "sample",
          }),
        ],
        {
          enabledRuleIds: [ruleId],
        },
      );
      const finding = report.findings.find((candidate) => candidate.ruleId === ruleId);

      expect(finding?.fix).toBeDefined();

      const fixResult = applySuggestedFix({
        analyzedContent: content,
        currentContent: content,
        fix: finding!.fix!,
      });

      expect(fixResult.ok).toBe(true);

      if (!fixResult.ok) {
        continue;
      }

      const parsedFile = parseWorkflowYaml(
        createWorkflowInputFile({
          content: fixResult.nextContent,
          path: filePath,
          sourceKind: "sample",
        }),
      );
      const rerun = analyzeWorkflowFiles(
        [
          createWorkflowInputFile({
            content: fixResult.nextContent,
            path: filePath,
            sourceKind: "sample",
          }),
        ],
        {
          enabledRuleIds: [ruleId],
        },
      );

      expect(parsedFile.parseFindings).toEqual([]);
      expect(rerun.findings.filter((candidate) => candidate.ruleId === ruleId)).toEqual([]);
    }
  });
});
