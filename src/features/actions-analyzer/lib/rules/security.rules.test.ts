import { describe, expect, it } from "vitest";

import { securityWorkflowFixtures } from "@/features/actions-analyzer/fixtures/security-workflows";
import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

const securityRuleIds = [
  "GHA100",
  "GHA101",
  "GHA102",
  "GHA103",
  "GHA104",
  "GHA105",
  "GHA106",
  "GHA107",
  "GHA108",
  "GHA109",
  "GHA110",
] as const;

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

function analyzeSecurityRule(
  ruleId: (typeof securityRuleIds)[number],
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

describe("security rule pack", () => {
  it("emits GHA100 when top-level permissions are missing", () => {
    const report = analyzeSecurityRule(
      "GHA100",
      securityWorkflowFixtures.missingTopLevelPermissions,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA100",
      severity: "low",
    });
    expect(report.permissionSummary.missingPermissions).toEqual([
      ".github/workflows/gha100.yml",
    ]);
  });

  it("emits GHA101 for top-level write-all", () => {
    const report = analyzeSecurityRule(
      "GHA101",
      securityWorkflowFixtures.writeAllPermissions,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA101",
      severity: "high",
    });
  });

  it("emits GHA102 for broad write scopes", () => {
    const report = analyzeSecurityRule(
      "GHA102",
      securityWorkflowFixtures.broadWritePermissions,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA102",
      severity: "high",
    });
    expect(report.permissionSummary.writeScopes).toHaveLength(1);
  });

  it("emits GHA103 when pull_request_target is present", () => {
    const report = analyzeSecurityRule(
      "GHA103",
      securityWorkflowFixtures.pullRequestTarget,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA103",
      severity: "high",
    });
    expect(report.triggerSummary.untrustedEvents).toContain(
      "pull_request_target",
    );
  });

  it("emits GHA104 when pull_request_target checks out the PR head", () => {
    const report = analyzeSecurityRule(
      "GHA104",
      securityWorkflowFixtures.pullRequestTargetCheckoutHead,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA104",
      severity: "critical",
    });
    expect(report.securitySummary.criticalFindings).toBe(1);
  });

  it("emits GHA105 for self-hosted pull request runners", () => {
    const report = analyzeSecurityRule(
      "GHA105",
      securityWorkflowFixtures.selfHostedPullRequest,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA105",
      severity: "high",
    });
  });

  it("emits GHA106 for workflow_run follow-up risk", () => {
    const report = analyzeSecurityRule(
      "GHA106",
      securityWorkflowFixtures.workflowRunPrivileged,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA106",
      severity: "high",
    });
    expect(report.triggerSummary.privilegedEvents).toContain("workflow_run");
  });

  it("emits GHA107 when a secret is assigned at job env scope", () => {
    const report = analyzeSecurityRule(
      "GHA107",
      securityWorkflowFixtures.secretsInJobEnv,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA107",
      severity: "medium",
    });
  });

  it("emits GHA108 for long-lived cloud credential secret names", () => {
    const report = analyzeSecurityRule(
      "GHA108",
      securityWorkflowFixtures.longLivedCloudSecret,
    );

    expect(report.findings[0]).toMatchObject({
      confidence: "medium",
      ruleId: "GHA108",
      severity: "medium",
    });
  });

  it("emits GHA109 for deployment-like jobs on untrusted pull request triggers", () => {
    const report = analyzeSecurityRule(
      "GHA109",
      securityWorkflowFixtures.untrustedDeployment,
    );

    expect(report.findings[0]).toMatchObject({
      ruleId: "GHA109",
      severity: "high",
    });
  });

  it("emits GHA110 when broad permissions and third-party actions mix", () => {
    const report = analyzeSecurityRule(
      "GHA110",
      securityWorkflowFixtures.privilegedThirdPartyAction,
    );

    expect(report.findings[0]).toMatchObject({
      relatedJobs: ["publish"],
      ruleId: "GHA110",
      severity: "medium",
    });
  });

  it("does not emit high-severity security findings for a safe read-only push workflow", () => {
    const report = analyzeWorkflowFiles(
      [
        createInput(
          ".github/workflows/safe.yml",
          securityWorkflowFixtures.safeReadOnlyPush,
        ),
      ],
      {
        enabledRuleIds: [...securityRuleIds],
      },
    );

    expect(report.findings.filter((finding) => finding.severity === "high")).toEqual(
      [],
    );
    expect(report.findings.filter((finding) => finding.severity === "critical")).toEqual(
      [],
    );
  });

  it("changes missing-permissions severity by analysis profile", () => {
    const balancedReport = analyzeSecurityRule(
      "GHA100",
      securityWorkflowFixtures.missingTopLevelPermissions,
      {
        profile: "balanced",
      },
    );
    const strictReport = analyzeSecurityRule(
      "GHA100",
      securityWorkflowFixtures.missingTopLevelPermissions,
      {
        profile: "strict-security",
      },
    );

    expect(balancedReport.findings[0]?.severity).toBe("low");
    expect(strictReport.findings[0]?.severity).toBe("high");
  });
});
