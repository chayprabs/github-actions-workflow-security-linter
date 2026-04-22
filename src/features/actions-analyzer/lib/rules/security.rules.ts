import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  buildEvidence,
  findPathLocation,
  getStepLabel,
  getWorkflowAnchorLocation,
  requireRuleDefinition,
  visitJobs,
  visitSteps,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import {
  getBroadWriteScopes,
  getJobEffectivePermissions,
  hasUntrustedPullRequestTrigger,
  isDeploymentLikeJob,
  isLikelyPullRequestHeadCheckoutRef,
  isSelfHostedRunsOn,
  isThirdPartyActionUse,
  longLivedCloudSecretNames,
  shouldRelaxBroadWriteSeverity,
} from "@/features/actions-analyzer/lib/security-utils";
import type {
  AnalyzerFinding,
  RuleModule,
  WorkflowExpression,
  WorkflowJob,
  WorkflowStep,
} from "@/features/actions-analyzer/types";

const missingTopLevelPermissionsRuleDefinition = requireRuleDefinition("GHA100");
const topLevelWriteAllRuleDefinition = requireRuleDefinition("GHA101");
const broadWritePermissionsRuleDefinition = requireRuleDefinition("GHA102");
const pullRequestTargetRuleDefinition = requireRuleDefinition("GHA103");
const pullRequestTargetCheckoutRuleDefinition = requireRuleDefinition("GHA104");
const selfHostedPullRequestRuleDefinition = requireRuleDefinition("GHA105");
const workflowRunPrivilegeRuleDefinition = requireRuleDefinition("GHA106");
const secretsInWorkflowOrJobEnvRuleDefinition = requireRuleDefinition("GHA107");
const longLivedCloudSecretRuleDefinition = requireRuleDefinition("GHA108");
const untrustedDeploymentRuleDefinition = requireRuleDefinition("GHA109");
const privilegedThirdPartyActionRuleDefinition = requireRuleDefinition("GHA110");

export const missingTopLevelPermissionsRule: RuleModule = {
  definition: missingTopLevelPermissionsRuleDefinition,
  check(context) {
    if (!context.settings.warnOnMissingTopLevelPermissions) {
      return [];
    }

    return context.normalizedWorkflows.flatMap((workflow, index) => {
      if (workflow.permissions !== null) {
        return [];
      }

      const parsedFile = context.getParsedFile(workflow.filePath);
      const location = getWorkflowAnchorLocation(workflow, parsedFile);
      const canSuggestReadOnlyBaseline =
        !workflow.jobs.some((job) => isDeploymentLikeJob(job));

      return [
        createRuleFinding(
          missingTopLevelPermissionsRuleDefinition,
          {
            confidence: "high",
            evidence:
              buildEvidence(parsedFile, location) ?? "permissions: <missing>",
            filePath: workflow.filePath,
            fix: canSuggestReadOnlyBaseline
              ? {
                  description:
                    "Add `permissions: contents: read` near the top of the workflow and widen only the jobs that truly need more access.",
                  filePath: workflow.filePath,
                  kind: "manual",
                  label: "Add explicit read-only baseline",
                  safety: "safe",
                }
              : undefined,
            location,
            message:
              "This workflow does not declare top-level `permissions`, so the `GITHUB_TOKEN` baseline is not explicit in the workflow file.",
            remediation: canSuggestReadOnlyBaseline
              ? "Declare workflow-level permissions explicitly. Safe baseline suggestion: add `permissions: contents: read` near the top of the file, then widen only the jobs that need more access."
              : "Declare workflow-level permissions explicitly so reviewers can verify least privilege. If some jobs require broader access, keep the workflow baseline narrow and override only those jobs.",
            severity: getMissingPermissionsSeverity(context.settings.profile),
          },
          index,
        ),
      ];
    });
  },
};

export const topLevelWriteAllRule: RuleModule = {
  definition: topLevelWriteAllRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow, index) => {
      if (
        workflow.permissions?.kind !== "shorthand" ||
        workflow.permissions.shorthand !== "write-all"
      ) {
        return [];
      }

      const parsedFile = context.getParsedFile(workflow.filePath);

      return [
        createRuleFinding(
          topLevelWriteAllRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, workflow.permissions.location),
            filePath: workflow.filePath,
            location: workflow.permissions.location,
            message:
              "This workflow sets top-level `permissions: write-all`, giving every job the broadest available `GITHUB_TOKEN` write access unless narrowed later.",
            remediation:
              "Replace `write-all` with explicit least-privilege scopes. Start from a read-only baseline such as `contents: read`, then grant additional write scopes only where they are required.",
          },
          index,
        ),
      ];
    });
  },
};

export const broadWritePermissionsRule: RuleModule = {
  definition: broadWritePermissionsRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow) => {
      const parsedFile = context.getParsedFile(workflow.filePath);
      const findings: AnalyzerFinding[] = [];
      const topLevelScopes = getBroadWriteScopes(workflow.permissions);

      if (
        topLevelScopes.length > 0 &&
        !(workflow.permissions?.kind === "shorthand" &&
          workflow.permissions.shorthand === "write-all")
      ) {
        findings.push(
          createRuleFinding(broadWritePermissionsRuleDefinition, {
            evidence: buildEvidence(parsedFile, workflow.permissions?.location),
            filePath: workflow.filePath,
            location: workflow.permissions?.location,
            message: `This workflow grants broad top-level write access for ${formatScopeList(topLevelScopes)}. Verify this is required for every job that inherits the workflow token.`,
            remediation:
              "Reduce workflow-level permissions to the minimum required scopes, and move broader write access to only the specific jobs that need it.",
            severity: shouldRelaxBroadWriteSeverity(workflow)
              ? "medium"
              : "high",
          }),
        );
      }

      for (const job of workflow.jobs) {
        const broadScopes = getBroadWriteScopes(job.permissions);

        if (broadScopes.length === 0) {
          continue;
        }

        findings.push(
          createRuleFinding(broadWritePermissionsRuleDefinition, {
            evidence: buildEvidence(
              parsedFile,
              job.permissions?.location ?? job.location,
            ),
            filePath: workflow.filePath,
            location: job.permissions?.location ?? job.location,
            message: `Job \`${job.id}\` grants broad write access for ${formatScopeList(broadScopes)}. Verify this is required before keeping these permissions on the job token.`,
            relatedJobs: [job.id],
            remediation:
              "Keep only the write scopes this job actually needs. If only one step requires the privileged token, consider moving that step into a smaller dedicated job.",
            severity: shouldRelaxBroadWriteSeverity(workflow, job)
              ? "medium"
              : "high",
          }),
        );
      }

      return findings;
    });
  },
};

export const pullRequestTargetRule: RuleModule = {
  definition: pullRequestTargetRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow, index) => {
      return workflow.on.flatMap((trigger) => {
        if (trigger.name !== "pull_request_target") {
          return [];
        }

        return [
          createRuleFinding(
            pullRequestTargetRuleDefinition,
            {
              evidence: buildEvidence(
                context.getParsedFile(workflow.filePath),
                trigger.location,
              ),
              filePath: workflow.filePath,
              location: trigger.location,
              message:
                "This workflow uses `pull_request_target`, which runs in the base repository context and needs extra care with untrusted pull request data or code.",
              remediation:
                "Use `pull_request` when you need to build or test pull request code. Keep `pull_request_target` workflows limited to trusted metadata operations such as labeling or commenting.",
            },
            index,
          ),
        ];
      });
    });
  },
};

export const pullRequestTargetCheckoutRule: RuleModule = {
  definition: pullRequestTargetCheckoutRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(({ job, parsedFile, step, workflow }, index) => {
      if (
        !workflow.on.some((trigger) => trigger.name === "pull_request_target") ||
        !isCheckoutStep(step)
      ) {
        return [];
      }

      const refValue = step.with.value?.ref;
      const repositoryValue = step.with.value?.repository;
      const headRefCheckout = isLikelyPullRequestHeadCheckoutRef(refValue);
      const headRepositoryCheckout =
        typeof repositoryValue === "string" &&
        repositoryValue.includes("github.event.pull_request.head.repo.");

      if (!headRefCheckout && !headRepositoryCheckout) {
        return [];
      }

      const location =
        findPathLocation(parsedFile, ["jobs", job.id, "steps", step.index, "with", "ref"]) ??
        findPathLocation(parsedFile, ["jobs", job.id, "steps", step.index, "with", "repository"]) ??
        step.uses?.location ??
        step.location;

      return [
        createRuleFinding(
          pullRequestTargetCheckoutRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            location,
            message: `Step \`${getStepLabel(step)}\` checks out pull request head content inside a \`pull_request_target\` workflow, which can combine untrusted code with elevated token or secret access.`,
            relatedJobs: [job.id],
            relatedSteps: [getStepLabel(step)],
            remediation:
              "Do not check out or execute pull request head code in a `pull_request_target` workflow. Split privileged follow-up work from untrusted pull request builds, or switch the build workflow to `pull_request`.",
            severity: headRefCheckout ? "critical" : "high",
          },
          index,
        ),
      ];
    });
  },
};

export const selfHostedPullRequestRule: RuleModule = {
  definition: selfHostedPullRequestRuleDefinition,
  check(context) {
    if (context.settings.allowSelfHostedOnPullRequest) {
      return [];
    }

    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (
        !hasUntrustedPullRequestTrigger(workflow) ||
        !isSelfHostedRunsOn(job.runsOn.raw)
      ) {
        return [];
      }

      return [
        createRuleFinding(
          selfHostedPullRequestRuleDefinition,
          {
            evidence: buildEvidence(
              parsedFile,
              job.runsOn.location ?? job.location,
            ),
            filePath: workflow.filePath,
            location: job.runsOn.location ?? job.location,
            message: `Job \`${job.id}\` uses a self-hosted runner while the workflow listens to pull request events that may execute contributor-controlled code.`,
            relatedJobs: [job.id],
            remediation:
              "Prefer GitHub-hosted runners for untrusted pull request workflows. If self-hosted runners are required, isolate them tightly and require review or approval before privileged jobs run.",
          },
          index,
        ),
      ];
    });
  },
};

export const workflowRunPrivilegeRule: RuleModule = {
  definition: workflowRunPrivilegeRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow, index) => {
      if (!workflow.on.some((trigger) => trigger.name === "workflow_run")) {
        return [];
      }

      const parsedFile = context.getParsedFile(workflow.filePath);
      const artifactDownload = findArtifactDownloadStep(workflow.jobs);
      const hasBroadPermissions =
        getBroadWriteScopes(workflow.permissions).length > 0 ||
        workflow.jobs.some((job) => getBroadWriteScopes(job.permissions).length > 0);

      if (!artifactDownload && !hasBroadPermissions) {
        return [];
      }

      const location =
        artifactDownload?.location ??
        workflow.on.find((trigger) => trigger.name === "workflow_run")?.location ??
        getWorkflowAnchorLocation(workflow, parsedFile);
      const riskConditions = [
        artifactDownload
          ? "downloads artifacts from an earlier workflow"
          : null,
        hasBroadPermissions ? "has broad token permissions" : null,
      ]
        .filter(Boolean)
        .join(" and ");

      return [
        createRuleFinding(
          workflowRunPrivilegeRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            location,
            message: `This \`workflow_run\` workflow ${riskConditions}. Chained workflows can cross trust boundaries, so verify artifacts and privileges carefully before acting on upstream output.`,
            remediation:
              "Keep `workflow_run` follow-up jobs narrowly scoped, verify artifact provenance before use, and avoid granting broader token access than the follow-up action needs.",
            severity:
              artifactDownload && hasBroadPermissions ? "high" : "medium",
          },
          index,
        ),
      ];
    });
  },
};

export const secretsInWorkflowOrJobEnvRule: RuleModule = {
  definition: secretsInWorkflowOrJobEnvRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression, index) => {
      if (!isWorkflowOrJobEnvExpression(expression)) {
        return [];
      }

      const secretReferences = expression.references.filter((reference) =>
        reference.startsWith("secrets."),
      );

      if (secretReferences.length === 0) {
        return [];
      }

      return [
        createRuleFinding(
          secretsInWorkflowOrJobEnvRuleDefinition,
          {
            evidence: expression.rawExpression,
            filePath: expression.filePath,
            location: expression.location,
            message: `${getEnvScopeLabel(expression)} assigns ${formatReferenceList(secretReferences)}, which exposes the secret to more steps than a step-local environment variable.`,
            relatedJobs: expression.jobId ? [expression.jobId] : [],
            remediation:
              "Prefer step-level `env` for secrets unless every step in the workflow or job truly needs the same value. Narrower scope reduces accidental exposure.",
          },
          index,
        ),
      ];
    });
  },
};

export const longLivedCloudSecretRule: RuleModule = {
  definition: longLivedCloudSecretRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression, index) => {
      const matchingSecretNames = expression.references
        .flatMap((reference) => {
          const match = /^secrets\.([A-Za-z0-9_]+)/u.exec(reference);

          return match?.[1] ? [match[1]] : [];
        })
        .filter((secretName, secretIndex, allNames) => {
          return (
            longLivedCloudSecretNames.has(secretName) &&
            allNames.indexOf(secretName) === secretIndex
          );
        });

      if (matchingSecretNames.length === 0) {
        return [];
      }

      return [
        createRuleFinding(
          longLivedCloudSecretRuleDefinition,
          {
            confidence: "medium",
            evidence: expression.rawExpression,
            filePath: expression.filePath,
            location: expression.location,
            message: `This workflow references long-lived cloud credential secret${matchingSecretNames.length === 1 ? "" : "s"} ${matchingSecretNames
              .map((secretName) => `\`${secretName}\``)
              .join(", ")}. This heuristic is worth reviewing because short-lived OIDC credentials are often safer.`,
            relatedJobs: expression.jobId ? [expression.jobId] : [],
            relatedSteps: expression.stepLabel ? [expression.stepLabel] : [],
            remediation:
              "Prefer GitHub Actions OpenID Connect or another federated identity flow when the cloud provider supports it, instead of storing long-lived cloud keys as GitHub secrets.",
          },
          index,
        ),
      ];
    });
  },
};

export const untrustedDeploymentRule: RuleModule = {
  definition: untrustedDeploymentRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (
        !hasUntrustedPullRequestTrigger(workflow) ||
        !isDeploymentLikeJob(job)
      ) {
        return [];
      }

      return [
        createRuleFinding(
          untrustedDeploymentRuleDefinition,
          {
            confidence: workflow.on.some(
              (trigger) => trigger.name === "pull_request_target",
            )
              ? "high"
              : "medium",
            evidence: buildEvidence(parsedFile, job.location),
            filePath: workflow.filePath,
            location: job.location ?? job.environment.location,
            message: `Job \`${job.id}\` looks like a deploy, release, or publish job, but the workflow runs on pull request events that may involve untrusted contributions.`,
            relatedJobs: [job.id],
            remediation:
              "Keep deployment and release jobs on trusted triggers such as push to protected branches, tags, environment approvals, or manually approved follow-up workflows.",
          },
          index,
        ),
      ];
    });
  },
};

export const privilegedThirdPartyActionRule: RuleModule = {
  definition: privilegedThirdPartyActionRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      const effectivePermissions = getJobEffectivePermissions(workflow, job);
      const broadScopes = getBroadWriteScopes(effectivePermissions);

      if (broadScopes.length === 0) {
        return [];
      }

      const thirdPartySteps = job.steps.filter((step) =>
        isThirdPartyActionUse(step.uses),
      );

      if (thirdPartySteps.length === 0) {
        return [];
      }

      const location =
        thirdPartySteps[0]?.uses?.location ??
        thirdPartySteps[0]?.location ??
        job.permissions?.location ??
        workflow.permissions?.location ??
        job.location;
      const actionLabels = thirdPartySteps
        .map((step) => step.uses?.raw)
        .filter((value): value is string => typeof value === "string");

      return [
        createRuleFinding(
          privilegedThirdPartyActionRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            location,
            message: `Job \`${job.id}\` exposes broad token access (${formatScopeList(broadScopes)}) to third-party action${actionLabels.length === 1 ? "" : "s"} ${actionLabels
              .map((label) => `\`${label}\``)
              .join(", ")}. Actions in the job can use the same token permissions.`,
            relatedJobs: [job.id],
            relatedSteps: thirdPartySteps.map((step) => getStepLabel(step)),
            remediation:
              "Verify the external actions are trusted and pinned appropriately, and reduce the job token to only the permissions required. If possible, split privileged operations into a smaller follow-up job.",
            severity: shouldRelaxBroadWriteSeverity(workflow, job)
              ? "medium"
              : "high",
          },
          index,
        ),
      ];
    });
  },
};

function findArtifactDownloadStep(jobs: WorkflowJob[]): WorkflowStep | null {
  for (const job of jobs) {
    for (const step of job.steps) {
      if (
        step.uses?.kind === "repository-action" &&
        step.uses.owner?.toLowerCase() === "actions" &&
        step.uses.repo?.toLowerCase() === "download-artifact"
      ) {
        return step;
      }

      if (
        step.run?.text &&
        /\bgh\s+run\s+download\b/u.test(step.run.text)
      ) {
        return step;
      }
    }
  }

  return null;
}

function formatReferenceList(references: string[]) {
  const uniqueReferences = references.filter((reference, index, allReferences) => {
    return allReferences.indexOf(reference) === index;
  });

  return uniqueReferences.map((reference) => `\`${reference}\``).join(", ");
}

function formatScopeList(scopes: string[]) {
  return scopes.map((scope) => `\`${scope}\``).join(", ");
}

function getEnvScopeLabel(expression: WorkflowExpression) {
  return expression.jobId ? `job \`${expression.jobId}\` env` : "workflow env";
}

function getMissingPermissionsSeverity(
  profile:
    | "balanced"
    | "deploy-release"
    | "open-source"
    | "private-app"
    | "strict-security",
) {
  if (profile === "strict-security") {
    return "high";
  }

  if (profile === "balanced") {
    return "low";
  }

  return "medium";
}

function isCheckoutStep(step: WorkflowStep) {
  return (
    step.uses?.kind === "repository-action" &&
    step.uses.owner?.toLowerCase() === "actions" &&
    step.uses.repo?.toLowerCase() === "checkout"
  );
}

function isWorkflowOrJobEnvExpression(expression: WorkflowExpression) {
  if (expression.fieldType !== "env") {
    return false;
  }

  if (expression.fieldPath[0] === "env") {
    return true;
  }

  return (
    expression.fieldPath[0] === "jobs" &&
    typeof expression.fieldPath[1] === "string" &&
    expression.fieldPath[2] === "env"
  );
}
