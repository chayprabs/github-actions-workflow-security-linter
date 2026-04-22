import { isMap, isNode, isScalar, type Pair, type YAMLMap } from "yaml";

import { findLocationForPath } from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import type {
  NormalizedValue,
  NormalizedWorkflow,
  ParsedYamlFile,
  ReusableWorkflowCall,
  WorkflowActionUse,
  WorkflowJob,
  WorkflowMatrix,
  WorkflowPermissions,
  WorkflowRunCommand,
  WorkflowStep,
  WorkflowStrategy,
  WorkflowTrigger,
} from "@/features/actions-analyzer/types";

const knownTopLevelKeys = new Set([
  "name",
  "on",
  "permissions",
  "env",
  "defaults",
  "concurrency",
  "jobs",
]);

const knownJobKeys = new Set([
  "name",
  "runs-on",
  "needs",
  "if",
  "permissions",
  "environment",
  "timeout-minutes",
  "concurrency",
  "strategy",
  "steps",
  "uses",
  "secrets",
  "with",
]);

const knownStepKeys = new Set([
  "id",
  "name",
  "uses",
  "run",
  "shell",
  "if",
  "with",
  "env",
  "working-directory",
  "continue-on-error",
  "timeout-minutes",
]);

const knownTriggerKinds = new Set([
  "push",
  "pull_request",
  "pull_request_target",
  "workflow_run",
  "workflow_dispatch",
  "schedule",
  "release",
  "deployment",
  "merge_group",
]);

const knownTriggerFilterKeys = new Set([
  "branches",
  "branches-ignore",
  "tags",
  "tags-ignore",
  "paths",
  "paths-ignore",
  "types",
  "workflows",
  "schedule",
  "inputs",
]);

const knownStrategyKeys = new Set(["matrix", "fail-fast", "max-parallel"]);

export function normalizeParsedWorkflow(
  parsedFile: ParsedYamlFile,
): NormalizedWorkflow {
  const document = parsedFile.document;
  const rootNode = document?.contents;
  const rootMap = isMap(rootNode) ? rootNode : null;
  const rawRoot = rootNode
    ? nodeToJs(document, rootNode)
    : parsedFile.parsedValue;
  const rawTopLevel = rootMap ? mapToRecord(document, rootMap) : {};
  const jobsNode = rootMap ? findMapPair(rootMap, "jobs")?.value : undefined;
  const jobsRaw = rawTopLevel.jobs;
  const jobs = normalizeJobs(parsedFile, jobsNode);
  const triggers = normalizeTriggers(parsedFile, rawTopLevel.on);
  const stepCount = jobs.reduce((total, job) => total + job.steps.length, 0);

  return {
    additionalTopLevelFields: omitKeys(rawTopLevel, knownTopLevelKeys),
    concurrency: createUnknownField(
      parsedFile,
      ["concurrency"],
      rawTopLevel.concurrency,
    ),
    defaults: createRecordField(parsedFile, ["defaults"], rawTopLevel.defaults),
    env: createRecordField(parsedFile, ["env"], rawTopLevel.env),
    fileId: parsedFile.fileId,
    filePath: parsedFile.filePath,
    isWorkflowMapping: parsedFile.rootType === "map",
    jobs,
    jobsLocation: findLocationForPath(parsedFile, ["jobs"]),
    jobsRaw,
    name: createStringField(parsedFile, ["name"], rawTopLevel.name),
    on: triggers,
    onLocation: findLocationForPath(parsedFile, ["on"]),
    onRaw: rawTopLevel.on,
    permissions: normalizePermissions(
      parsedFile,
      ["permissions"],
      rawTopLevel.permissions,
      rootMap ? findMapPair(rootMap, "permissions")?.value : undefined,
    ),
    raw: rawRoot,
    rootType: parsedFile.rootType,
    summary: {
      jobCount: jobs.length,
      stepCount,
      triggers: triggers.map((trigger) => trigger.name),
      workflowName:
        typeof rawTopLevel.name === "string" ? rawTopLevel.name : null,
    },
  };
}

export function normalizeParsedWorkflowFiles(
  parsedFiles: ParsedYamlFile[],
): NormalizedWorkflow[] {
  return parsedFiles.map((parsedFile) => normalizeParsedWorkflow(parsedFile));
}

export function parseWorkflowActionUse(
  raw: unknown,
  location?: NormalizedValue["location"],
): WorkflowActionUse | null {
  if (typeof raw !== "string") {
    return null;
  }

  if (/^\.\/(?!\.github\/workflows\/).+/u.test(raw)) {
    return {
      digest: null,
      image: null,
      kind: "local-action",
      location,
      owner: null,
      path: raw,
      raw,
      ref: null,
      repo: null,
      tag: null,
    };
  }

  if (raw.startsWith("docker://")) {
    const imageReference = raw.slice("docker://".length);
    const atIndex = imageReference.lastIndexOf("@");
    const slashIndex = imageReference.lastIndexOf("/");
    const colonIndex = imageReference.lastIndexOf(":");
    const digest =
      atIndex >= 0 ? imageReference.slice(atIndex + 1) || null : null;
    const imageWithoutDigest =
      atIndex >= 0 ? imageReference.slice(0, atIndex) : imageReference;
    const tag =
      digest === null && colonIndex > slashIndex
        ? imageReference.slice(colonIndex + 1) || null
        : null;
    const image =
      digest === null && colonIndex > slashIndex
        ? imageReference.slice(0, colonIndex)
        : imageWithoutDigest;

    return {
      digest,
      image: image || null,
      kind: "docker-action",
      location,
      owner: null,
      path: null,
      raw,
      ref: null,
      repo: null,
      tag,
    };
  }

  const repositoryMatch =
    /^([^/\s@]+)\/([^/\s@]+)(\/[^@\s]+)?@([^@\s]+)$/u.exec(raw);

  if (repositoryMatch) {
    const owner = repositoryMatch[1] ?? null;
    const repo = repositoryMatch[2] ?? null;
    const path = repositoryMatch[3] ? repositoryMatch[3].slice(1) : null;

    if (path && isReusableWorkflowPath(path)) {
      return {
        digest: null,
        image: null,
        kind: "unknown",
        location,
        owner,
        path,
        raw,
        ref: repositoryMatch[4] ?? null,
        repo,
        tag: null,
      };
    }

    return {
      digest: null,
      image: null,
      kind: "repository-action",
      location,
      owner,
      path,
      raw,
      ref: repositoryMatch[4] ?? null,
      repo,
      tag: null,
    };
  }

  return {
    digest: null,
    image: null,
    kind: "unknown",
    location,
    owner: null,
    path: null,
    raw,
    ref: null,
    repo: null,
    tag: null,
  };
}

export function parseReusableWorkflowCall(
  raw: unknown,
  location?: NormalizedValue["location"],
): ReusableWorkflowCall | null {
  if (typeof raw !== "string") {
    return null;
  }

  if (isLocalReusableWorkflow(raw)) {
    return {
      kind: "local-reusable-workflow",
      location,
      owner: null,
      raw,
      ref: null,
      repo: null,
      workflowPath: raw.replace(/^\.\//u, ""),
    };
  }

  const repositoryMatch =
    /^([^/\s@]+)\/([^/\s@]+)\/(\.github\/workflows\/[^@\s]+\.ya?ml)@([^@\s]+)$/u.exec(
      raw,
    );

  if (repositoryMatch) {
    return {
      kind: "repository-reusable-workflow",
      location,
      owner: repositoryMatch[1] ?? null,
      raw,
      ref: repositoryMatch[4] ?? null,
      repo: repositoryMatch[2] ?? null,
      workflowPath: repositoryMatch[3] ?? null,
    };
  }

  return {
    kind: "unknown",
    location,
    owner: null,
    raw,
    ref: null,
    repo: null,
    workflowPath: null,
  };
}

function normalizeJobs(
  parsedFile: ParsedYamlFile,
  jobsNode: unknown,
): WorkflowJob[] {
  const jobsMap = isMap(jobsNode) ? jobsNode : null;
  const document = parsedFile.document;

  if (!jobsMap || !document) {
    return [];
  }

  return jobsMap.items.flatMap((pair) => {
    const jobId = getScalarString(pair.key);

    if (!jobId) {
      return [];
    }

    const raw = nodeToJs(document, pair.value);
    const rawJob = asRecord(raw);

    return [
      {
        additionalFields: omitKeys(rawJob, knownJobKeys),
        concurrency: createUnknownField(
          parsedFile,
          ["jobs", jobId, "concurrency"],
          rawJob.concurrency,
        ),
        environment: createUnknownField(
          parsedFile,
          ["jobs", jobId, "environment"],
          rawJob.environment,
        ),
        id: jobId,
        if: createStringField(parsedFile, ["jobs", jobId, "if"], rawJob.if),
        location: findLocationForPath(parsedFile, ["jobs", jobId]),
        name: createStringField(
          parsedFile,
          ["jobs", jobId, "name"],
          rawJob.name,
        ),
        needs: createValueField(
          parsedFile,
          ["jobs", jobId, "needs"],
          rawJob.needs,
          normalizeNeeds,
        ),
        permissions: normalizePermissions(
          parsedFile,
          ["jobs", jobId, "permissions"],
          rawJob.permissions,
          isMap(pair.value)
            ? findMapPair(pair.value, "permissions")?.value
            : undefined,
        ),
        raw,
        reusableWorkflowCall: parseReusableWorkflowCall(
          rawJob.uses,
          findLocationForPath(parsedFile, ["jobs", jobId, "uses"]),
        ),
        runsOn: createUnknownField(
          parsedFile,
          ["jobs", jobId, "runs-on"],
          rawJob["runs-on"],
        ),
        secrets: createUnknownField(
          parsedFile,
          ["jobs", jobId, "secrets"],
          rawJob.secrets,
        ),
        steps: normalizeSteps(parsedFile, jobId, rawJob.steps),
        strategy: normalizeStrategy(parsedFile, jobId, rawJob.strategy),
        timeoutMinutes: createValueField(
          parsedFile,
          ["jobs", jobId, "timeout-minutes"],
          rawJob["timeout-minutes"],
          normalizeFiniteNumber,
        ),
        with: createRecordField(
          parsedFile,
          ["jobs", jobId, "with"],
          rawJob.with,
        ),
      },
    ];
  });
}

function normalizeSteps(
  parsedFile: ParsedYamlFile,
  jobId: string,
  rawSteps: unknown,
): WorkflowStep[] {
  if (!Array.isArray(rawSteps)) {
    return [];
  }

  return rawSteps.map((rawStep, index) => {
    const stepRecord = asRecord(rawStep);

    return {
      additionalFields: omitKeys(stepRecord, knownStepKeys),
      continueOnError: createValueField(
        parsedFile,
        ["jobs", jobId, "steps", index, "continue-on-error"],
        stepRecord["continue-on-error"],
        normalizeContinueOnError,
      ),
      env: createRecordField(
        parsedFile,
        ["jobs", jobId, "steps", index, "env"],
        stepRecord.env,
      ),
      id: createStringField(
        parsedFile,
        ["jobs", jobId, "steps", index, "id"],
        stepRecord.id,
      ),
      if: createStringField(
        parsedFile,
        ["jobs", jobId, "steps", index, "if"],
        stepRecord.if,
      ),
      index,
      location: findLocationForPath(parsedFile, [
        "jobs",
        jobId,
        "steps",
        index,
      ]),
      name: createStringField(
        parsedFile,
        ["jobs", jobId, "steps", index, "name"],
        stepRecord.name,
      ),
      raw: rawStep,
      run: normalizeRunCommand(parsedFile, jobId, index, stepRecord.run),
      shell: createStringField(
        parsedFile,
        ["jobs", jobId, "steps", index, "shell"],
        stepRecord.shell,
      ),
      timeoutMinutes: createValueField(
        parsedFile,
        ["jobs", jobId, "steps", index, "timeout-minutes"],
        stepRecord["timeout-minutes"],
        normalizeFiniteNumber,
      ),
      uses: parseWorkflowActionUse(
        stepRecord.uses,
        findLocationForPath(parsedFile, [
          "jobs",
          jobId,
          "steps",
          index,
          "uses",
        ]),
      ),
      with: createRecordField(
        parsedFile,
        ["jobs", jobId, "steps", index, "with"],
        stepRecord.with,
      ),
      workingDirectory: createStringField(
        parsedFile,
        ["jobs", jobId, "steps", index, "working-directory"],
        stepRecord["working-directory"],
      ),
    };
  });
}

function normalizeStrategy(
  parsedFile: ParsedYamlFile,
  jobId: string,
  rawStrategy: unknown,
): WorkflowStrategy | null {
  if (rawStrategy === undefined) {
    return null;
  }

  const strategyRecord = asRecord(rawStrategy);

  return {
    additionalFields: omitKeys(strategyRecord, knownStrategyKeys),
    failFast: createValueField(
      parsedFile,
      ["jobs", jobId, "strategy", "fail-fast"],
      strategyRecord["fail-fast"],
      normalizeBoolean,
    ),
    location: findLocationForPath(parsedFile, ["jobs", jobId, "strategy"]),
    matrix: normalizeMatrix(parsedFile, jobId, strategyRecord.matrix),
    maxParallel: createValueField(
      parsedFile,
      ["jobs", jobId, "strategy", "max-parallel"],
      strategyRecord["max-parallel"],
      normalizeFiniteNumber,
    ),
    raw: rawStrategy,
  };
}

function normalizeMatrix(
  parsedFile: ParsedYamlFile,
  jobId: string,
  rawMatrix: unknown,
): WorkflowMatrix | null {
  if (rawMatrix === undefined) {
    return null;
  }

  const matrixRecord = asRecord(rawMatrix);
  const include = Array.isArray(matrixRecord.include)
    ? matrixRecord.include.flatMap((entry) => {
        const record = asRecord(entry);
        return Object.keys(record).length > 0 ? [record] : [];
      })
    : [];
  const exclude = Array.isArray(matrixRecord.exclude)
    ? matrixRecord.exclude.flatMap((entry) => {
        const record = asRecord(entry);
        return Object.keys(record).length > 0 ? [record] : [];
      })
    : [];

  return {
    additionalFields: {},
    dimensions: Object.fromEntries(
      Object.entries(matrixRecord).filter(([key]) => {
        return key !== "include" && key !== "exclude";
      }),
    ),
    exclude,
    include,
    location: findLocationForPath(parsedFile, [
      "jobs",
      jobId,
      "strategy",
      "matrix",
    ]),
    raw: rawMatrix,
  };
}

function normalizeTriggers(
  parsedFile: ParsedYamlFile,
  rawOn: unknown,
): WorkflowTrigger[] {
  if (typeof rawOn === "string") {
    return [createTrigger(parsedFile, ["on"], rawOn, rawOn)];
  }

  if (Array.isArray(rawOn)) {
    return rawOn.flatMap((value, index) => {
      return typeof value === "string"
        ? [createTrigger(parsedFile, ["on", index], value, value)]
        : [];
    });
  }

  if (!isPlainObject(rawOn)) {
    return [];
  }

  return Object.entries(rawOn).map(([name, rawValue]) => {
    return createTrigger(parsedFile, ["on", name], name, rawValue);
  });
}

function createTrigger(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
  name: string,
  raw: unknown,
): WorkflowTrigger {
  const triggerRecord = asRecord(raw);

  return {
    additionalFilters: omitKeys(triggerRecord, knownTriggerFilterKeys),
    branches: normalizeStringList(triggerRecord.branches),
    branchesIgnore: normalizeStringList(triggerRecord["branches-ignore"]),
    inputs: asRecord(triggerRecord.inputs),
    isKnown: knownTriggerKinds.has(name),
    kind: knownTriggerKinds.has(name)
      ? (name as WorkflowTrigger["kind"])
      : "unknown",
    location: findLocationForPath(parsedFile, path),
    name,
    paths: normalizeStringList(triggerRecord.paths),
    pathsIgnore: normalizeStringList(triggerRecord["paths-ignore"]),
    raw,
    schedules: normalizeSchedules(name, raw, triggerRecord),
    tags: normalizeStringList(triggerRecord.tags),
    tagsIgnore: normalizeStringList(triggerRecord["tags-ignore"]),
    types: normalizeStringList(triggerRecord.types),
    workflows: normalizeStringList(triggerRecord.workflows),
  };
}

function normalizePermissions(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
  rawPermissions: unknown,
  permissionsNode: unknown,
): WorkflowPermissions | null {
  if (rawPermissions === undefined && permissionsNode === undefined) {
    return null;
  }

  const location = findLocationForPath(parsedFile, path);
  const permissionsRecord = asRecord(rawPermissions);
  const scopeLocations: WorkflowPermissions["scopeLocations"] = {};

  if (isMap(permissionsNode)) {
    for (const pair of permissionsNode.items) {
      const scope = getScalarString(pair.key);

      if (!scope) {
        continue;
      }

      scopeLocations[scope] = findLocationForPath(parsedFile, [...path, scope]);
    }
  }

  if (rawPermissions == null) {
    return {
      kind: "empty",
      location,
      raw: rawPermissions,
      scopeLocations,
      scopes: {},
      shorthand: null,
    };
  }

  if (typeof rawPermissions === "string") {
    return {
      kind: "shorthand",
      location,
      raw: rawPermissions,
      scopeLocations,
      scopes: {},
      shorthand: rawPermissions,
    };
  }

  if (isPlainObject(rawPermissions)) {
    return {
      kind: "mapping",
      location,
      raw: rawPermissions,
      scopeLocations,
      scopes: permissionsRecord,
      shorthand: null,
    };
  }

  return {
    kind: "unknown",
    location,
    raw: rawPermissions,
    scopeLocations,
    scopes: {},
    shorthand: null,
  };
}

function normalizeRunCommand(
  parsedFile: ParsedYamlFile,
  jobId: string,
  stepIndex: number,
  rawRun: unknown,
): WorkflowRunCommand | null {
  if (rawRun === undefined) {
    return null;
  }

  return {
    location: findLocationForPath(parsedFile, [
      "jobs",
      jobId,
      "steps",
      stepIndex,
      "run",
    ]),
    raw: rawRun,
    text: typeof rawRun === "string" ? rawRun : null,
  };
}

function createStringField(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
  raw: unknown,
): NormalizedValue<string> {
  return createValueField(parsedFile, path, raw, normalizeString);
}

function createRecordField(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
  raw: unknown,
): NormalizedValue<Record<string, unknown>> {
  return createValueField(parsedFile, path, raw, asRecordOrNull);
}

function createUnknownField(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
  raw: unknown,
): NormalizedValue<unknown> {
  return createValueField(parsedFile, path, raw, normalizeUnknownValue);
}

function createValueField<T>(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
  raw: unknown,
  normalize: (rawValue: unknown) => T | null,
): NormalizedValue<T> {
  return {
    location: findLocationForPath(parsedFile, path),
    raw,
    value: normalize(raw),
  };
}

function normalizeBoolean(raw: unknown) {
  return typeof raw === "boolean" ? raw : null;
}

function normalizeContinueOnError(raw: unknown) {
  return typeof raw === "boolean" ||
    typeof raw === "number" ||
    typeof raw === "string"
    ? raw
    : null;
}

function normalizeFiniteNumber(raw: unknown) {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function normalizeNeeds(raw: unknown) {
  if (typeof raw === "string") {
    return [raw];
  }

  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }

  return [];
}

function normalizeSchedules(
  triggerName: string,
  raw: unknown,
  triggerRecord: Record<string, unknown>,
) {
  const scheduleSource =
    triggerName === "schedule" ? raw : triggerRecord.schedule;

  if (typeof scheduleSource === "string") {
    return [scheduleSource];
  }

  if (!Array.isArray(scheduleSource)) {
    return [];
  }

  return scheduleSource.flatMap((entry) => {
    if (typeof entry === "string") {
      return [entry];
    }

    const record = asRecord(entry);

    return typeof record.cron === "string" ? [record.cron] : [];
  });
}

function normalizeString(raw: unknown) {
  return typeof raw === "string" ? raw : null;
}

function normalizeStringList(raw: unknown) {
  if (typeof raw === "string") {
    return [raw];
  }

  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }

  return [];
}

function normalizeUnknownValue(raw: unknown) {
  return raw === undefined ? null : raw;
}

function asRecord(raw: unknown): Record<string, unknown> {
  return isPlainObject(raw) ? (raw as Record<string, unknown>) : {};
}

function asRecordOrNull(raw: unknown) {
  return isPlainObject(raw) ? (raw as Record<string, unknown>) : null;
}

function findMapPair(
  map: YAMLMap<unknown, unknown>,
  key: number | string,
): Pair<unknown, unknown> | undefined {
  return map.items.find((pair) => {
    return isScalar(pair.key) ? pair.key.value === key : false;
  });
}

function getScalarString(value: unknown) {
  return isScalar(value) && typeof value.value === "string"
    ? value.value
    : null;
}

function isLocalReusableWorkflow(value: string) {
  return /^\.?\/?\.github\/workflows\/.+\.ya?ml$/u.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReusableWorkflowPath(value: string) {
  return /^\.github\/workflows\/.+\.ya?ml$/u.test(value);
}

function mapToRecord(
  document: ParsedYamlFile["document"],
  map: YAMLMap<unknown, unknown>,
) {
  return Object.fromEntries(
    map.items.flatMap((pair) => {
      const key = getScalarString(pair.key);

      return key ? [[key, nodeToJs(document, pair.value)]] : [];
    }),
  );
}

function nodeToJs(
  document: ParsedYamlFile["document"],
  value: unknown,
): unknown {
  if (!document || value == null || !isNode(value)) {
    return value ?? null;
  }

  try {
    return value.toJS(document, { maxAliasCount: 100 });
  } catch {
    return null;
  }
}

function omitKeys(
  record: Record<string, unknown>,
  keysToOmit: Set<string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !keysToOmit.has(key)),
  );
}
