import type { SourceLocation } from "@/features/actions-analyzer/types/domain";
import type { ParsedYamlRootType } from "@/features/actions-analyzer/types/parser";

export interface NormalizedValue<T = unknown> {
  location?: SourceLocation | undefined;
  raw: unknown;
  value: T | null;
}

export type KnownWorkflowTriggerKind =
  | "deployment"
  | "merge_group"
  | "pull_request"
  | "pull_request_target"
  | "push"
  | "release"
  | "schedule"
  | "workflow_dispatch"
  | "workflow_run";

export interface WorkflowTrigger {
  additionalFilters: Record<string, unknown>;
  branches: string[];
  branchesIgnore: string[];
  inputs: Record<string, unknown>;
  isKnown: boolean;
  kind: KnownWorkflowTriggerKind | "unknown";
  location?: SourceLocation | undefined;
  name: string;
  paths: string[];
  pathsIgnore: string[];
  raw: unknown;
  schedules: string[];
  tags: string[];
  tagsIgnore: string[];
  types: string[];
  workflows: string[];
}

export interface WorkflowPermissions {
  kind: "empty" | "mapping" | "shorthand" | "unknown";
  location?: SourceLocation | undefined;
  raw: unknown;
  scopeLocations: Partial<Record<string, SourceLocation>>;
  scopes: Record<string, unknown>;
  shorthand: string | null;
}

export interface WorkflowMatrix {
  additionalFields: Record<string, unknown>;
  dimensions: Record<string, unknown>;
  exclude: Record<string, unknown>[];
  include: Record<string, unknown>[];
  location?: SourceLocation | undefined;
  raw: unknown;
}

export interface WorkflowStrategy {
  additionalFields: Record<string, unknown>;
  failFast: NormalizedValue<boolean>;
  location?: SourceLocation | undefined;
  matrix: WorkflowMatrix | null;
  maxParallel: NormalizedValue<number>;
  raw: unknown;
}

export interface WorkflowActionUse {
  digest: string | null;
  image: string | null;
  kind: "docker-action" | "local-action" | "repository-action" | "unknown";
  location?: SourceLocation | undefined;
  owner: string | null;
  path: string | null;
  raw: string;
  ref: string | null;
  repo: string | null;
  tag: string | null;
}

export interface WorkflowRunCommand {
  location?: SourceLocation | undefined;
  raw: unknown;
  text: string | null;
}

export interface ReusableWorkflowCall {
  kind: "local-reusable-workflow" | "repository-reusable-workflow" | "unknown";
  location?: SourceLocation | undefined;
  owner: string | null;
  raw: string;
  ref: string | null;
  repo: string | null;
  workflowPath: string | null;
}

export interface WorkflowStep {
  additionalFields: Record<string, unknown>;
  continueOnError: NormalizedValue<boolean | number | string>;
  env: NormalizedValue<Record<string, unknown>>;
  id: NormalizedValue<string>;
  if: NormalizedValue<string>;
  index: number;
  location?: SourceLocation | undefined;
  name: NormalizedValue<string>;
  raw: unknown;
  run: WorkflowRunCommand | null;
  shell: NormalizedValue<string>;
  timeoutMinutes: NormalizedValue<number>;
  uses: WorkflowActionUse | null;
  with: NormalizedValue<Record<string, unknown>>;
  workingDirectory: NormalizedValue<string>;
}

export interface WorkflowJob {
  additionalFields: Record<string, unknown>;
  concurrency: NormalizedValue<unknown>;
  environment: NormalizedValue<unknown>;
  id: string;
  if: NormalizedValue<string>;
  location?: SourceLocation | undefined;
  name: NormalizedValue<string>;
  needs: NormalizedValue<string[]>;
  permissions: WorkflowPermissions | null;
  raw: unknown;
  reusableWorkflowCall: ReusableWorkflowCall | null;
  runsOn: NormalizedValue<unknown>;
  secrets: NormalizedValue<unknown>;
  steps: WorkflowStep[];
  strategy: WorkflowStrategy | null;
  timeoutMinutes: NormalizedValue<number>;
  with: NormalizedValue<Record<string, unknown>>;
}

export interface NormalizedWorkflowSummary {
  jobCount: number;
  stepCount: number;
  triggers: string[];
  workflowName: string | null;
}

export interface NormalizedWorkflow {
  additionalTopLevelFields: Record<string, unknown>;
  concurrency: NormalizedValue<unknown>;
  defaults: NormalizedValue<Record<string, unknown>>;
  env: NormalizedValue<Record<string, unknown>>;
  fileId: string;
  filePath: string;
  isWorkflowMapping: boolean;
  jobs: WorkflowJob[];
  jobsLocation?: SourceLocation | undefined;
  jobsRaw: unknown;
  name: NormalizedValue<string>;
  on: WorkflowTrigger[];
  onLocation?: SourceLocation | undefined;
  onRaw: unknown;
  permissions: WorkflowPermissions | null;
  raw: unknown;
  rootType: ParsedYamlRootType;
  summary: NormalizedWorkflowSummary;
}
