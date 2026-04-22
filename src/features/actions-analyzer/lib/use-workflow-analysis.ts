"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import { analyzeWorkflowFiles } from "@/features/actions-analyzer/lib/analyze-workflows";
import type {
  AnalyzerSettings,
  WorkflowAnalysisReport,
  WorkflowAnalysisWorkerRequest,
  WorkflowAnalysisWorkerResponse,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

interface AnalyzeNowOptions {
  includeEmptyInputFinding?: boolean | undefined;
  settings?: Partial<AnalyzerSettings> | undefined;
}

interface UseWorkflowAnalysisOptions {
  files: WorkflowInputFile[];
  settings?: Partial<AnalyzerSettings> | undefined;
}

const analysisErrorMessage = "Authos could not analyze this workflow locally.";

export function useWorkflowAnalysis({
  files,
  settings = {},
}: UseWorkflowAnalysisOptions) {
  const [report, setReport] = useState<WorkflowAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const latestInputsRef = useRef({
    files,
    settings,
  });
  const latestRequestIdRef = useRef(0);
  const pendingRequestsRef = useRef(
    new Map<
      number,
      {
        reject: (error: Error) => void;
        resolve: (report: WorkflowAnalysisReport) => void;
      }
    >(),
  );

  useEffect(() => {
    latestInputsRef.current = {
      files,
      settings,
    };
  }, [files, settings]);

  function commitAnalysisError(requestId: number, message: string) {
    if (requestId !== latestRequestIdRef.current) {
      return;
    }

    startTransition(() => {
      setError(message);
    });
    setIsAnalyzing(false);
  }

  function commitAnalysisSuccess(
    requestId: number,
    nextReport: WorkflowAnalysisReport,
  ) {
    if (requestId !== latestRequestIdRef.current) {
      return;
    }

    startTransition(() => {
      setReport(nextReport);
      setError(null);
      setLastAnalyzedAt(Date.now());
    });
    setIsAnalyzing(false);
  }

  useEffect(() => {
    if (typeof Worker === "undefined") {
      return;
    }

    try {
      const pendingRequests = pendingRequestsRef.current;
      const worker = new Worker(
        new URL("../workers/analysis.worker.ts", import.meta.url),
        {
          type: "module",
        },
      );

      const handleMessage = (
        event: MessageEvent<WorkflowAnalysisWorkerResponse>,
      ) => {
        const pendingRequest = pendingRequestsRef.current.get(
          event.data.requestId,
        );

        if (!pendingRequest) {
          return;
        }

        pendingRequestsRef.current.delete(event.data.requestId);

        if (event.data.report) {
          pendingRequest.resolve(event.data.report);
          return;
        }

        pendingRequest.reject(
          new Error(event.data.error ?? analysisErrorMessage),
        );
      };

      const handleWorkerError = () => {
        workerRef.current = null;

        for (const [requestId, pendingRequest] of pendingRequests) {
          pendingRequest.reject(new Error(analysisErrorMessage));
          pendingRequests.delete(requestId);
        }
      };

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleWorkerError);
      workerRef.current = worker;

      return () => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleWorkerError);
        worker.terminate();
        workerRef.current = null;

        for (const [requestId, pendingRequest] of pendingRequests) {
          pendingRequest.reject(new Error(analysisErrorMessage));
          pendingRequests.delete(requestId);
        }
      };
    } catch (workerError) {
      console.warn(
        "Authos could not initialize the analysis worker. Falling back to the main thread.",
        workerError,
      );
    }
  }, []);

  async function analyzeNow(options: AnalyzeNowOptions = {}) {
    const requestId = latestRequestIdRef.current + 1;
    const { files: nextFiles, settings: nextSettings } =
      latestInputsRef.current;
    const resolvedSettings: Partial<AnalyzerSettings> = {
      ...nextSettings,
      ...(options.settings ?? {}),
      includeEmptyInputFinding:
        options.includeEmptyInputFinding ??
        options.settings?.includeEmptyInputFinding ??
        nextSettings.includeEmptyInputFinding,
    };

    latestRequestIdRef.current = requestId;
    setIsAnalyzing(true);
    setError(null);

    try {
      const nextReport = workerRef.current
        ? await analyzeWithWorker(
            requestId,
            nextFiles,
            resolvedSettings,
            workerRef.current,
            pendingRequestsRef.current,
          )
        : await Promise.resolve().then(() =>
            analyzeWorkflowFiles(nextFiles, resolvedSettings),
          );

      commitAnalysisSuccess(requestId, nextReport);

      return nextReport;
    } catch (analysisError) {
      const message =
        analysisError instanceof Error
          ? analysisError.message
          : analysisErrorMessage;

      commitAnalysisError(requestId, message);
      return null;
    }
  }

  return {
    report,
    isAnalyzing,
    error,
    analyzeNow,
    lastAnalyzedAt,
  };
}

async function analyzeWithWorker(
  requestId: number,
  files: WorkflowInputFile[],
  settings: Partial<AnalyzerSettings>,
  worker: Worker,
  pendingRequests: Map<
    number,
    {
      reject: (error: Error) => void;
      resolve: (report: WorkflowAnalysisReport) => void;
    }
  >,
): Promise<WorkflowAnalysisReport> {
  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, {
      reject,
      resolve,
    });

    const request: WorkflowAnalysisWorkerRequest = {
      files,
      requestId,
      settings,
    };

    worker.postMessage(request);
  });
}
