import type {
  AnalyzerSettings,
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types/domain";

export interface AnalyzerWorkerRequest {
  files: WorkflowInputFile[];
  requestId: number;
  settings?: Partial<AnalyzerSettings>;
}

export interface AnalyzerWorkerResponse {
  error?: string | undefined;
  report?: WorkflowAnalysisReport | undefined;
  requestId: number;
}
