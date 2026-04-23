import { getStepLabel } from "@/features/actions-analyzer/lib/rules/rule-helpers";
import {
  getJobEffectivePermissions,
  getWritePermissionScopes,
  hasIdTokenWritePermission,
  isDeploymentLikeJob,
} from "@/features/actions-analyzer/lib/security-utils";
import type {
  ActionInventoryItem,
  AnalyzerFinding,
  AttackPath,
  NormalizedWorkflow,
  WorkflowStep,
} from "@/features/actions-analyzer/types";

const unpinnedThirdPartyRuleIds = new Set([
  "GHA200",
  "GHA202",
  "GHA203",
  "GHA205",
  "GHA207",
  "GHA208",
]);

export function buildAttackPaths({
  actionInventory,
  findings,
  normalizedWorkflows,
}: {
  actionInventory: ActionInventoryItem[];
  findings: AnalyzerFinding[];
  normalizedWorkflows: NormalizedWorkflow[];
}): AttackPath[] {
  const attackPaths = new Map<string, AttackPath>();

  for (const workflow of normalizedWorkflows) {
    const workflowFindings = findings.filter(
      (finding) =>
        normalizeFilePath(finding.filePath) ===
        normalizeFilePath(workflow.filePath),
    );

    for (const finding of workflowFindings.filter(
      (candidate) => candidate.ruleId === "GHA104",
    )) {
      const relatedJobs = getFindingJobs(workflow, finding);

      for (const job of relatedJobs) {
        const effectivePermissions = getJobEffectivePermissions(workflow, job);
        const writeScopes = getWritePermissionScopes(
          effectivePermissions,
        ).filter((scope) => scope !== "id-token");

        if (writeScopes.length === 0) {
          continue;
        }

        const matchingFindings = workflowFindings.filter((candidate) => {
          return (
            (candidate.ruleId === "GHA103" ||
              candidate.ruleId === "GHA104" ||
              candidate.ruleId === "GHA102" ||
              candidate.ruleId === "GHA206") &&
            findingTouchesJob(candidate, job.id)
          );
        });
        const stepLabels = finding.relatedSteps.length
          ? finding.relatedSteps
          : job.steps.filter(isCheckoutStep).map((step) => getStepLabel(step));
        const writeLabel = writeScopes.join(", ");

        registerAttackPath(attackPaths, {
          description: `This \`pull_request_target\` job checks out pull request head content and still carries repository write access (${writeLabel}). That combination could allow untrusted pull request changes to influence commands that write back to the repository or act with the base repository token.`,
          filePaths: [workflow.filePath],
          heuristic:
            "Static heuristic: pull_request_target plus PR head checkout plus a write-capable token.",
          id: `ap-pr-target-write::${normalizeFilePath(workflow.filePath)}::${job.id}`,
          jobIds: [job.id],
          mitigationChecklist: [
            "Move untrusted pull request builds to `pull_request` and keep `pull_request_target` limited to metadata-only automation.",
            "Do not check out or execute pull request head code in a privileged follow-up job.",
            "Reduce job permissions to the minimum needed before any checkout or script steps run.",
          ],
          relatedRuleIds: matchingFindings.map((candidate) => candidate.ruleId),
          severity:
            writeScopes.includes("contents") ||
            effectivePermissions?.kind === "shorthand"
              ? "critical"
              : "high",
          stepLabels,
          title: "PR head code could run with repository write access",
        });
      }
    }

    for (const finding of workflowFindings.filter(
      (candidate) => candidate.ruleId === "GHA105",
    )) {
      const relatedJobs = getFindingJobs(workflow, finding);

      for (const job of relatedJobs) {
        const shellSteps = job.steps.filter((step) => step.run?.text);

        if (shellSteps.length === 0) {
          continue;
        }

        registerAttackPath(attackPaths, {
          description: `Job \`${job.id}\` runs on a self-hosted runner for an untrusted pull request workflow and still executes shell commands. That mix increases the risk that contributor-controlled input or code could reach infrastructure you manage yourself.`,
          filePaths: [workflow.filePath],
          heuristic:
            "Static heuristic: untrusted pull request trigger plus self-hosted runner plus shell execution.",
          id: `ap-self-hosted-shell::${normalizeFilePath(workflow.filePath)}::${job.id}`,
          jobIds: [job.id],
          mitigationChecklist: [
            "Prefer GitHub-hosted runners for untrusted pull request workflows.",
            "Require approval before privileged or self-hosted follow-up jobs run.",
            "Keep shell steps on self-hosted runners isolated from contributor-controlled inputs whenever possible.",
          ],
          relatedRuleIds: workflowFindings
            .filter(
              (candidate) =>
                candidate.ruleId === "GHA105" &&
                findingTouchesJob(candidate, job.id),
            )
            .map((candidate) => candidate.ruleId),
          severity: "high",
          stepLabels: shellSteps.map((step) => getStepLabel(step)),
          title:
            "Untrusted pull request jobs reach self-hosted shell execution",
        });
      }
    }

    const privilegedThirdPartyItems = actionInventory.filter((item) => {
      return (
        normalizeFilePath(item.filePath) ===
          normalizeFilePath(workflow.filePath) &&
        item.origin === "third-party" &&
        !item.pinned &&
        (item.permissions.hasWriteAccess || item.permissions.hasIdTokenWrite)
      );
    });

    for (const item of privilegedThirdPartyItems) {
      const matchingFindings = workflowFindings.filter((finding) => {
        return (
          unpinnedThirdPartyRuleIds.has(finding.ruleId) &&
          findingTouchesJob(finding, item.jobId) &&
          findingTouchesStep(finding, item.stepLabel) &&
          normalizeFilePath(finding.filePath) ===
            normalizeFilePath(item.filePath)
        );
      });

      if (matchingFindings.length === 0) {
        continue;
      }

      registerAttackPath(attackPaths, {
        description: `Third-party reference \`${item.uses}\` is mutable in a privileged job. If that dependency changes unexpectedly, the same job token could still write to repository resources or mint cloud credentials.`,
        filePaths: [item.filePath],
        heuristic:
          "Static heuristic: unpinned third-party dependency plus write-capable or OIDC-capable job permissions.",
        id: `ap-third-party-privileged::${normalizeFilePath(item.filePath)}::${item.jobId}::${item.stepIndex ?? "job"}`,
        jobIds: [item.jobId],
        mitigationChecklist: [
          "Pin the external action or reusable workflow to a reviewed full commit SHA.",
          "Reduce the job token to only the scopes required for the trusted step sequence.",
          "Split privileged release or deploy steps away from external dependencies where possible.",
        ],
        relatedRuleIds: matchingFindings.map((finding) => finding.ruleId),
        severity: "high",
        stepLabels: item.stepLabel ? [item.stepLabel] : [],
        title: "Mutable third-party dependency sits in a privileged job",
      });
    }

    if (workflow.on.some((trigger) => trigger.name === "workflow_run")) {
      const relatedWorkflowRunFindings = workflowFindings.filter(
        (finding) => finding.ruleId === "GHA106" || finding.ruleId === "GHA102",
      );
      const artifactDownloads = workflow.jobs.flatMap((job) =>
        job.steps.flatMap((step) =>
          isArtifactDownloadStep(step) ? [{ job, step }] : [],
        ),
      );
      const privilegedJobs = workflow.jobs.filter((job) => {
        const effectivePermissions = getJobEffectivePermissions(workflow, job);
        const hasWriteScopes = getWritePermissionScopes(
          effectivePermissions,
        ).some((scope) => scope !== "id-token");

        return (
          hasWriteScopes ||
          hasIdTokenWritePermission(effectivePermissions) ||
          isDeploymentLikeJob(job)
        );
      });

      if (
        relatedWorkflowRunFindings.length > 0 &&
        artifactDownloads.length > 0 &&
        privilegedJobs.length > 0
      ) {
        registerAttackPath(attackPaths, {
          description: `This \`workflow_run\` workflow downloads artifacts from an earlier run and then continues into deploy-like or write-capable jobs. That chain could allow upstream output to cross a trust boundary into a more privileged follow-up workflow.`,
          filePaths: [workflow.filePath],
          heuristic:
            "Static heuristic: workflow_run trigger plus artifact download plus deploy-like or privileged follow-up permissions.",
          id: `ap-workflow-run-artifacts::${normalizeFilePath(workflow.filePath)}`,
          jobIds: privilegedJobs.map((job) => job.id),
          mitigationChecklist: [
            "Verify artifact provenance and expected contents before acting on upstream files.",
            "Keep workflow_run follow-up jobs read-only unless a later trusted step truly needs broader access.",
            "Use environment approvals or an explicit trusted promotion step before deploy actions run.",
          ],
          relatedRuleIds: relatedWorkflowRunFindings.map(
            (finding) => finding.ruleId,
          ),
          severity: "high",
          stepLabels: artifactDownloads.map(({ step }) => getStepLabel(step)),
          title:
            "Upstream artifacts could flow into a privileged follow-up workflow",
        });
      }
    }

    for (const finding of workflowFindings.filter(
      (candidate) => candidate.ruleId === "GHA055",
    )) {
      const relatedJobs = getFindingJobs(workflow, finding);

      for (const job of relatedJobs) {
        const effectivePermissions = getJobEffectivePermissions(workflow, job);
        const privileged =
          getWritePermissionScopes(effectivePermissions).some(
            (scope) => scope !== "id-token",
          ) ||
          hasIdTokenWritePermission(effectivePermissions) ||
          isDeploymentLikeJob(job);

        if (!privileged) {
          continue;
        }

        registerAttackPath(attackPaths, {
          description: `Job \`${job.id}\` uses potentially untrusted event data directly in a shell or command context and still runs with elevated token or deploy privileges. That increases the chance that attacker-controlled input could steer a more sensitive execution path.`,
          filePaths: [workflow.filePath],
          heuristic:
            "Static heuristic: untrusted GitHub context reaches shell execution inside a privileged job.",
          id: `ap-untrusted-shell-privileged::${normalizeFilePath(workflow.filePath)}::${job.id}::${finding.location?.line ?? 0}`,
          jobIds: [job.id],
          mitigationChecklist: [
            "Move untrusted values into a dedicated `env` boundary before shell use.",
            "Quote shell variables normally instead of interpolating event data directly into commands.",
            "Reduce job permissions or split privileged work into a later trusted step if possible.",
          ],
          relatedRuleIds: workflowFindings
            .filter(
              (candidate) =>
                (candidate.ruleId === "GHA055" ||
                  candidate.ruleId === "GHA102" ||
                  candidate.ruleId === "GHA109") &&
                findingTouchesJob(candidate, job.id),
            )
            .map((candidate) => candidate.ruleId),
          severity: "high",
          stepLabels: finding.relatedSteps,
          title: "Untrusted input could steer a privileged shell path",
        });
      }
    }
  }

  return [...attackPaths.values()].sort((left, right) => {
    const severityOrder =
      severityScore(right.severity) - severityScore(left.severity);

    return severityOrder || left.title.localeCompare(right.title);
  });
}

function registerAttackPath(
  attackPaths: Map<string, AttackPath>,
  attackPath: AttackPath,
) {
  const existing = attackPaths.get(attackPath.id);

  if (!existing) {
    attackPaths.set(attackPath.id, {
      ...attackPath,
      filePaths: uniqueSorted(attackPath.filePaths),
      jobIds: uniqueSorted(attackPath.jobIds),
      mitigationChecklist: uniqueSorted(attackPath.mitigationChecklist),
      relatedRuleIds: uniqueSorted(attackPath.relatedRuleIds),
      stepLabels: uniqueSorted(attackPath.stepLabels),
    });
    return;
  }

  attackPaths.set(attackPath.id, {
    ...existing,
    filePaths: uniqueSorted([...existing.filePaths, ...attackPath.filePaths]),
    jobIds: uniqueSorted([...existing.jobIds, ...attackPath.jobIds]),
    mitigationChecklist: uniqueSorted([
      ...existing.mitigationChecklist,
      ...attackPath.mitigationChecklist,
    ]),
    relatedRuleIds: uniqueSorted([
      ...existing.relatedRuleIds,
      ...attackPath.relatedRuleIds,
    ]),
    stepLabels: uniqueSorted([
      ...existing.stepLabels,
      ...attackPath.stepLabels,
    ]),
  });
}

function getFindingJobs(
  workflow: NormalizedWorkflow,
  finding: AnalyzerFinding,
) {
  if (finding.relatedJobs.length > 0) {
    return workflow.jobs.filter((job) => finding.relatedJobs.includes(job.id));
  }

  return workflow.jobs.filter((job) => {
    const startLine = job.location?.line ?? Number.POSITIVE_INFINITY;
    const endLine =
      job.steps.at(-1)?.location?.endLine ?? job.location?.endLine ?? startLine;
    const findingLine = finding.location?.line ?? -1;

    return findingLine >= startLine && findingLine <= endLine;
  });
}

function findingTouchesJob(finding: AnalyzerFinding, jobId: string) {
  return (
    finding.relatedJobs.length === 0 || finding.relatedJobs.includes(jobId)
  );
}

function findingTouchesStep(
  finding: AnalyzerFinding,
  stepLabel: string | null,
) {
  return (
    !stepLabel ||
    finding.relatedSteps.length === 0 ||
    finding.relatedSteps.includes(stepLabel)
  );
}

function isArtifactDownloadStep(step: WorkflowStep) {
  return (
    (step.uses?.kind === "repository-action" &&
      step.uses.owner?.toLowerCase() === "actions" &&
      step.uses.repo?.toLowerCase() === "download-artifact") ||
    (step.run?.text ? /\bgh\s+run\s+download\b/iu.test(step.run.text) : false)
  );
}

function isCheckoutStep(step: WorkflowStep) {
  return (
    step.uses?.kind === "repository-action" &&
    step.uses.owner?.toLowerCase() === "actions" &&
    step.uses.repo?.toLowerCase() === "checkout"
  );
}

function normalizeFilePath(filePath: string) {
  return filePath.replace(/\\/gu, "/").toLowerCase();
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort();
}

function severityScore(severity: AttackPath["severity"]) {
  switch (severity) {
    case "critical":
      return 5;
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    case "info":
    default:
      return 1;
  }
}
