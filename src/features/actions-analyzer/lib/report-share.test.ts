import { describe, expect, it } from "vitest";

import {
  buildPrivacySafeShareUrl,
  getPrivacySafeShareableSampleId,
  parseAnalyzerShareState,
} from "@/features/actions-analyzer/lib/report-share";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

describe("report share links", () => {
  it("builds privacy-safe share links without workflow content by default", () => {
    const url = buildPrivacySafeShareUrl({
      baseUrl:
        "https://authos.local/tools/github-actions-workflow-analyzer?existing=1",
      state: {
        results: {
          groupBy: "file",
          searchQuery: "permissions",
          selectedCategory: "permissions",
          selectedFilePath: ".github/workflows/release.yml",
          selectedJobId: "release",
          selectedSeverities: ["high", "critical"],
          showSecurityOnly: true,
          showWarningsOnly: false,
          sortBy: "rule",
          view: "report",
        },
        sampleId: "risky-pull-request-target",
      },
    });

    expect(url).toContain("sample=risky-pull-request-target");
    expect(url).toContain("search=permissions");
    expect(url).not.toContain("name%3A+Release");
    expect(parseAnalyzerShareState(new URL(url).search)).toMatchObject({
      sampleId: "risky-pull-request-target",
      results: {
        groupBy: "file",
        selectedCategory: "permissions",
        selectedFilePath: ".github/workflows/release.yml",
        selectedJobId: "release",
        selectedSeverities: ["high", "critical"],
        showSecurityOnly: true,
        sortBy: "rule",
        view: "report",
      },
    });
  });

  it("only exposes sample identifiers for sample-based inputs", () => {
    const localFile = createWorkflowInputFile({
      content: "name: Private\non: push\n",
      path: ".github/workflows/private.yml",
      sourceKind: "paste",
    });
    const sampleFile = createWorkflowInputFile({
      content: "name: Sample\non: push\n",
      path: ".github/workflows/sample.yml",
      sourceKind: "sample",
    });

    expect(
      getPrivacySafeShareableSampleId({
        files: [localFile],
        selectedSampleId: "manual",
      }),
    ).toBeUndefined();
    expect(
      getPrivacySafeShareableSampleId({
        files: [sampleFile],
        selectedSampleId: "safe-basic",
      }),
    ).toBe("safe-basic");
  });
});
