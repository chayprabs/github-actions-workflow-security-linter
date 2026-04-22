import { describe, expect, it } from "vitest";

import { supplyChainWorkflowFixtures } from "@/features/actions-analyzer/fixtures/supply-chain-workflows";
import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

const supplyChainRuleIds = [
  "GHA200",
  "GHA201",
  "GHA202",
  "GHA203",
  "GHA204",
  "GHA205",
  "GHA206",
  "GHA207",
  "GHA208",
] as const;

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

function analyzeSupplyChainRule(
  ruleId: (typeof supplyChainRuleIds)[number],
  content: string,
  settings: Parameters<typeof analyzeWorkflowFiles>[1] = {},
) {
  return analyzeWorkflowFiles(
    [createInput(`.github/workflows/${ruleId.toLowerCase()}.yml`, content)],
    {
      ...settings,
      enabledRuleIds: [ruleId],
    },
  );
}

describe("supply-chain rule pack", () => {
  it("builds action inventory entries for step and job uses", () => {
    const report = analyzeWorkflowFiles(
      [
        createInput(
          ".github/workflows/inventory.yml",
          supplyChainWorkflowFixtures.inventoryCoverage,
        ),
      ],
      {
        enabledRuleIds: [...supplyChainRuleIds],
      },
    );

    expect(report.actionInventory).toHaveLength(5);
    expect(report.actionInventory).toMatchObject([
      {
        action: "actions/checkout",
        kind: "first-party",
        pinned: false,
        ref: "v4",
        refKind: "major-tag",
        sourceType: "step",
        stepLabel: "Checkout",
      },
      {
        action: "vendor/audit-action",
        kind: "third-party",
        pinned: false,
        ref: "main",
        refKind: "branch",
        sourceType: "step",
        stepLabel: "Audit",
      },
      {
        action: "./.github/actions/setup",
        kind: "local",
        pinned: true,
        ref: null,
        refKind: "none",
        sourceType: "step",
      },
      {
        action: "alpine",
        kind: "docker",
        pinned: true,
        refKind: "digest",
        sourceType: "step",
      },
      {
        action: "vendor/platform/.github/workflows/deploy.yml",
        kind: "reusable-workflow",
        origin: "third-party",
        pinned: false,
        ref: "v1",
        refKind: "major-tag",
        sourceType: "job",
      },
    ]);
  });

  it("emits GHA200 when a third-party reference is not pinned to a full SHA", () => {
    const balancedReport = analyzeSupplyChainRule(
      "GHA200",
      supplyChainWorkflowFixtures.thirdPartyBranch,
      {
        profile: "balanced",
      },
    );
    const strictReport = analyzeSupplyChainRule(
      "GHA200",
      supplyChainWorkflowFixtures.thirdPartyBranch,
      {
        profile: "strict-security",
      },
    );

    expect(balancedReport.findings[0]).toMatchObject({
      ruleId: "GHA200",
      severity: "medium",
    });
    expect(strictReport.findings[0]).toMatchObject({
      ruleId: "GHA200",
      severity: "high",
    });
  });

  it("does not emit GHA200 for a third-party full SHA pin", () => {
    const report = analyzeSupplyChainRule(
      "GHA200",
      supplyChainWorkflowFixtures.thirdPartyFullSha,
    );

    expect(report.findings).toEqual([]);
  });

  it("emits GHA201 for first-party mutable tags and elevates in strict mode", () => {
    const balancedReport = analyzeSupplyChainRule(
      "GHA201",
      supplyChainWorkflowFixtures.firstPartyMutableTag,
      {
        profile: "balanced",
      },
    );
    const strictReport = analyzeSupplyChainRule(
      "GHA201",
      supplyChainWorkflowFixtures.firstPartyMutableTag,
      {
        profile: "strict-security",
      },
    );

    expect(balancedReport.findings[0]).toMatchObject({
      ruleId: "GHA201",
      severity: "low",
    });
    expect(strictReport.findings[0]).toMatchObject({
      ruleId: "GHA201",
      severity: "medium",
    });
  });

  it("emits GHA202 for branch references", () => {
    const report = analyzeSupplyChainRule(
      "GHA202",
      supplyChainWorkflowFixtures.thirdPartyBranch,
    );

    expect(report.findings[0]).toMatchObject({
      confidence: "high",
      ruleId: "GHA202",
      severity: "high",
    });
  });

  it("emits GHA203 for short SHA pins", () => {
    const report = analyzeSupplyChainRule(
      "GHA203",
      supplyChainWorkflowFixtures.thirdPartyShortSha,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA203",
      severity: "high",
    });
  });

  it("emits GHA204 for Docker tags but not digests", () => {
    const taggedReport = analyzeSupplyChainRule(
      "GHA204",
      supplyChainWorkflowFixtures.dockerTag,
    );
    const digestReport = analyzeSupplyChainRule(
      "GHA204",
      supplyChainWorkflowFixtures.dockerDigest,
    );

    expect(taggedReport.findings[0]).toMatchObject({
      ruleId: "GHA204",
      severity: "medium",
    });
    expect(digestReport.findings).toEqual([]);
  });

  it("emits GHA205 for dynamic uses references", () => {
    const report = analyzeSupplyChainRule(
      "GHA205",
      supplyChainWorkflowFixtures.dynamicUses,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA205",
      severity: "high",
    });
  });

  it("emits GHA206 when actions/checkout persists credentials in a write-capable job", () => {
    const riskyReport = analyzeSupplyChainRule(
      "GHA206",
      supplyChainWorkflowFixtures.checkoutWithPersistedCredentials,
    );
    const safeReport = analyzeSupplyChainRule(
      "GHA206",
      supplyChainWorkflowFixtures.checkoutWithPersistedCredentialsDisabled,
    );

    expect(riskyReport.findings[0]).toMatchObject({
      confidence: "medium",
      ruleId: "GHA206",
      severity: "medium",
    });
    expect(safeReport.findings).toEqual([]);
  });

  it("emits GHA207 for latest tags with higher severity for Docker", () => {
    const actionReport = analyzeSupplyChainRule(
      "GHA207",
      supplyChainWorkflowFixtures.latestTagAction,
    );
    const dockerReport = analyzeSupplyChainRule(
      "GHA207",
      supplyChainWorkflowFixtures.latestTagDocker,
    );

    expect(actionReport.findings[0]).toMatchObject({
      ruleId: "GHA207",
      severity: "medium",
    });
    expect(dockerReport.findings[0]).toMatchObject({
      ruleId: "GHA207",
      severity: "high",
    });
  });

  it("emits GHA208 when a third-party reference runs in a privileged job", () => {
    const report = analyzeSupplyChainRule(
      "GHA208",
      supplyChainWorkflowFixtures.privilegedThirdPartyAction,
    );

    expect(report.findings[0]).toMatchObject({
      confidence: "high",
      relatedJobs: ["deploy"],
      ruleId: "GHA208",
      severity: "high",
    });
  });
});
