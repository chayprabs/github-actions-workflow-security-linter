import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  buildEvidence,
  requireRuleDefinition,
  visitJobs,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import {
  getJobEffectivePermissions,
  hasUntrustedPullRequestTrigger,
} from "@/features/actions-analyzer/lib/security-utils";
import type { RuleModule } from "@/features/actions-analyzer/types";

const reusableWorkflowWriteAllRuleDefinition = requireRuleDefinition("GHA111");
const reusableWorkflowSecretsOnPrRuleDefinition = requireRuleDefinition("GHA112");
const reusableWorkflowRelativePathRuleDefinition = requireRuleDefinition("GHA113");

export const reusableWorkflowWriteAllRule: RuleModule = {
  definition: reusableWorkflowWriteAllRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (!job.reusableWorkflowCall) {
        return [];
      }

      const permissions = getJobEffectivePermissions(workflow, job);
      const shorthand = permissions?.shorthand?.toLowerCase();

      if (shorthand !== "write-all") {
        return [];
      }

      return [
        createRuleFinding(
          reusableWorkflowWriteAllRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, job.location),
            filePath: workflow.filePath,
            location: job.location,
            message: `Reusable workflow caller job \`${job.id}\` grants \`permissions: write-all\` to the called workflow.`,
            relatedJobs: [job.id],
            remediation:
              "Scope reusable workflow callers to the minimum permissions required and avoid `write-all` unless every called workflow truly needs it.",
            severity: "high",
          },
          index,
        ),
      ];
    });
  },
};

export const reusableWorkflowSecretsOnPrRule: RuleModule = {
  definition: reusableWorkflowSecretsOnPrRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (!job.reusableWorkflowCall) {
        return [];
      }

      const secretsValue = job.secrets.value;

      if (
        !hasUntrustedPullRequestTrigger(workflow) ||
        secretsValue !== "inherit"
      ) {
        return [];
      }

      return [
        createRuleFinding(
          reusableWorkflowSecretsOnPrRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, job.location),
            filePath: workflow.filePath,
            location: job.location,
            message: `Job \`${job.id}\` calls a reusable workflow with \`secrets: inherit\` on an untrusted pull request trigger.`,
            relatedJobs: [job.id],
            remediation:
              "Pass only the secrets the reusable workflow needs instead of inheriting the full secret set on untrusted triggers.",
            severity: "high",
          },
          index,
        ),
      ];
    });
  },
};

export const reusableWorkflowRelativePathRule: RuleModule = {
  definition: reusableWorkflowRelativePathRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, workflow }, index) => {
      const call = job.reusableWorkflowCall;

      if (!call) {
        return [];
      }

      if (!call.raw.includes("..")) {
        return [];
      }

      return [
        createRuleFinding(
          reusableWorkflowRelativePathRuleDefinition,
          {
            evidence: call.raw,
            filePath: workflow.filePath,
            location: call.location,
            message: `Job \`${job.id}\` references reusable workflow path \`${call.raw}\` with a parent-directory segment.`,
            relatedJobs: [job.id],
            remediation:
              "Keep reusable workflow references inside `.github/workflows` without `..` traversal so callers cannot escape the intended workflow directory.",
            severity: "medium",
          },
          index,
        ),
      ];
    });
  },
};
