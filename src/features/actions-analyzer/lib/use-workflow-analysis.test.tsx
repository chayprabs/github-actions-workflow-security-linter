import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import { useWorkflowAnalysis } from "@/features/actions-analyzer/lib/use-workflow-analysis";
import { createWorkflowInputFile } from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  WorkflowAnalysisWorkerRequest,
  WorkflowAnalysisWorkerResponse,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

const workerTestFiles: WorkflowInputFile[] = [
  createWorkflowInputFile({
    content: `name: Worker Path
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
    path: ".github/workflows/worker-path.yml",
    sourceKind: "sample",
  }),
];

const workerTestReport = analyzeWorkflowFiles(workerTestFiles);

class MockWorker {
  static instances: MockWorker[] = [];

  readonly errorListeners = new Set<(event: Event) => void>();
  readonly messageListeners = new Set<
    (event: MessageEvent<WorkflowAnalysisWorkerResponse>) => void
  >();
  readonly postMessage = vi.fn((request: WorkflowAnalysisWorkerRequest) => {
    queueMicrotask(() => {
      this.dispatchMessage({
        data: {
          report: workerTestReport,
          requestId: request.requestId,
        },
      } as MessageEvent<WorkflowAnalysisWorkerResponse>);
    });
  });
  readonly terminate = vi.fn();

  constructor() {
    MockWorker.instances.push(this);
  }

  addEventListener(
    type: "error" | "message",
    listener:
      | ((event: Event) => void)
      | ((event: MessageEvent<WorkflowAnalysisWorkerResponse>) => void),
  ) {
    if (type === "message") {
      this.messageListeners.add(
        listener as (event: MessageEvent<WorkflowAnalysisWorkerResponse>) => void,
      );
      return;
    }

    this.errorListeners.add(listener as (event: Event) => void);
  }

  removeEventListener(
    type: "error" | "message",
    listener:
      | ((event: Event) => void)
      | ((event: MessageEvent<WorkflowAnalysisWorkerResponse>) => void),
  ) {
    if (type === "message") {
      this.messageListeners.delete(
        listener as (event: MessageEvent<WorkflowAnalysisWorkerResponse>) => void,
      );
      return;
    }

    this.errorListeners.delete(listener as (event: Event) => void);
  }

  private dispatchMessage(event: MessageEvent<WorkflowAnalysisWorkerResponse>) {
    for (const listener of this.messageListeners) {
      listener(event);
    }
  }
}

function UseWorkflowAnalysisHarness({
  files = workerTestFiles,
}: {
  files?: WorkflowInputFile[] | undefined;
}) {
  const { analyzeNow, isAnalyzing, report } = useWorkflowAnalysis({
    files,
  });

  return (
    <div>
      <button onClick={() => void analyzeNow()} type="button">
        Analyze now
      </button>
      <div data-testid="analysis-status">
        {isAnalyzing ? "analyzing" : "idle"}
      </div>
      <div data-testid="analysis-score">
        {report ? report.summary.score : "none"}
      </div>
    </div>
  );
}

describe("useWorkflowAnalysis", () => {
  afterEach(() => {
    MockWorker.instances = [];
    vi.unstubAllGlobals();
  });

  it("uses the analysis worker when Worker is available", async () => {
    vi.stubGlobal("Worker", MockWorker as unknown as typeof Worker);

    render(<UseWorkflowAnalysisHarness />);

    fireEvent.click(screen.getByRole("button", { name: /Analyze now/i }));

    await waitFor(() => {
      expect(screen.getByTestId("analysis-score")).toHaveTextContent(
        String(workerTestReport.summary.score),
      );
    });

    expect(MockWorker.instances).toHaveLength(1);
    expect(MockWorker.instances[0]?.postMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("analysis-status")).toHaveTextContent("idle");
  });

  it("falls back to local main-thread analysis when Worker is unavailable", async () => {
    vi.stubGlobal("Worker", undefined);

    render(<UseWorkflowAnalysisHarness />);

    fireEvent.click(screen.getByRole("button", { name: /Analyze now/i }));

    await waitFor(() => {
      expect(screen.getByTestId("analysis-score")).toHaveTextContent(
        String(workerTestReport.summary.score),
      );
    });

    expect(screen.getByTestId("analysis-status")).toHaveTextContent("idle");
  });
});
