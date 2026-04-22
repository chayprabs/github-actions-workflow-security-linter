import type { SourceLocation } from "@/features/actions-analyzer/types/domain";

export type ExpressionContextName =
  | "env"
  | "github"
  | "inputs"
  | "job"
  | "jobs"
  | "matrix"
  | "needs"
  | "runner"
  | "secrets"
  | "steps"
  | "strategy"
  | "vars";

export type ExpressionFieldType =
  | "concurrency"
  | "env"
  | "if"
  | "name"
  | "other"
  | "run"
  | "shell"
  | "strategy"
  | "timeout-minutes"
  | "uses"
  | "with"
  | "working-directory";

export interface ExtractedExpression {
  endOffset: number;
  expressionText: string;
  isClosed: boolean;
  isMalformed: boolean;
  isWrapped: boolean;
  location?: SourceLocation | undefined;
  rawExpression: string;
  startOffset: number;
}

export interface ExpressionContextAnalysis {
  contexts: ExpressionContextName[];
  functions: string[];
  references: string[];
  unknownContexts: string[];
}

export interface WorkflowExpression extends ExpressionContextAnalysis {
  containsUntrustedContext: boolean;
  fieldPath: Array<number | string>;
  fieldPathLabel: string;
  fieldType: ExpressionFieldType;
  filePath: string;
  isMalformed: boolean;
  isWrapped: boolean;
  jobId?: string | undefined;
  location?: SourceLocation | undefined;
  matchedUntrustedContexts: string[];
  rawExpression: string;
  rawValue: string;
  startOffset: number;
  stepIndex?: number | undefined;
  stepLabel?: string | undefined;
  text: string;
}

export interface ExpressionSummary {
  contexts: string[];
  totalExpressions: number;
  unknownContexts: string[];
  untrustedContextUsages: number;
}
