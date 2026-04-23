import { describe, expect, it } from "vitest";

import { permissionWorkflowFixtures } from "@/features/actions-analyzer/fixtures/permission-workflows";
import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

function createInput(path: string, content: string) {
  return createWorkflowInputFile({
    content,
    path,
    sourceKind: "sample",
  });
}

describe("permission minimizer", () => {
  it("infers conservative job-level permission recommendations and a copyable YAML block", () => {
    const report = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/delivery.yml",
        permissionWorkflowFixtures.mixedPrivilegePipeline,
      ),
    ]);
    const workflowRecommendation =
      report.permissionSummary.workflowRecommendations[0];
    const recommendationByJobId = new Map(
      report.permissionSummary.jobRecommendations.map((recommendation) => [
        recommendation.jobId,
        recommendation,
      ]),
    );

    expect(workflowRecommendation).toMatchObject({
      recommendedPermissions: {
        contents: "read",
      },
      trustLevel: "mixed",
    });
    expect(workflowRecommendation?.copyableYaml).toContain("jobs:");
    expect(workflowRecommendation?.copyableYaml).toContain("publish:");
    expect(workflowRecommendation?.copyableYaml).toContain("packages: write");
    expect(workflowRecommendation?.copyableYaml).toContain("release:");
    expect(workflowRecommendation?.copyableYaml).toContain(
      "pull-requests: write",
    );

    expect(recommendationByJobId.get("build")).toMatchObject({
      recommendedPermissions: {
        contents: "read",
      },
      riskLabel: "high",
    });
    expect(recommendationByJobId.get("publish")).toMatchObject({
      recommendedPermissions: {
        contents: "read",
        packages: "write",
      },
    });
    expect(recommendationByJobId.get("release")).toMatchObject({
      recommendedPermissions: {
        contents: "write",
      },
    });
    expect(recommendationByJobId.get("auth")).toMatchObject({
      recommendedPermissions: {
        contents: "read",
        "id-token": "write",
      },
    });
    expect(recommendationByJobId.get("comment")).toMatchObject({
      recommendedPermissions: {
        contents: "read",
        "pull-requests": "write",
      },
    });
    expect(recommendationByJobId.get("scan")).toMatchObject({
      recommendedPermissions: {
        contents: "read",
        "security-events": "write",
      },
    });
  });

  it("explains why obvious write scopes are still recommended instead of silently removing them", () => {
    const report = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/delivery.yml",
        permissionWorkflowFixtures.mixedPrivilegePipeline,
      ),
    ]);
    const publishRecommendation =
      report.permissionSummary.jobRecommendations.find(
        (recommendation) => recommendation.jobId === "publish",
      );
    const releaseRecommendation =
      report.permissionSummary.jobRecommendations.find(
        (recommendation) => recommendation.jobId === "release",
      );

    expect(
      publishRecommendation?.scopeRecommendations.find(
        (scope) => scope.scope === "packages",
      )?.rationale,
    ).toMatch(/publish/i);
    expect(
      releaseRecommendation?.scopeRecommendations.find(
        (scope) => scope.scope === "contents",
      )?.rationale,
    ).toMatch(/release|tag|version/i);
  });

  it("keeps a simple read-only baseline for safe workflows", () => {
    const report = analyzeWorkflowFiles([
      createInput(
        ".github/workflows/safe.yml",
        permissionWorkflowFixtures.safeReadOnly,
      ),
    ]);

    expect(report.permissionSummary.workflowRecommendations[0]).toMatchObject({
      recommendedPermissions: {
        contents: "read",
      },
    });
    expect(report.permissionSummary.jobRecommendations[0]).toMatchObject({
      recommendedPermissions: {
        contents: "read",
      },
      riskLabel: "low",
    });
  });
});
