import { describe, expect, it, vi } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";

describe("launch privacy checks", () => {
  it("analyzes local pasted or uploaded workflow content without making network requests", () => {
    const fetchSpy = vi.fn();

    vi.stubGlobal("fetch", fetchSpy);

    const report = analyzeWorkflowFiles([
      createWorkflowInputFile({
        content: `name: Local Analysis
on: push
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - run: echo ok
`,
        path: ".github/workflows/local-analysis.yml",
        sourceKind: "paste",
      }),
    ]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(report.summary.analyzedFileCount).toBe(1);

    vi.unstubAllGlobals();
  });
});
