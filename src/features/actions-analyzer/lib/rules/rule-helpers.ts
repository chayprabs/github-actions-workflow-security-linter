import {
  isMap,
  isNode,
  isScalar,
  isSeq,
  type Pair,
  type YAMLMap,
} from "yaml";

import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import type {
  AnalyzerFinding,
  NormalizedWorkflow,
  ParsedYamlFile,
  RuleContext,
  RuleDefinition,
  SourceLocation,
  WorkflowJob,
  WorkflowStep,
} from "@/features/actions-analyzer/types";

export interface WorkflowJobVisit {
  job: WorkflowJob;
  parsedFile?: ParsedYamlFile | undefined;
  workflow: NormalizedWorkflow;
}

export interface WorkflowStepVisit extends WorkflowJobVisit {
  step: WorkflowStep;
}

export interface DuplicateKeyMatch {
  duplicateWarning?: AnalyzerFinding | undefined;
  key: string;
  location?: SourceLocation | undefined;
  occurrences: number;
}

export function requireRuleDefinition(ruleId: string): RuleDefinition {
  const definition = getRuleDefinition(ruleId);

  if (!definition) {
    throw new Error(`Missing rule definition for ${ruleId}.`);
  }

  return definition;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

export function buildEvidence(
  parsedFile?: ParsedYamlFile | undefined,
  location?: SourceLocation | undefined,
): string | undefined {
  return parsedFile?.sourceMap.getSourceSnippet(location) ?? undefined;
}

export function createFileStartLocation(
  parsedFile: ParsedYamlFile,
): SourceLocation {
  const { column, line } = parsedFile.sourceMap.getLineColumnFromOffset(0);

  return {
    filePath: parsedFile.filePath,
    line,
    column,
    endLine: line,
    endColumn: column,
  };
}

export function findDuplicateMapKeysAtPath(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
): DuplicateKeyMatch[] {
  const map = getMapAtPath(parsedFile.document?.contents, path);

  if (!map) {
    return [];
  }

  const occurrences = new Map<string, Pair<unknown, unknown>[]>();

  for (const pair of map.items) {
    const key = getScalarString(pair.key);

    if (!key) {
      continue;
    }

    const existingPairs = occurrences.get(key) ?? [];
    existingPairs.push(pair);
    occurrences.set(key, existingPairs);
  }

  return [...occurrences.entries()].flatMap(([key, pairs]) => {
    if (pairs.length < 2) {
      return [];
    }

    return pairs.slice(1).map((pair) => {
      const location = getNodeLocation(parsedFile, pair.key);

      return {
        duplicateWarning: findDuplicateWarningForLocation(
          parsedFile.duplicateKeyWarnings,
          location,
        ),
        key,
        location,
        occurrences: pairs.length,
      };
    });
  });
}

export function findPathLocation(
  parsedFile: ParsedYamlFile | undefined,
  path: readonly (number | string)[],
  fallback?: SourceLocation | undefined,
): SourceLocation | undefined {
  return parsedFile?.sourceMap.findLocationForPath(path) ?? fallback;
}

export function getRawJobEntries(parsedFile: ParsedYamlFile): Array<{
  jobId: string;
  raw: Record<string, unknown>;
}> {
  const root = getParsedRootRecord(parsedFile);
  const jobs = root?.jobs;

  if (!isPlainObject(jobs)) {
    return [];
  }

  return Object.entries(jobs).map(([jobId, raw]) => ({
    jobId,
    raw: asRecord(raw),
  }));
}

export function getRawStepEntries(jobRaw: Record<string, unknown>): Array<{
  index: number;
  raw: Record<string, unknown>;
}> {
  const steps = jobRaw.steps;

  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((raw, index) => ({
    index,
    raw: asRecord(raw),
  }));
}

export function getStepLabel(step: WorkflowStep): string {
  return step.id.value ?? step.name.value ?? `step-${step.index + 1}`;
}

export function getWorkflowAnchorLocation(
  workflow: NormalizedWorkflow,
  parsedFile?: ParsedYamlFile | undefined,
): SourceLocation | undefined {
  return (
    workflow.onLocation ??
    workflow.jobsLocation ??
    workflow.permissions?.location ??
    workflow.name.location ??
    (parsedFile ? createFileStartLocation(parsedFile) : undefined)
  );
}

export function hasOwnField(value: unknown, key: string): boolean {
  return Object.hasOwn(asRecord(value), key);
}

export function isExpressionString(value: string): boolean {
  return value.includes("${{");
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function visitJobs(context: RuleContext): WorkflowJobVisit[] {
  return context.normalizedWorkflows.flatMap((workflow) => {
    const parsedFile = context.getParsedFile(workflow.filePath);

    return workflow.jobs.map((job) => ({
      job,
      parsedFile,
      workflow,
    }));
  });
}

export function visitSteps(context: RuleContext): WorkflowStepVisit[] {
  return visitJobs(context).flatMap(({ job, parsedFile, workflow }) =>
    job.steps.map((step) => ({
      job,
      parsedFile,
      step,
      workflow,
    })),
  );
}

function findDuplicateWarningForLocation(
  duplicateWarnings: AnalyzerFinding[],
  location?: SourceLocation | undefined,
) {
  if (!location) {
    return undefined;
  }

  return duplicateWarnings.find((warning) => {
    return (
      warning.location?.line === location.line &&
      warning.location.column === location.column
    );
  });
}

function getMapAtPath(
  current: unknown,
  path: readonly (number | string)[],
): YAMLMap<unknown, unknown> | null {
  const resolved = resolveYamlPath(current, path);

  return resolved && isMap(resolved) ? resolved : null;
}

function getNodeLocation(
  parsedFile: ParsedYamlFile,
  node: unknown,
): SourceLocation | undefined {
  if (!isNode(node) || !node.range) {
    return undefined;
  }

  const start = parsedFile.sourceMap.getLineColumnFromOffset(node.range[0]);
  const end = parsedFile.sourceMap.getLineColumnFromOffset(
    Math.max(node.range[0], node.range[1] - 1),
  );

  return {
    filePath: parsedFile.filePath,
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

function getParsedRootRecord(
  parsedFile: ParsedYamlFile,
): Record<string, unknown> | null {
  return isPlainObject(parsedFile.parsedValue)
    ? (parsedFile.parsedValue as Record<string, unknown>)
    : null;
}

function getScalarString(value: unknown) {
  return isScalar(value) && typeof value.value === "string"
    ? value.value
    : null;
}

function resolveYamlPath(
  current: unknown,
  path: readonly (number | string)[],
): unknown {
  let node = current;

  for (const segment of path) {
    if (typeof segment === "number") {
      if (!isSeq(node)) {
        return null;
      }

      node = node.items[segment];
      continue;
    }

    if (!isMap(node)) {
      return null;
    }

    const pair = node.items.find((item) => {
      return isScalar(item.key) ? item.key.value === segment : false;
    });
    node = pair?.value;
  }

  return node;
}
