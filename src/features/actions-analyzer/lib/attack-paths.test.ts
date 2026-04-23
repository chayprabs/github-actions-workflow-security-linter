import { describe, expect, it } from "vitest";

import { attackPathWorkflowFixtures } from "@/features/actions-analyzer/fixtures/attack-path-workflows";
import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

describe("attack path heuristics", () => {
  it.each([
    {
      expectedRuleIds: ["GHA103", "GHA104"],
      fixture: attackPathWorkflowFixtures.pullRequestTargetWriteToken,
      title: "PR head code could run with repository write access",
    },
    {
      expectedRuleIds: ["GHA105"],
      fixture: attackPathWorkflowFixtures.selfHostedShell,
      title: "Untrusted pull request jobs reach self-hosted shell execution",
    },
    {
      expectedRuleIds: ["GHA200", "GHA208"],
      fixture: attackPathWorkflowFixtures.privilegedThirdParty,
      title: "Mutable third-party dependency sits in a privileged job",
    },
    {
      expectedRuleIds: ["GHA106"],
      fixture: attackPathWorkflowFixtures.workflowRunArtifacts,
      title:
        "Upstream artifacts could flow into a privileged follow-up workflow",
    },
    {
      expectedRuleIds: ["GHA055"],
      fixture: attackPathWorkflowFixtures.untrustedContextPrivileged,
      title: "Untrusted input could steer a privileged shell path",
    },
  ])(
    "derives an attack path for $title",
    ({ expectedRuleIds, fixture, title }) => {
      const report = analyzeWorkflowFiles([
        createInput(
          `.github/workflows/${title.toLowerCase().replace(/\W+/gu, "-")}.yml`,
          fixture,
        ),
      ]);
      const attackPath = report.attackPaths.find(
        (candidate) => candidate.title === title,
      );

      expect(attackPath).toBeDefined();
      expect(attackPath?.description).toMatch(/could|increases risk/i);
      expect(attackPath?.heuristic).toMatch(/Static heuristic/i);
      expect(attackPath?.relatedRuleIds).toEqual(
        expect.arrayContaining(expectedRuleIds),
      );
      expect(attackPath?.mitigationChecklist.length).toBeGreaterThanOrEqual(3);
    },
  );

  it("does not derive high-confidence attack paths for a safe read-only workflow", () => {
    const report = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/safe.yml",
        attackPathWorkflowFixtures.safeReadOnly,
      ),
    ]);

    expect(report.attackPaths).toEqual([]);
  });
});
