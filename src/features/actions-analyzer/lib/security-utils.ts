import type {
  NormalizedWorkflow,
  PermissionDeclarationSummary,
  PermissionScopeSummary,
  TriggerSummary,
  WorkflowActionUse,
  WorkflowJob,
  WorkflowPermissions,
} from "@/features/actions-analyzer/types";

export const firstPartyActionOwners = new Set(["actions", "github"]);
export const longLivedCloudSecretNames = new Set([
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AZURE_CREDENTIALS",
  "GCP_SERVICE_ACCOUNT_KEY",
]);
export const privilegedTriggerNames = new Set([
  "pull_request_target",
  "workflow_run",
]);
export const releaseOrDeployKeywords = [
  "deploy",
  "production",
  "publish",
  "release",
] as const;
export const sensitiveWritePermissionScopes = new Set([
  "contents",
  "id-token",
  "packages",
  "pull-requests",
  "security-events",
]);
export const untrustedTriggerNames = new Set([
  "pull_request",
  "pull_request_target",
]);

export function buildPermissionDeclarationSummary(
  filePath: string,
  permissions: WorkflowPermissions,
  source: PermissionScopeSummary["source"],
  jobName?: string,
): PermissionDeclarationSummary {
  return {
    filePath,
    jobName,
    location: permissions.location,
    scopes: toPermissionScopes(filePath, permissions, source, jobName),
    shorthand: permissions.kind === "shorthand" ? permissions.shorthand : null,
  };
}

export function getBroadWriteScopes(
  permissions: WorkflowPermissions | null,
): string[] {
  if (!permissions) {
    return [];
  }

  if (
    permissions.kind === "shorthand" &&
    permissions.shorthand === "write-all"
  ) {
    return ["write-all"];
  }

  if (permissions.kind !== "mapping") {
    return [];
  }

  return Object.entries(permissions.scopes)
    .flatMap(([scope, access]) => {
      return access === "write" && sensitiveWritePermissionScopes.has(scope)
        ? [scope]
        : [];
    })
    .sort();
}

export function getJobEffectivePermissions(
  workflow: NormalizedWorkflow,
  job: WorkflowJob,
): WorkflowPermissions | null {
  return job.permissions ?? workflow.permissions;
}

export function getStepActionUses(job: WorkflowJob): WorkflowActionUse[] {
  return job.steps.flatMap((step) => (step.uses ? [step.uses] : []));
}

export function getWorkflowEventNames(workflow: NormalizedWorkflow): string[] {
  return workflow.on.map((trigger) => trigger.name);
}

export function hasBroadWritePermissions(
  permissions: WorkflowPermissions | null,
): boolean {
  return getBroadWriteScopes(permissions).length > 0;
}

export function hasPrivilegedTriggers(workflow: NormalizedWorkflow): boolean {
  return workflow.on.some((trigger) => privilegedTriggerNames.has(trigger.name));
}

export function hasTrustedTriggers(workflow: NormalizedWorkflow): boolean {
  return workflow.on.some((trigger) => !untrustedTriggerNames.has(trigger.name));
}

export function hasUntrustedPullRequestTrigger(
  workflow: NormalizedWorkflow,
): boolean {
  return workflow.on.some((trigger) => untrustedTriggerNames.has(trigger.name));
}

export function isDeploymentLikeJob(job: WorkflowJob): boolean {
  const candidates = [
    job.id,
    job.name.value,
    normalizeEnvironmentName(job.environment.raw),
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return candidates.some((value) =>
    releaseOrDeployKeywords.some((keyword) => value.includes(keyword)),
  );
}

export function isLikelyPullRequestHeadCheckoutRef(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.replace(/\s+/gu, "");

  return (
    normalized.includes("github.event.pull_request.head.") ||
    normalized.includes("github.head_ref")
  );
}

export function isSecurityPackRuleId(ruleId: string): boolean {
  const numericRuleId = Number.parseInt(ruleId.slice(3), 10);

  return Number.isFinite(numericRuleId) && numericRuleId >= 100 && numericRuleId < 200;
}

export function isSelfHostedRunsOn(rawRunsOn: unknown): boolean {
  if (typeof rawRunsOn === "string") {
    return rawRunsOn
      .split(",")
      .map((segment) => segment.trim().toLowerCase())
      .includes("self-hosted");
  }

  if (Array.isArray(rawRunsOn)) {
    return rawRunsOn.some((value) => {
      return typeof value === "string" && value.trim().toLowerCase() === "self-hosted";
    });
  }

  if (!isPlainObject(rawRunsOn)) {
    return false;
  }

  return isSelfHostedRunsOn(rawRunsOn.labels);
}

export function isThirdPartyActionUse(
  uses: WorkflowActionUse | null,
): boolean {
  return (
    uses?.kind === "repository-action" &&
    !!uses.owner &&
    !firstPartyActionOwners.has(uses.owner.toLowerCase())
  );
}

export function shouldRelaxBroadWriteSeverity(
  workflow: NormalizedWorkflow,
  job?: WorkflowJob | undefined,
): boolean {
  if (hasUntrustedPullRequestTrigger(workflow)) {
    return false;
  }

  if (job) {
    return isDeploymentLikeJob(job);
  }

  return workflow.jobs.length === 1 && isDeploymentLikeJob(workflow.jobs[0]!);
}

export function summarizeTriggerKinds(
  workflows: NormalizedWorkflow[],
): TriggerSummary {
  const detailMap = workflows.flatMap((workflow) =>
    workflow.on.map((trigger) => ({
      event: trigger.name,
      filePath: workflow.filePath,
      filters: getTriggerFilterLabels(trigger),
    })),
  );
  const events = Array.from(new Set(detailMap.map((detail) => detail.event))).sort();
  const trustedEvents = events.filter(
    (event) => !untrustedTriggerNames.has(event),
  );
  const untrustedEvents = events.filter((event) =>
    untrustedTriggerNames.has(event),
  );
  const privilegedEvents = events.filter((event) =>
    privilegedTriggerNames.has(event),
  );

  return {
    events,
    details: detailMap,
    manualEvents: events.filter((event) => event === "workflow_dispatch"),
    privilegedEvents,
    releaseEvents: events.filter((event) =>
      event === "deployment" || event === "release",
    ),
    scheduledEvents: events.filter((event) => event === "schedule"),
    trustedEvents,
    untrustedEvents,
    usesPullRequestTarget: events.includes("pull_request_target"),
    usesWorkflowDispatch: events.includes("workflow_dispatch"),
    usesSchedule: events.includes("schedule"),
  };
}

export function toPermissionScopes(
  filePath: string,
  permissions: WorkflowPermissions,
  source: PermissionScopeSummary["source"],
  jobName?: string,
): PermissionScopeSummary[] {
  if (permissions.kind === "shorthand" && permissions.shorthand) {
    return [
      {
        access: permissions.shorthand,
        filePath,
        jobName,
        location: permissions.location,
        scope: "*",
        source,
      },
    ];
  }

  if (permissions.kind !== "mapping") {
    return [];
  }

  return Object.entries(permissions.scopes).map(([scope, access]) => ({
    access: String(access),
    filePath,
    jobName,
    location: permissions.scopeLocations[scope] ?? permissions.location,
    scope,
    source,
  }));
}

function getTriggerFilterLabels(trigger: NormalizedWorkflow["on"][number]) {
  const labels: string[] = [];

  if (trigger.branches.length > 0) {
    labels.push("branches");
  }

  if (trigger.branchesIgnore.length > 0) {
    labels.push("branches-ignore");
  }

  if (trigger.paths.length > 0) {
    labels.push("paths");
  }

  if (trigger.pathsIgnore.length > 0) {
    labels.push("paths-ignore");
  }

  if (trigger.tags.length > 0) {
    labels.push("tags");
  }

  if (trigger.tagsIgnore.length > 0) {
    labels.push("tags-ignore");
  }

  if (trigger.types.length > 0) {
    labels.push("types");
  }

  if (trigger.workflows.length > 0) {
    labels.push("workflows");
  }

  if (trigger.schedules.length > 0) {
    labels.push("schedule");
  }

  if (Object.keys(trigger.inputs).length > 0) {
    labels.push("inputs");
  }

  labels.push(...Object.keys(trigger.additionalFilters));

  return labels;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEnvironmentName(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  return typeof value.name === "string" ? value.name : null;
}
