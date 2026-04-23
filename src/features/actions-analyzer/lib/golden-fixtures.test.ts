import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

interface GoldenFixtureExpectation {
  exact?: string[] | undefined;
  mustInclude?: string[] | undefined;
}

const goldenFixtureDirectory = join(
  process.cwd(),
  "src/features/actions-analyzer/fixtures/golden",
);
const goldenFixtureExpectations = JSON.parse(
  readFileSync(join(goldenFixtureDirectory, "expected-findings.json"), "utf8"),
) as Record<string, GoldenFixtureExpectation>;

describe("golden workflow fixtures", () => {
  it("keeps expectations in sync with the fixture files on disk", () => {
    const fixtureFileNames = readdirSync(goldenFixtureDirectory)
      .filter((fileName) => fileName.endsWith(".yml"))
      .sort();

    expect(Object.keys(goldenFixtureExpectations).sort()).toEqual(
      fixtureFileNames,
    );
  });

  for (const [fixtureName, expectation] of Object.entries(
    goldenFixtureExpectations,
  )) {
    it(`matches expected findings for ${fixtureName}`, () => {
      const content = readFileSync(
        join(goldenFixtureDirectory, fixtureName),
        "utf8",
      );
      const report = analyzeWorkflowFiles([
        createWorkflowInputFile({
          content,
          path: `.github/workflows/${fixtureName}`,
          sourceKind: "sample",
        }),
      ]);
      const findingIds = [...new Set(report.findings.map((finding) => finding.ruleId))].sort();

      if (expectation.exact) {
        expect(findingIds).toEqual([...expectation.exact].sort());
        return;
      }

      for (const ruleId of expectation.mustInclude ?? []) {
        expect(findingIds).toContain(ruleId);
      }
    });
  }
});
