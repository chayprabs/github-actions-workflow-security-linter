import type {
  AnalyzerFinding,
  AnalyzerSettings,
  RuleDefinition,
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types/domain";
import type { NormalizedWorkflow } from "@/features/actions-analyzer/types/normalized";
import type { ParsedYamlFile } from "@/features/actions-analyzer/types/parser";

export interface RuleContext {
  files: WorkflowInputFile[];
  normalizedWorkflows: NormalizedWorkflow[];
  parseFindings: AnalyzerFinding[];
  parsedFiles: ParsedYamlFile[];
  settings: AnalyzerSettings;
  getParsedFile: (filePath: string) => ParsedYamlFile | undefined;
  getWorkflow: (filePath: string) => NormalizedWorkflow | undefined;
}

export interface RuleModule {
  check: (context: RuleContext) => AnalyzerFinding[];
  definition: RuleDefinition;
}

export interface WorkflowAnalysisWorkerRequest {
  files: WorkflowInputFile[];
  requestId: number;
  settings?: Partial<AnalyzerSettings> | undefined;
}

export interface WorkflowAnalysisWorkerResponse {
  error?: string | undefined;
  report?: WorkflowAnalysisReport | undefined;
  requestId: number;
}
