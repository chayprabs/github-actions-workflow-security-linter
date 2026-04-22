import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  buildEvidence,
  findPathLocation,
  getStepLabel,
  hasOwnField,
  isExpressionString,
  isPlainObject,
  requireRuleDefinition,
  visitJobs,
  visitSteps,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import type {
  ParsedYamlFile,
  RuleModule,
  WorkflowPermissions,
} from "@/features/actions-analyzer/types";

const missingRunsOnOrUsesRuleDefinition = requireRuleDefinition("GHA007");
const unknownNeedsRuleDefinition = requireRuleDefinition("GHA011");
const invalidPermissionsRuleDefinition = requireRuleDefinition("GHA013");
const invalidRunsOnRuleDefinition = requireRuleDefinition("GHA014");
const invalidTimeoutRuleDefinition = requireRuleDefinition("GHA015");
const reusableWorkflowMixedFieldsRuleDefinition =
  requireRuleDefinition("GHA016");

const knownPermissionScopes = new Set([
  "actions",
  "artifact-metadata",
  "attestations",
  "checks",
  "contents",
  "deployments",
  "discussions",
  "id-token",
  "issues",
  "models",
  "packages",
  "pages",
  "pull-requests",
  "repository-projects",
  "security-events",
  "statuses",
]);

const reusableWorkflowDisallowedKeys = [
  "container",
  "defaults",
  "env",
  "environment",
  "runs-on",
  "services",
  "steps",
  "timeout-minutes",
] as const;

export const missingRunsOnOrUsesRule: RuleModule = {
  definition: missingRunsOnOrUsesRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (hasOwnField(job.raw, "runs-on") || hasOwnField(job.raw, "uses")) {
        return [];
      }

      return [
        createRuleFinding(
          missingRunsOnOrUsesRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, job.location),
            filePath: workflow.filePath,
            location: job.location,
            message: `Job \`${job.id}\` defines neither \`runs-on\` nor job-level \`uses\`. A normal job needs a runner, while a reusable workflow caller job needs \`uses\`.`,
            relatedJobs: [job.id],
            remediation:
              "Add `runs-on` for a normal job, or replace the job body with a supported reusable workflow caller job using `uses`, `with`, and `secrets`.",
          },
          index,
        ),
      ];
    });
  },
};

export const unknownNeedsRule: RuleModule = {
  definition: unknownNeedsRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow) => {
      const knownJobIds = new Set(workflow.jobs.map((job) => job.id));
      const parsedFile = context.getParsedFile(workflow.filePath);

      return workflow.jobs.flatMap((job) =>
        (job.needs.value ?? []).flatMap((neededJobId, index) => {
          if (knownJobIds.has(neededJobId)) {
            return [];
          }

          const location =
            job.needs.location ??
            findPathLocation(parsedFile, ["jobs", job.id, "needs"], job.location);

          return [
            createRuleFinding(
              unknownNeedsRuleDefinition,
              {
                evidence: buildEvidence(parsedFile, location),
                filePath: workflow.filePath,
                location,
                message: `Job \`${job.id}\` lists \`${neededJobId}\` in \`needs\`, but no job with that id exists in this workflow.`,
                relatedJobs: [job.id, neededJobId],
                remediation:
                  "Update `needs` so it only references defined job ids in the same workflow file.",
              },
              index,
            ),
          ];
        }),
      );
    });
  },
};

export const invalidPermissionsRule: RuleModule = {
  definition: invalidPermissionsRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow) => {
      const parsedFile = context.getParsedFile(workflow.filePath);

      return [
        ...checkPermissions({
          filePath: workflow.filePath,
          parsedFile,
          permissions: workflow.permissions,
          subject: "workflow-level `permissions`",
        }),
        ...workflow.jobs.flatMap((job) =>
          checkPermissions({
            filePath: workflow.filePath,
            parsedFile,
            permissions: job.permissions,
            relatedJobs: [job.id],
            subject: `job \`${job.id}\` permissions`,
          }),
        ),
      ];
    });
  },
};

export const invalidRunsOnRule: RuleModule = {
  definition: invalidRunsOnRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (!hasOwnField(job.raw, "runs-on") || isValidRunsOnValue(job.runsOn.raw)) {
        return [];
      }

      const location =
        job.runsOn.location ??
        findPathLocation(parsedFile, ["jobs", job.id, "runs-on"], job.location);

      return [
        createRuleFinding(
          invalidRunsOnRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            location,
            message: buildRunsOnMessage(job.runsOn.raw),
            relatedJobs: [job.id],
            remediation:
              "Use a non-empty runner label string, a non-empty array of runner labels, or a valid `runs-on` mapping with `group` and/or `labels`.",
          },
          index,
        ),
      ];
    });
  },
};

export const invalidTimeoutRule: RuleModule = {
  definition: invalidTimeoutRuleDefinition,
  check(context) {
    return [
      ...visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
        if (
          !hasOwnField(job.raw, "timeout-minutes") ||
          isValidTimeoutValue(job.timeoutMinutes.raw)
        ) {
          return [];
        }

        const location =
          job.timeoutMinutes.location ??
          findPathLocation(
            parsedFile,
            ["jobs", job.id, "timeout-minutes"],
            job.location,
          );

        return [
          createRuleFinding(
            invalidTimeoutRuleDefinition,
            {
              evidence: buildEvidence(parsedFile, location),
              filePath: workflow.filePath,
              location,
              message: `Job \`${job.id}\` uses an invalid \`timeout-minutes\` value. When statically known, it should be a positive number.`,
              relatedJobs: [job.id],
              remediation:
                "Set `timeout-minutes` to a positive number, or use an expression only when the value is intentionally dynamic.",
            },
            index,
          ),
        ];
      }),
      ...visitSteps(context).flatMap(
        ({ job, parsedFile, step, workflow }, index) => {
          if (
            !hasOwnField(step.raw, "timeout-minutes") ||
            isValidTimeoutValue(step.timeoutMinutes.raw)
          ) {
            return [];
          }

          const location =
            step.timeoutMinutes.location ??
            findPathLocation(
              parsedFile,
              ["jobs", job.id, "steps", step.index, "timeout-minutes"],
              step.location,
            );

          return [
            createRuleFinding(
              invalidTimeoutRuleDefinition,
              {
                evidence: buildEvidence(parsedFile, location),
                filePath: workflow.filePath,
                location,
                message: `Step \`${getStepLabel(step)}\` in job \`${job.id}\` uses an invalid \`timeout-minutes\` value. When statically known, it should be a positive number.`,
                relatedJobs: [job.id],
                relatedSteps: [getStepLabel(step)],
                remediation:
                  "Set `timeout-minutes` to a positive number, or use an expression only when the value is intentionally dynamic.",
              },
              index,
            ),
          ];
        },
      ),
    ];
  },
};

export const reusableWorkflowMixedFieldsRule: RuleModule = {
  definition: reusableWorkflowMixedFieldsRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (
        job.reusableWorkflowCall === null ||
        job.reusableWorkflowCall.kind === "unknown"
      ) {
        return [];
      }

      const incompatibleKeys = reusableWorkflowDisallowedKeys.filter((key) =>
        hasOwnField(job.raw, key),
      );

      if (incompatibleKeys.length === 0) {
        return [];
      }

      const location =
        job.reusableWorkflowCall.location ??
        findPathLocation(parsedFile, ["jobs", job.id, "uses"], job.location);

      return [
        createRuleFinding(
          reusableWorkflowMixedFieldsRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            location,
            message: `Job \`${job.id}\` calls a reusable workflow with \`uses\`, but it also defines incompatible job fields: ${incompatibleKeys.join(", ")}.`,
            relatedJobs: [job.id],
            remediation:
              "Keep only the supported caller-job keywords such as `name`, `uses`, `with`, `secrets`, `strategy`, `needs`, `if`, `concurrency`, and `permissions`.",
          },
          index,
        ),
      ];
    });
  },
};

function buildRunsOnMessage(rawRunsOn: unknown) {
  if (typeof rawRunsOn === "string" && rawRunsOn.trim().length === 0) {
    return "This job sets `runs-on` to an empty string. Runner labels should be non-empty.";
  }

  if (Array.isArray(rawRunsOn) && rawRunsOn.length === 0) {
    return "This job sets `runs-on` to an empty array. Provide at least one runner label.";
  }

  return "This job uses an invalid `runs-on` value. GitHub Actions expects a runner label string, a non-empty label array, or a valid runner group or labels mapping.";
}

function checkPermissions({
  filePath,
  parsedFile,
  permissions,
  relatedJobs = [],
  subject,
}: {
  filePath: string;
  parsedFile?: ParsedYamlFile | undefined;
  permissions: WorkflowPermissions | null;
  relatedJobs?: string[] | undefined;
  subject: string;
}) {
  if (!permissions) {
    return [];
  }

  if (permissions.kind === "empty" || permissions.kind === "unknown") {
    return [
      createRuleFinding(invalidPermissionsRuleDefinition, {
        evidence: buildEvidence(parsedFile, permissions.location),
        filePath,
        location: permissions.location,
        message: `${subject} must be a permissions mapping, \`read-all\`, \`write-all\`, or \`{}\`.`,
        relatedJobs,
        remediation:
          "Replace the invalid value with `read-all`, `write-all`, or a mapping of known scopes to `read`, `write`, or `none`.",
      }),
    ];
  }

  if (permissions.kind === "shorthand") {
    if (permissions.shorthand === "read-all" || permissions.shorthand === "write-all") {
      return [];
    }

    return [
      createRuleFinding(invalidPermissionsRuleDefinition, {
        evidence: buildEvidence(parsedFile, permissions.location),
        filePath,
        location: permissions.location,
        message: `${subject} uses unsupported shorthand \`${permissions.shorthand}\`.`,
        relatedJobs,
        remediation:
          "Use `read-all`, `write-all`, or a mapping of known scopes to `read`, `write`, or `none`.",
      }),
    ];
  }

  return Object.entries(permissions.scopes).flatMap(([scope, access], index) => {
    const location = permissions.scopeLocations[scope] ?? permissions.location;

    if (!knownPermissionScopes.has(scope)) {
      return [
        createRuleFinding(
          invalidPermissionsRuleDefinition,
          {
            confidence: "medium",
            evidence: buildEvidence(parsedFile, location),
            filePath,
            location,
            message: `${subject} uses unknown permission scope \`${scope}\`.`,
            relatedJobs,
            remediation:
              "Check the scope name against the GitHub Actions permissions list, then fix the typo or remove the unsupported scope.",
            severity: "medium",
          },
          index,
        ),
      ];
    }

    if (!isValidPermissionAccess(scope, access)) {
      return [
        createRuleFinding(
          invalidPermissionsRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath,
            location,
            message: `${subject} sets \`${scope}\` to \`${String(access)}\`, which is not an allowed access level.`,
            relatedJobs,
            remediation: `Use one of ${getAllowedAccessValues(scope)
              .map((value) => `\`${value}\``)
              .join(", ")} for \`${scope}\`.`,
          },
          index,
        ),
      ];
    }

    return [];
  });
}

function getAllowedAccessValues(scope: string) {
  if (scope === "id-token") {
    return ["write", "none"];
  }

  if (scope === "models") {
    return ["read", "none"];
  }

  return ["read", "write", "none"];
}

function isValidPermissionAccess(scope: string, access: unknown) {
  return typeof access === "string" && getAllowedAccessValues(scope).includes(access);
}

function isValidRunsOnValue(rawRunsOn: unknown): boolean {
  if (typeof rawRunsOn === "string") {
    return rawRunsOn.trim().length > 0;
  }

  if (Array.isArray(rawRunsOn)) {
    return (
      rawRunsOn.length > 0 &&
      rawRunsOn.every((value) => {
        return typeof value === "string" && value.trim().length > 0;
      })
    );
  }

  if (!isPlainObject(rawRunsOn)) {
    return false;
  }

  const keys = Object.keys(rawRunsOn);

  if (keys.length === 0 || keys.some((key) => key !== "group" && key !== "labels")) {
    return false;
  }

  const group = rawRunsOn.group;
  const labels = rawRunsOn.labels;
  const hasValidGroup =
    group === undefined || (typeof group === "string" && group.trim().length > 0);
  const hasValidLabels =
    labels === undefined ||
    (typeof labels === "string" && labels.trim().length > 0) ||
    (Array.isArray(labels) &&
      labels.length > 0 &&
      labels.every((value) => typeof value === "string" && value.trim().length > 0));

  return hasValidGroup && hasValidLabels && (group !== undefined || labels !== undefined);
}

function isValidTimeoutValue(rawTimeout: unknown) {
  if (typeof rawTimeout === "number") {
    return Number.isFinite(rawTimeout) && rawTimeout > 0;
  }

  if (typeof rawTimeout === "string") {
    return isExpressionString(rawTimeout);
  }

  return false;
}
