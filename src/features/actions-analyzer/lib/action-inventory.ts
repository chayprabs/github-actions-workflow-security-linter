import {
  getActionOriginForOwner,
  getBroadWriteScopes,
  getEnvironmentName,
  getJobEffectivePermissions,
  getPermissionScopeEntries,
  getWritePermissionScopes,
  hasIdTokenWritePermission,
  isDeploymentLikeJob,
} from "@/features/actions-analyzer/lib/security-utils";
import type {
  ActionInventoryItem,
  ActionInventoryKind,
  ActionInventoryPermissionContext,
  ActionOriginKind,
  ActionRefKind,
  NormalizedWorkflow,
  ReusableWorkflowCall,
  WorkflowActionUse,
  WorkflowJob,
  WorkflowPermissions,
  WorkflowStep,
} from "@/features/actions-analyzer/types";

const fullShaPattern = /^[a-f0-9]{40}$/iu;
const shortShaPattern = /^[a-f0-9]{7,39}$/iu;
const majorTagPattern = /^v?\d+$/u;
const semverTagPattern =
  /^v?\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?$/u;
const branchRefPattern =
  /^(?:refs\/heads\/|heads\/|main|master|develop|development|dev|trunk|stable|staging|production|release(?:[/-].+)?)$/iu;
const digestPattern = /^sha256:[a-f0-9]{64}$/iu;
const expressionPattern = /\$\{\{[\s\S]+?\}\}/u;

export function buildActionInventory(
  normalizedWorkflows: NormalizedWorkflow[],
): ActionInventoryItem[] {
  return normalizedWorkflows.flatMap((workflow) =>
    workflow.jobs.flatMap((job) => {
      const permissions = buildPermissionContext(workflow, job);
      const privilegedReasons = buildPrivilegedReasons(job, permissions);
      const itemContext = {
        filePath: workflow.filePath,
        isPrivileged: privilegedReasons.length > 0,
        jobId: job.id,
        jobName: job.name.value,
        permissions,
        privilegedReasons,
        workflowName: workflow.summary.workflowName,
      };
      const items: ActionInventoryItem[] = [];

      if (job.reusableWorkflowCall) {
        items.push(
          createReusableWorkflowInventoryItem(
            workflow,
            job,
            job.reusableWorkflowCall,
            itemContext,
          ),
        );
      }

      for (const step of job.steps) {
        if (!step.uses) {
          continue;
        }

        items.push(
          createStepActionInventoryItem(workflow, job, step, itemContext),
        );
      }

      return items;
    }),
  );
}

export function isCheckoutActionInventoryItem(item: ActionInventoryItem) {
  return (
    item.sourceType === "step" &&
    item.origin === "first-party" &&
    item.owner?.toLowerCase() === "actions" &&
    item.repo?.toLowerCase() === "checkout"
  );
}

export function isLatestActionRef(ref: string | null) {
  return ref?.trim().toLowerCase() === "latest";
}

export function isRepositoryBackedActionInventoryItem(
  item: ActionInventoryItem,
) {
  return (
    item.origin === "first-party" ||
    item.origin === "third-party" ||
    item.kind === "reusable-workflow"
  );
}

export function isTagLikeActionRefKind(refKind: ActionRefKind) {
  return refKind === "major-tag" || refKind === "semver-tag";
}

function buildPermissionContext(
  workflow: NormalizedWorkflow,
  job: WorkflowJob,
): ActionInventoryPermissionContext {
  const effectivePermissions = getJobEffectivePermissions(workflow, job);
  const source = job.permissions
    ? "job"
    : workflow.permissions
      ? "top-level"
      : "none";
  const scopes = getPermissionScopeEntries(effectivePermissions);
  const writeScopes = getWritePermissionScopes(effectivePermissions);

  return {
    broadWriteScopes: getBroadWriteScopes(effectivePermissions),
    hasIdTokenWrite: hasIdTokenWritePermission(effectivePermissions),
    hasWriteAccess: writeScopes.length > 0,
    scopes,
    shorthand:
      effectivePermissions?.kind === "shorthand"
        ? effectivePermissions.shorthand
        : null,
    source,
    summary: formatPermissionSummary(source, effectivePermissions, scopes),
    writeScopes,
  };
}

function buildPrivilegedReasons(
  job: WorkflowJob,
  permissions: ActionInventoryPermissionContext,
) {
  const reasons: string[] = [];
  const nonOidcWriteScopes = permissions.writeScopes.filter(
    (scope) => scope !== "id-token",
  );
  const environmentName = getEnvironmentName(job.environment.raw);

  if (permissions.shorthand === "write-all") {
    reasons.push("write-all token permissions");
  } else if (nonOidcWriteScopes.length > 0) {
    reasons.push(`write permissions: ${nonOidcWriteScopes.join(", ")}`);
  }

  if (permissions.hasIdTokenWrite) {
    reasons.push("id-token: write");
  }

  if (isDeploymentLikeJob(job)) {
    reasons.push(
      environmentName
        ? `deploy/release context: ${environmentName}`
        : "deploy/release context",
    );
  }

  return reasons;
}

function createStepActionInventoryItem(
  workflow: NormalizedWorkflow,
  job: WorkflowJob,
  step: WorkflowStep,
  itemContext: CommonInventoryContext,
): ActionInventoryItem {
  const uses = step.uses as WorkflowActionUse;
  const classification = classifyStepActionUse(uses);

  return {
    action: getActionDisplayNameForStepUse(uses),
    filePath: itemContext.filePath,
    isPrivileged: itemContext.isPrivileged,
    jobId: itemContext.jobId,
    jobName: itemContext.jobName,
    kind: classification.kind,
    location: uses.location ?? step.location,
    mutable: classification.mutable,
    origin: classification.origin,
    owner: uses.owner,
    path: uses.path,
    permissions: itemContext.permissions,
    pinned: classification.pinned,
    privilegedReasons: itemContext.privilegedReasons,
    ref: classification.ref,
    refKind: classification.refKind,
    repo: uses.repo,
    sourceType: "step",
    stepIndex: step.index,
    stepLabel: getStepLabel(step),
    uses: uses.raw,
    workflowName: workflow.summary.workflowName,
  };
}

function createReusableWorkflowInventoryItem(
  workflow: NormalizedWorkflow,
  job: WorkflowJob,
  reusableWorkflowCall: ReusableWorkflowCall,
  itemContext: CommonInventoryContext,
): ActionInventoryItem {
  const classification = classifyReusableWorkflowUse(reusableWorkflowCall);

  return {
    action: getActionDisplayNameForReusableWorkflow(reusableWorkflowCall),
    filePath: itemContext.filePath,
    isPrivileged: itemContext.isPrivileged,
    jobId: itemContext.jobId,
    jobName: itemContext.jobName,
    kind: classification.kind,
    location: reusableWorkflowCall.location ?? job.location,
    mutable: classification.mutable,
    origin: classification.origin,
    owner: reusableWorkflowCall.owner,
    path: reusableWorkflowCall.workflowPath,
    permissions: itemContext.permissions,
    pinned: classification.pinned,
    privilegedReasons: itemContext.privilegedReasons,
    ref: classification.ref,
    refKind: classification.refKind,
    repo: reusableWorkflowCall.repo,
    sourceType: "job",
    stepIndex: null,
    stepLabel: null,
    uses: reusableWorkflowCall.raw,
    workflowName: workflow.summary.workflowName,
  };
}

function classifyReusableWorkflowUse(
  reusableWorkflowCall: ReusableWorkflowCall,
) {
  if (reusableWorkflowCall.kind === "local-reusable-workflow") {
    return {
      kind: "reusable-workflow" as const,
      mutable: false,
      origin: "local" as const,
      pinned: true,
      ref: null,
      refKind: "none" as const,
    };
  }

  if (reusableWorkflowCall.kind === "repository-reusable-workflow") {
    const origin = getActionOriginForOwner(reusableWorkflowCall.owner);
    const refKind = classifyRepositoryRefKind(
      reusableWorkflowCall.raw,
      reusableWorkflowCall.ref,
    );

    return {
      kind: "reusable-workflow" as const,
      mutable: !isImmutableReference("reusable-workflow", origin, refKind),
      origin,
      pinned: isImmutableReference("reusable-workflow", origin, refKind),
      ref: reusableWorkflowCall.ref,
      refKind,
    };
  }

  return {
    kind: "unknown" as const,
    mutable: true,
    origin: "unknown" as const,
    pinned: false,
    ref: extractRefFromUsesValue(reusableWorkflowCall.raw),
    refKind: classifyRepositoryRefKind(
      reusableWorkflowCall.raw,
      extractRefFromUsesValue(reusableWorkflowCall.raw),
    ),
  };
}

function classifyStepActionUse(uses: WorkflowActionUse) {
  if (uses.kind === "local-action") {
    return {
      kind: "local" as const,
      mutable: false,
      origin: "local" as const,
      pinned: true,
      ref: null,
      refKind: "none" as const,
    };
  }

  if (uses.kind === "docker-action") {
    const ref = uses.digest ?? uses.tag ?? null;
    const refKind = classifyDockerRefKind(uses.raw, uses.digest, uses.tag);
    const pinned = refKind === "digest";

    return {
      kind: "docker" as const,
      mutable: !pinned,
      origin: "docker" as const,
      pinned,
      ref,
      refKind,
    };
  }

  if (uses.kind === "repository-action") {
    const origin = getActionOriginForOwner(uses.owner);
    const refKind = classifyRepositoryRefKind(uses.raw, uses.ref);
    const kind = toInventoryKind(origin);
    const pinned = isImmutableReference(kind, origin, refKind);

    return {
      kind,
      mutable: !pinned,
      origin,
      pinned,
      ref: uses.ref,
      refKind,
    };
  }

  const ref = extractRefFromUsesValue(uses.raw);
  const refKind = classifyRepositoryRefKind(uses.raw, ref);

  return {
    kind: "unknown" as const,
    mutable: true,
    origin: "unknown" as const,
    pinned: false,
    ref,
    refKind,
  };
}

function classifyDockerRefKind(
  raw: string,
  digest: string | null,
  tag: string | null,
): ActionRefKind {
  if (hasDynamicExpression(raw)) {
    return "expression";
  }

  if (digest && digestPattern.test(digest)) {
    return "digest";
  }

  if (digest) {
    return "unknown";
  }

  if (!tag) {
    return "none";
  }

  if (majorTagPattern.test(tag)) {
    return "major-tag";
  }

  if (semverTagPattern.test(tag)) {
    return "semver-tag";
  }

  return "unknown";
}

function classifyRepositoryRefKind(
  raw: string,
  ref: string | null,
): ActionRefKind {
  if (hasDynamicExpression(raw)) {
    return "expression";
  }

  if (!ref) {
    return "none";
  }

  if (fullShaPattern.test(ref)) {
    return "full-sha";
  }

  if (shortShaPattern.test(ref)) {
    return "short-sha";
  }

  if (majorTagPattern.test(ref)) {
    return "major-tag";
  }

  if (semverTagPattern.test(ref)) {
    return "semver-tag";
  }

  if (branchRefPattern.test(ref)) {
    return "branch";
  }

  return "unknown";
}

function extractRefFromUsesValue(raw: string): string | null {
  const atIndex = raw.lastIndexOf("@");

  if (atIndex === -1 || atIndex === raw.length - 1) {
    return null;
  }

  return raw.slice(atIndex + 1);
}

function formatPermissionSummary(
  source: ActionInventoryPermissionContext["source"],
  permissions: WorkflowPermissions | null,
  scopes: ActionInventoryPermissionContext["scopes"],
) {
  if (source === "none" || !permissions) {
    return "Permissions not declared";
  }

  const sourceLabel = source === "job" ? "Job" : "Workflow";

  if (permissions.kind === "shorthand" && permissions.shorthand) {
    return `${sourceLabel}: ${permissions.shorthand}`;
  }

  if (scopes.length === 0) {
    return `${sourceLabel}: explicit but unrecognized`;
  }

  return `${sourceLabel}: ${scopes
    .map((scope) => `${scope.scope}: ${scope.access}`)
    .join(", ")}`;
}

function getActionDisplayNameForReusableWorkflow(
  reusableWorkflowCall: ReusableWorkflowCall,
) {
  if (reusableWorkflowCall.kind === "local-reusable-workflow") {
    return reusableWorkflowCall.workflowPath ?? reusableWorkflowCall.raw;
  }

  if (reusableWorkflowCall.kind === "repository-reusable-workflow") {
    return [
      reusableWorkflowCall.owner,
      reusableWorkflowCall.repo,
      reusableWorkflowCall.workflowPath,
    ]
      .filter(Boolean)
      .join("/");
  }

  return reusableWorkflowCall.raw;
}

function getActionDisplayNameForStepUse(uses: WorkflowActionUse) {
  if (uses.kind === "repository-action") {
    return [uses.owner, uses.repo, uses.path].filter(Boolean).join("/");
  }

  if (uses.kind === "docker-action") {
    return uses.image ?? uses.raw;
  }

  if (uses.kind === "local-action") {
    return uses.path ?? uses.raw;
  }

  return uses.raw;
}

function getStepLabel(step: WorkflowStep) {
  return step.id.value ?? step.name.value ?? `step-${step.index + 1}`;
}

function hasDynamicExpression(value: string) {
  return expressionPattern.test(value);
}

function isImmutableReference(
  kind: ActionInventoryKind,
  origin: ActionOriginKind,
  refKind: ActionRefKind,
) {
  if (origin === "local") {
    return true;
  }

  if (kind === "docker") {
    return refKind === "digest";
  }

  return refKind === "full-sha";
}

function toInventoryKind(origin: ActionOriginKind): ActionInventoryKind {
  switch (origin) {
    case "local":
      return "local";
    case "first-party":
      return "first-party";
    case "third-party":
      return "third-party";
    case "docker":
      return "docker";
    case "unknown":
    default:
      return "unknown";
  }
}

interface CommonInventoryContext {
  filePath: string;
  isPrivileged: boolean;
  jobId: string;
  jobName: string | null;
  permissions: ActionInventoryPermissionContext;
  privilegedReasons: string[];
  workflowName: string | null;
}
