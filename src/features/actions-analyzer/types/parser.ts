import type { Document, ParsedNode } from "yaml";

import type {
  AnalyzerFinding,
  SourceLocation,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types/domain";

export type ParsedYamlDocument = Document.Parsed<ParsedNode, true>;

export type ParsedYamlRootType =
  | "map"
  | "null"
  | "scalar"
  | "sequence"
  | "unknown";

export interface ParsedYamlSourceMap {
  findJobLocation: (jobName: string) => SourceLocation | undefined;
  findLocationForPath: (
    path: readonly (number | string)[],
  ) => SourceLocation | undefined;
  findScalarValueLocation: (
    path: readonly (number | string)[],
  ) => SourceLocation | undefined;
  findStepLocation: (
    jobName: string,
    stepIndex: number,
  ) => SourceLocation | undefined;
  findTopLevelKeyLocation: (key: string) => SourceLocation | undefined;
  getLineColumnFromOffset: (offset: number) => {
    column: number;
    line: number;
  };
  getSourceSnippet: (
    location?: SourceLocation | undefined,
    contextLines?: number | undefined,
  ) => string | null;
}

export interface ParsedYamlFile {
  content: string;
  document: ParsedYamlDocument | null;
  documents: ParsedYamlDocument[];
  duplicateKeyWarnings: AnalyzerFinding[];
  fileId: string;
  filePath: string;
  isSuccessful: boolean;
  parsedValue: unknown;
  parseFindings: AnalyzerFinding[];
  rootType: ParsedYamlRootType;
  sourceMap: ParsedYamlSourceMap;
  syntaxErrors: AnalyzerFinding[];
  warnings: AnalyzerFinding[];
  workflowFile: WorkflowInputFile;
}
