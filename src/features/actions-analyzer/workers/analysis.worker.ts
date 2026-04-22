/// <reference lib="webworker" />

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import type {
  WorkflowAnalysisWorkerRequest,
  WorkflowAnalysisWorkerResponse,
} from "@/features/actions-analyzer/types";

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener(
  "message",
  (event: MessageEvent<WorkflowAnalysisWorkerRequest>) => {
    try {
      const response: WorkflowAnalysisWorkerResponse = {
        report: analyzeWorkflowFiles(
          event.data.files,
          event.data.settings ?? {},
        ),
        requestId: event.data.requestId,
      };

      self.postMessage(response);
    } catch (error) {
      const response: WorkflowAnalysisWorkerResponse = {
        error:
          error instanceof Error
            ? error.message
            : "Authos could not analyze this workflow locally.",
        requestId: event.data.requestId,
      };

      self.postMessage(response);
    }
  },
);

export {};
