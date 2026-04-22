import type { ExpressionSummary } from "@/features/actions-analyzer/types/expressions";

export const severities = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;

export type Severity = (typeof severities)[number];

export const findingCategories = [
  "syntax",
  "expressions",
  "triggers",
  "permissions",
  "security",
  "supply-chain",
  "runner",
  "matrix",
  "reliability",
  "performance",
  "maintainability",
  "privacy",
] as const;

export type FindingCategory = (typeof findingCategories)[number];

export const findingConfidences = ["high", "medium", "low"] as const;

export type FindingConfidence = (typeof findingConfidences)[number];

export const analyzerProfiles = [
  "balanced",
  "strict-security",
  "open-source",
  "private-app",
  "deploy-release",
] as const;

export type AnalyzerProfile = (typeof analyzerProfiles)[number];

export const workflowInputSourceKinds = [
  "paste",
  "upload",
  "sample",
  "github",
] as const;

export type WorkflowInputSourceKind = (typeof workflowInputSourceKinds)[number];

export const reportGrades = ["A", "B", "C", "D", "F"] as const;

export type ReportGrade = (typeof reportGrades)[number];

export interface SourceLocation {
  filePath: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}

export interface WorkflowInputFile {
  id: string;
  path: string;
  content: string;
  sizeBytes: number;
  sourceKind: WorkflowInputSourceKind;
}

export interface AnalyzerSettings {
  profile: AnalyzerProfile;
  requireShaPinning: boolean;
  warnOnMissingTopLevelPermissions: boolean;
  allowSelfHostedOnPullRequest: boolean;
  maxMatrixCombinationsBeforeWarning: number;
  detectSecretsInInput: boolean;
  includeEmptyInputFinding?: boolean | undefined;
  enabledRuleIds?: string[] | undefined;
  disabledRuleIds?: string[] | undefined;
}

export interface RuleDefinition {
  id: string;
  title: string;
  description: string;
  category: FindingCategory;
  defaultSeverity: Severity;
  docsUrl?: string | undefined;
  enabledByDefault: boolean;
  tags: string[];
}

export interface SuggestedFix {
  kind: "insert" | "replace" | "delete" | "manual";
  label: string;
  description: string;
  filePath: string;
  range?: SourceRange | undefined;
  replacement?: string | undefined;
  safety: "safe" | "review" | "manual";
}

export interface AnalyzerFinding {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: Severity;
  category: FindingCategory;
  confidence: FindingConfidence;
  filePath: string;
  location?: SourceLocation | undefined;
  evidence?: string | undefined;
  remediation: string;
  docsUrl?: string | undefined;
  tags: string[];
  relatedJobs: string[];
  relatedSteps: string[];
  fix?: SuggestedFix | undefined;
}

export interface ActionInventoryItem {
  action: string;
  filePath: string;
  uses: string;
  ref: string | null;
  isPinnedToSha: boolean;
  relatedJobs: string[];
  relatedSteps: string[];
}

export interface PermissionScopeSummary {
  filePath: string;
  scope: string;
  access: string;
  source: "top-level" | "job";
  jobName?: string | undefined;
  location?: SourceLocation | undefined;
}

export interface PermissionDeclarationSummary {
  filePath: string;
  jobName?: string | undefined;
  location?: SourceLocation | undefined;
  scopes: PermissionScopeSummary[];
  shorthand: string | null;
}

export interface PermissionSummary {
  hasTopLevelPermissions: boolean;
  jobOverrides: PermissionDeclarationSummary[];
  missingPermissions: string[];
  topLevel: PermissionDeclarationSummary[];
  writeScopes: PermissionScopeSummary[];
  scopes: PermissionScopeSummary[];
  recommendedPermissions: string[];
  warnings: string[];
}

export interface TriggerDetail {
  filePath: string;
  event: string;
  filters: string[];
}

export interface TriggerSummary {
  events: string[];
  details: TriggerDetail[];
  manualEvents: string[];
  privilegedEvents: string[];
  releaseEvents: string[];
  scheduledEvents: string[];
  trustedEvents: string[];
  untrustedEvents: string[];
  usesPullRequestTarget: boolean;
  usesWorkflowDispatch: boolean;
  usesSchedule: boolean;
}

export interface SecuritySummary {
  criticalFindings: number;
  highFindings: number;
  totalFindings: number;
}

export interface MatrixJobSummary {
  filePath: string;
  jobName: string;
  dimensions: string[];
  combinations: number;
}

export interface MatrixSummary {
  totalJobs: number;
  maxCombinations: number;
  jobs: MatrixJobSummary[];
}

export interface AttackPath {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  relatedRuleIds: string[];
  filePaths: string[];
}

export interface AnalysisSummary {
  severityCounts: Record<Severity, number>;
  categoryCounts: Record<FindingCategory, number>;
  totalFindings: number;
  score: number;
  grade: ReportGrade;
  analyzedFileCount: number;
  workflowCount: number;
}

export interface WorkflowAnalysisReport {
  generatedAt: string;
  files: WorkflowInputFile[];
  summary: AnalysisSummary;
  findings: AnalyzerFinding[];
  actionInventory: ActionInventoryItem[];
  expressionSummary: ExpressionSummary;
  permissionSummary: PermissionSummary;
  securitySummary: SecuritySummary;
  triggerSummary: TriggerSummary;
  matrixSummary: MatrixSummary;
  attackPaths: AttackPath[];
  settings: AnalyzerSettings;
}
