import {
  buildPermissionDeclarationSummary,
  getBroadWriteScopes,
  getEnvironmentName,
  getJobEffectivePermissions,
  getWritePermissionScopes,
  hasUntrustedPullRequestTrigger,
  toPermissionScopes,
} from "@/features/actions-analyzer/lib/security-utils";
import type {
  ActionInventoryItem,
  JobPermissionRecommendation,
  NormalizedWorkflow,
  PermissionScopeRecommendation,
  PermissionSummary,
  WorkflowJob,
  WorkflowPermissions,
  WorkflowPermissionRecommendation,
} from "@/features/actions-analyzer/types";

type RecommendedPermissionMap = Record<string, "read" | "write">;
type PermissionRecommendationTrustLevel =
  WorkflowPermissionRecommendation["trustLevel"];

const permissionScopeOrder = [
  "actions",
  "attestations",
  "checks",
  "contents",
  "deployments",
  "discussions",
  "id-token",
  "issues",
  "packages",
  "pages",
  "pull-requests",
  "security-events",
  "statuses",
] as const;
const packagePublishPattern =
  /\b(?:npm|pnpm|yarn)\s+publish\b|\bpoetry\s+publish\b|\btwine\s+upload\b|\bdotnet\s+nuget\s+push\b|\bgem\s+push\b/iu;
const releaseWritePattern =
  /\bgh\s+release\s+(?:create|upload)\b|\bgit\s+tag\b|\bgit\s+push\b|\bgit\s+commit\b|\bsemantic-release\b|\brelease-please\b|\bchangeset(?:s)?\b|\bnpm\s+version\b|\bpnpm\s+version\b|\byarn\s+version\b|\bstandard-version\b/iu;
const prAutomationPattern =
  /\bgh\s+pr\s+(?:comment|edit|review|merge)\b|\bgh\s+issue\s+comment\b|\bgh\s+api\b[^\n]*\/pulls\/|\bgh\s+label\b/iu;

export function buildPermissionSummary(
  normalizedWorkflows: NormalizedWorkflow[],
  actionInventory: ActionInventoryItem[],
): PermissionSummary {
  const jobOverrides = normalizedWorkflows.flatMap((workflow) =>
    workflow.jobs.flatMap((job) => {
      return job.permissions
        ? [
            buildPermissionDeclarationSummary(
              workflow.filePath,
              job.permissions,
              "job",
              job.id,
            ),
          ]
        : [];
    }),
  );
  const missingPermissions = normalizedWorkflows
    .filter((workflow) => workflow.permissions === null)
    .map((workflow) => workflow.filePath);
  const scopes = normalizedWorkflows.flatMap((workflow) => [
    ...(workflow.permissions
      ? toPermissionScopes(workflow.filePath, workflow.permissions, "top-level")
      : []),
    ...workflow.jobs.flatMap((job) =>
      job.permissions
        ? toPermissionScopes(workflow.filePath, job.permissions, "job", job.id)
        : [],
    ),
  ]);
  const topLevel = normalizedWorkflows.flatMap((workflow) =>
    workflow.permissions
      ? [
          buildPermissionDeclarationSummary(
            workflow.filePath,
            workflow.permissions,
            "top-level",
          ),
        ]
      : [],
  );
  const writeScopes = normalizedWorkflows.flatMap((workflow) => [
    ...topLevelWriteScopes(workflow),
    ...workflow.jobs.flatMap((job) =>
      (job.permissions ? getBroadWriteScopes(job.permissions) : []).map(
        (scope) => ({
          access: "write",
          filePath: workflow.filePath,
          jobName: job.id,
          location:
            job.permissions?.scopeLocations[scope] ?? job.permissions?.location,
          scope,
          source: "job" as const,
        }),
      ),
    ),
  ]);
  const warnings = normalizedWorkflows.flatMap((workflow) =>
    workflow.permissions
      ? []
      : [`${workflow.filePath} does not declare top-level permissions.`],
  );
  const jobRecommendations = normalizedWorkflows.flatMap((workflow) =>
    workflow.jobs.map((job) =>
      buildJobPermissionRecommendation(
        workflow,
        job,
        actionInventory.filter((item) => item.filePath === workflow.filePath),
      ),
    ),
  );
  const workflowRecommendations = normalizedWorkflows.map((workflow) =>
    buildWorkflowPermissionRecommendation(
      workflow,
      jobRecommendations.filter(
        (recommendation) => recommendation.filePath === workflow.filePath,
      ),
    ),
  );

  return {
    hasTopLevelPermissions: normalizedWorkflows.some(
      (workflow) => workflow.permissions !== null,
    ),
    jobOverrides,
    jobRecommendations,
    missingPermissions,
    topLevel,
    workflowRecommendations,
    writeScopes,
    scopes,
    recommendedPermissions:
      normalizedWorkflows.length > 0 ? ["contents: read"] : [],
    warnings,
  };
}

function buildJobPermissionRecommendation(
  workflow: NormalizedWorkflow,
  job: WorkflowJob,
  workflowActionInventory: ActionInventoryItem[],
): JobPermissionRecommendation {
  const effectivePermissions = getJobEffectivePermissions(workflow, job);
  const currentPermissionsSource = job.permissions
    ? "job"
    : workflow.permissions
      ? "top-level"
      : "none";
  const currentWriteScopes = getWritePermissionScopes(effectivePermissions);
  const currentPermissionsYaml = effectivePermissions
    ? formatPermissionsBlock(effectivePermissions)
    : null;
  const { reasonsByScope, recommendedPermissions } =
    inferRecommendedJobPermissions(
      workflow,
      job,
      workflowActionInventory.filter((item) => item.jobId === job.id),
    );
  const trustLevel = getWorkflowTrustLevel(workflow);
  const thirdPartyActions = Array.from(
    new Set(
      workflowActionInventory
        .filter(
          (item) => item.jobId === job.id && item.origin === "third-party",
        )
        .map((item) => item.uses),
    ),
  ).sort();

  return {
    copyableYaml: formatJobPermissionsSnippet(job.id, recommendedPermissions),
    currentPermissionsSource,
    currentPermissionsYaml,
    currentWriteScopes,
    filePath: workflow.filePath,
    jobId: job.id,
    recommendedPermissions,
    recommendedWriteScopes: getRecommendedWriteScopes(recommendedPermissions),
    riskLabel: getJobRiskLabel({
      currentWriteScopes,
      hasIdTokenWrite:
        effectivePermissions?.kind === "shorthand"
          ? effectivePermissions.shorthand === "write-all"
          : effectivePermissions?.kind === "mapping" &&
            effectivePermissions.scopes["id-token"] === "write",
      thirdPartyActions,
      trustLevel,
    }),
    scopeRecommendations: buildScopeRecommendations({
      currentPermissions: effectivePermissions,
      reasonsByScope,
      recommendedPermissions,
      scopeKind: "job",
    }),
    thirdPartyActions,
    trustLevel,
    workflowName: workflow.summary.workflowName,
  };
}

function buildWorkflowPermissionRecommendation(
  workflow: NormalizedWorkflow,
  jobRecommendations: JobPermissionRecommendation[],
): WorkflowPermissionRecommendation {
  const recommendedPermissions: RecommendedPermissionMap = {
    contents: "read",
  };

  return {
    copyableYaml: formatWorkflowPermissionsSnippet(
      recommendedPermissions,
      jobRecommendations,
    ),
    currentPermissionsYaml: workflow.permissions
      ? formatPermissionsBlock(workflow.permissions)
      : null,
    currentWriteScopes: getWritePermissionScopes(workflow.permissions),
    filePath: workflow.filePath,
    recommendedPermissions,
    recommendedWriteScopes: [],
    scopeRecommendations: buildScopeRecommendations({
      currentPermissions: workflow.permissions,
      reasonsByScope: new Map(),
      recommendedPermissions,
      scopeKind: "workflow",
    }),
    trustLevel: getWorkflowTrustLevel(workflow),
    workflowName: workflow.summary.workflowName,
  };
}

function inferRecommendedJobPermissions(
  workflow: NormalizedWorkflow,
  job: WorkflowJob,
  jobActionInventory: ActionInventoryItem[],
) {
  const recommendedPermissions: RecommendedPermissionMap = {
    contents: "read",
  };
  const reasonsByScope = new Map<string, string[]>();
  const packageReason = findPackagePublishReason(job, jobActionInventory);
  const oidcReason = findOidcReason(jobActionInventory);
  const pullRequestWriteReason = findPullRequestWriteReason(
    workflow,
    job,
    jobActionInventory,
  );
  const securityEventsReason = findSecurityEventsReason(jobActionInventory);
  const contentsWriteReason = findContentsWriteReason(job, jobActionInventory);

  if (packageReason) {
    addScopeReason(
      reasonsByScope,
      "packages",
      packageReason,
      recommendedPermissions,
      "write",
    );
  }

  if (oidcReason) {
    addScopeReason(
      reasonsByScope,
      "id-token",
      oidcReason,
      recommendedPermissions,
      "write",
    );
  }

  if (pullRequestWriteReason) {
    addScopeReason(
      reasonsByScope,
      "pull-requests",
      pullRequestWriteReason,
      recommendedPermissions,
      "write",
    );
  }

  if (securityEventsReason) {
    addScopeReason(
      reasonsByScope,
      "security-events",
      securityEventsReason,
      recommendedPermissions,
      "write",
    );
  }

  if (contentsWriteReason) {
    addScopeReason(
      reasonsByScope,
      "contents",
      contentsWriteReason,
      recommendedPermissions,
      "write",
    );
  }

  return {
    reasonsByScope,
    recommendedPermissions,
  };
}

function findContentsWriteReason(
  job: WorkflowJob,
  jobActionInventory: ActionInventoryItem[],
) {
  const metadataHit = [
    job.id,
    job.name.value,
    getEnvironmentName(job.environment.raw),
  ]
    .filter((value): value is string => typeof value === "string")
    .find((value) =>
      /\brelease\b|\bchangelog\b|\btag\b|\bversion\b/iu.test(value),
    );

  if (metadataHit) {
    return `Job metadata includes \`${metadataHit}\`, which often signals release, tag, changelog, or version-bump work that may need repository writes.`;
  }

  const commandHit = job.steps.find((step) =>
    step.run?.text ? releaseWritePattern.test(step.run.text) : false,
  );

  if (commandHit?.run?.text) {
    return `Command \`${summarizeInlineText(commandHit.run.text)}\` looks like release, tag, or repository write automation.`;
  }

  const actionHit = jobActionInventory.find((item) =>
    isActionMatch(item, [
      "changesets/action",
      "googleapis/release-please-action",
      "ncipollo/release-action",
      "softprops/action-gh-release",
      "stefanzweifel/git-auto-commit-action",
    ]),
  );

  if (actionHit) {
    return `Action \`${actionHit.uses}\` is commonly used for release publishing or repository mutation workflows.`;
  }

  return null;
}

function findOidcReason(jobActionInventory: ActionInventoryItem[]) {
  const actionHit = jobActionInventory.find((item) =>
    isActionMatch(item, [
      "aws-actions/configure-aws-credentials",
      "azure/login",
      "google-github-actions/auth",
    ]),
  );

  return actionHit
    ? `Action \`${actionHit.uses}\` looks like OIDC or cloud-auth setup, so \`id-token: write\` may be needed.`
    : null;
}

function findPackagePublishReason(
  job: WorkflowJob,
  jobActionInventory: ActionInventoryItem[],
) {
  const commandHit = job.steps.find((step) =>
    step.run?.text ? packagePublishPattern.test(step.run.text) : false,
  );

  if (commandHit?.run?.text) {
    return `Command \`${summarizeInlineText(commandHit.run.text)}\` looks like package publishing. If this job targets GitHub Packages or GHCR, \`packages: write\` may be needed.`;
  }

  const metadataHit = [job.id, job.name.value]
    .filter((value): value is string => typeof value === "string")
    .find((value) =>
      /\bpublish\b|\bpackage\b|\bregistry\b|\bghcr\b|\bcontainer\b/iu.test(
        value,
      ),
    );

  if (metadataHit) {
    return `Job metadata includes \`${metadataHit}\`, which suggests package or registry publishing work.`;
  }

  const actionHit = jobActionInventory.find((item) =>
    isActionMatch(item, ["docker/build-push-action", "docker/login-action"]),
  );

  if (
    actionHit &&
    /\bpublish\b|\bpackage\b|\bcontainer\b|\bghcr\b/iu.test(job.id)
  ) {
    return `Action \`${actionHit.uses}\` appears in a publish-oriented job, so registry write access may be worth reviewing.`;
  }

  return null;
}

function findPullRequestWriteReason(
  workflow: NormalizedWorkflow,
  job: WorkflowJob,
  jobActionInventory: ActionInventoryItem[],
) {
  const commandHit = job.steps.find((step) =>
    step.run?.text ? prAutomationPattern.test(step.run.text) : false,
  );

  if (commandHit?.run?.text) {
    return `Command \`${summarizeInlineText(commandHit.run.text)}\` looks like pull request comment, label, or review automation.`;
  }

  const actionHit = jobActionInventory.find((item) =>
    isActionMatch(item, [
      "actions/labeler",
      "marocchino/sticky-pull-request-comment",
      "mshick/add-pr-comment",
      "peter-evans/create-or-update-comment",
      "peter-evans/enable-pull-request-automerge",
    ]),
  );

  if (actionHit) {
    return `Action \`${actionHit.uses}\` looks like pull request automation that may need \`pull-requests: write\`.`;
  }

  if (
    workflow.on.some(
      (trigger) =>
        trigger.name === "pull_request" ||
        trigger.name === "pull_request_target",
    ) &&
    /\bcomment\b|\blabel\b|\breview\b|\btriage\b/iu.test(
      [job.id, job.name.value].filter(Boolean).join(" "),
    )
  ) {
    return "This job looks like pull request comment or label automation on a PR-triggered workflow.";
  }

  return null;
}

function findSecurityEventsReason(jobActionInventory: ActionInventoryItem[]) {
  const actionHit = jobActionInventory.find((item) =>
    isActionMatch(item, [
      "actions/upload-sarif",
      "github/codeql-action/upload-sarif",
    ]),
  );

  return actionHit
    ? `Action \`${actionHit.uses}\` uploads SARIF or code scanning results, which may need \`security-events: write\`.`
    : null;
}

function buildScopeRecommendations({
  currentPermissions,
  reasonsByScope,
  recommendedPermissions,
  scopeKind,
}: {
  currentPermissions: WorkflowPermissions | null;
  reasonsByScope: Map<string, string[]>;
  recommendedPermissions: RecommendedPermissionMap;
  scopeKind: "job" | "workflow";
}): PermissionScopeRecommendation[] {
  const currentAccessByScope = getCurrentAccessByScope(currentPermissions);
  const scopes = new Set<string>(["contents"]);

  for (const scope of Object.keys(currentAccessByScope)) {
    if (currentAccessByScope[scope] === "write" || scope === "contents") {
      scopes.add(scope);
    }
  }

  for (const scope of Object.keys(recommendedPermissions)) {
    scopes.add(scope);
  }

  return [...scopes].sort(sortPermissionScopes).map((scope) => {
    const currentAccess = currentAccessByScope[scope] ?? null;
    const recommendedAccess =
      recommendedPermissions[scope] ?? (scope === "contents" ? "read" : "none");
    const reasons = reasonsByScope.get(scope) ?? [];

    return {
      currentAccess,
      rationale: formatScopeRationale({
        currentAccess,
        reasons,
        recommendedAccess,
        scope,
        scopeKind,
      }),
      recommendedAccess,
      scope,
      status: reasons.length > 0 ? "review-recommended" : "not-inferred",
    };
  });
}

function formatScopeRationale({
  currentAccess,
  reasons,
  recommendedAccess,
  scope,
  scopeKind,
}: {
  currentAccess: string | null;
  reasons: string[];
  recommendedAccess: PermissionScopeRecommendation["recommendedAccess"];
  scope: string;
  scopeKind: "job" | "workflow";
}) {
  if (reasons.length > 0) {
    return `${reasons.join(" ")} Review recommended because Authos is using static workflow heuristics, not runtime repository policy.`;
  }

  if (scope === "contents" && recommendedAccess === "read") {
    if (currentAccess === "write" || currentAccess === "write-all") {
      return "A read-only `contents` baseline keeps checkout and repository metadata access available while removing broad repository writes from the default token.";
    }

    return "A read-only `contents` baseline is the conservative default for most jobs and supports standard checkout/read access.";
  }

  if (currentAccess === "write" || currentAccess === "write-all") {
    return scopeKind === "workflow"
      ? `Authos did not find a strong static signal that every job needs \`${scope}: write\` at the workflow level. Move this write scope into only the jobs that truly need it after review.`
      : `Authos did not find a strong static signal that this job needs \`${scope}: write\`. Review before removing it because scripts, API calls, or reusable workflows can require scopes that are not obvious from static YAML alone.`;
  }

  if (currentAccess === "read" && recommendedAccess === "read") {
    return `Current \`${scope}: read\` access already matches the conservative baseline.`;
  }

  return `No strong static signal suggested that \`${scope}\` needs to be granted here.`;
}

function getCurrentAccessByScope(
  permissions: WorkflowPermissions | null,
): Record<string, string> {
  if (!permissions) {
    return {};
  }

  if (permissions.kind === "shorthand" && permissions.shorthand) {
    return permissions.shorthand === "write-all"
      ? { contents: "write-all" }
      : { contents: permissions.shorthand };
  }

  if (permissions.kind !== "mapping") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(permissions.scopes).map(([scope, access]) => [
      scope,
      String(access),
    ]),
  );
}

function getWorkflowTrustLevel(
  workflow: NormalizedWorkflow,
): PermissionRecommendationTrustLevel {
  const eventNames = workflow.on.map((trigger) => trigger.name);
  const hasWorkflowRun = eventNames.includes("workflow_run");
  const hasUntrusted = hasUntrustedPullRequestTrigger(workflow);
  const hasTrustedNonFollowUp = eventNames.some(
    (eventName) =>
      eventName !== "pull_request" &&
      eventName !== "pull_request_target" &&
      eventName !== "workflow_run",
  );

  if (hasWorkflowRun && !hasUntrusted && !hasTrustedNonFollowUp) {
    return "privileged-follow-up";
  }

  if (hasWorkflowRun || (hasUntrusted && hasTrustedNonFollowUp)) {
    return "mixed";
  }

  if (hasUntrusted) {
    return "untrusted";
  }

  return "trusted";
}

function getJobRiskLabel({
  currentWriteScopes,
  hasIdTokenWrite,
  thirdPartyActions,
  trustLevel,
}: {
  currentWriteScopes: string[];
  hasIdTokenWrite: boolean;
  thirdPartyActions: string[];
  trustLevel: PermissionRecommendationTrustLevel;
}): JobPermissionRecommendation["riskLabel"] {
  const hasSensitiveWriteScope = currentWriteScopes.some(
    (scope) => scope !== "id-token",
  );
  const hasPrivilege = hasSensitiveWriteScope || hasIdTokenWrite;

  if (
    (trustLevel === "untrusted" || trustLevel === "privileged-follow-up") &&
    (hasPrivilege || thirdPartyActions.length > 0)
  ) {
    return "high";
  }

  if (trustLevel === "mixed" && hasPrivilege) {
    return "high";
  }

  if (
    hasPrivilege ||
    thirdPartyActions.length > 0 ||
    trustLevel !== "trusted"
  ) {
    return "review";
  }

  return "low";
}

function formatPermissionsBlock(permissions: WorkflowPermissions) {
  if (permissions.kind === "shorthand" && permissions.shorthand) {
    return `permissions: ${permissions.shorthand}`;
  }

  if (permissions.kind === "mapping") {
    const entries: Array<[string, string]> = Object.entries(
      permissions.scopes,
    ).map(([scope, access]) => [scope, String(access)]);

    if (entries.length === 0) {
      return "permissions: {}";
    }

    return [
      "permissions:",
      ...entries
        .sort(([leftScope], [rightScope]) =>
          sortPermissionScopes(leftScope, rightScope),
        )
        .map(([scope, access]) => `  ${scope}: ${access}`),
    ].join("\n");
  }

  return permissions.kind === "empty"
    ? "permissions: {}"
    : "permissions: <unrecognized>";
}

function formatJobPermissionsSnippet(
  jobId: string,
  permissions: RecommendedPermissionMap,
) {
  return [
    "jobs:",
    `  ${jobId}:`,
    "    permissions:",
    ...formatRecommendedPermissionEntries(permissions, 6),
  ].join("\n");
}

function formatWorkflowPermissionsSnippet(
  workflowPermissions: RecommendedPermissionMap,
  jobRecommendations: JobPermissionRecommendation[],
) {
  const lines = [
    "permissions:",
    ...formatRecommendedPermissionEntries(workflowPermissions, 2),
  ];
  const jobOverrides = jobRecommendations.filter(
    (recommendation) =>
      !arePermissionMapsEqual(
        recommendation.recommendedPermissions,
        workflowPermissions,
      ),
  );

  if (jobOverrides.length === 0) {
    return lines.join("\n");
  }

  lines.push("", "jobs:");

  for (const recommendation of jobOverrides.sort((left, right) =>
    left.jobId.localeCompare(right.jobId),
  )) {
    lines.push(`  ${recommendation.jobId}:`);
    lines.push("    permissions:");
    lines.push(
      ...formatRecommendedPermissionEntries(
        recommendation.recommendedPermissions,
        6,
      ),
    );
  }

  return lines.join("\n");
}

function formatRecommendedPermissionEntries(
  permissions: RecommendedPermissionMap,
  indentSize: number,
) {
  const indent = " ".repeat(indentSize);

  return Object.entries(permissions)
    .sort(([leftScope], [rightScope]) =>
      sortPermissionScopes(leftScope, rightScope),
    )
    .map(([scope, access]) => `${indent}${scope}: ${access}`);
}

function addScopeReason(
  reasonsByScope: Map<string, string[]>,
  scope: string,
  reason: string,
  permissions: RecommendedPermissionMap,
  access: "read" | "write",
) {
  const currentReasons = reasonsByScope.get(scope) ?? [];

  if (!currentReasons.includes(reason)) {
    currentReasons.push(reason);
  }

  reasonsByScope.set(scope, currentReasons);
  permissions[scope] = access;
}

function getRecommendedWriteScopes(permissions: RecommendedPermissionMap) {
  return Object.entries(permissions)
    .flatMap(([scope, access]) => (access === "write" ? [scope] : []))
    .sort(sortPermissionScopes);
}

function isActionMatch(item: ActionInventoryItem, candidates: string[]) {
  const normalizedAction = [item.owner, item.repo, item.path]
    .filter((value): value is string => typeof value === "string")
    .join("/")
    .toLowerCase();

  return candidates.some((candidate) => normalizedAction === candidate);
}

function sortPermissionScopes(left: string, right: string) {
  const leftIndex = permissionScopeOrder.indexOf(
    left as (typeof permissionScopeOrder)[number],
  );
  const rightIndex = permissionScopeOrder.indexOf(
    right as (typeof permissionScopeOrder)[number],
  );

  return (
    (leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex) -
      (rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex) ||
    left.localeCompare(right)
  );
}

function summarizeInlineText(value: string) {
  return value.replace(/\s+/gu, " ").trim().slice(0, 72);
}

function arePermissionMapsEqual(
  left: RecommendedPermissionMap,
  right: RecommendedPermissionMap,
) {
  const leftEntries = Object.entries(left).sort(([a], [b]) =>
    sortPermissionScopes(a, b),
  );
  const rightEntries = Object.entries(right).sort(([a], [b]) =>
    sortPermissionScopes(a, b),
  );

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([scope, access], index) => {
    const otherEntry = rightEntries[index];

    return otherEntry?.[0] === scope && otherEntry[1] === access;
  });
}

function topLevelWriteScopes(workflow: NormalizedWorkflow) {
  if (!workflow.permissions) {
    return [];
  }

  return getBroadWriteScopes(workflow.permissions).map((scope) => ({
    access: "write",
    filePath: workflow.filePath,
    location:
      workflow.permissions?.scopeLocations[scope] ??
      workflow.permissions?.location,
    scope,
    source: "top-level" as const,
  }));
}
