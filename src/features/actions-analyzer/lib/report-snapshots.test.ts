import { describe, expect, it, beforeEach } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";
import {
  clearReportSnapshots,
  readReportSnapshots,
  saveReportSnapshot,
} from "@/features/actions-analyzer/lib/report-snapshots";

describe("report snapshots", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearReportSnapshots();
  });

  it("saves and reads snapshots from localStorage", () => {
    const report = analyzeWorkflowFiles([
      createWorkflowInputFile({
        content:
          "name: test\non: push\njobs:\n  ci:\n    runs-on: ubuntu-latest\n",
        path: ".github/workflows/ci.yml",
        sourceKind: "paste",
      }),
    ]);

    saveReportSnapshot({ label: "Baseline", report });

    expect(readReportSnapshots()).toHaveLength(1);
    expect(readReportSnapshots()[0]?.label).toBe("Baseline");
  });
});
