import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  createInsertFixAfterLine,
  createManualSnippetFix,
  createReplaceFixAtLocation,
  hasSimpleMappingKeyLine,
} from "@/features/actions-analyzer/lib/fix-builders";
import {
  detectLineEnding,
  getLineContent,
} from "@/features/actions-analyzer/lib/source-location-utils";
import {
  buildEvidence,
  findPathLocation,
  getStepLabel,
  hasOwnField,
  requireRuleDefinition,
  visitJobs,
  visitSteps,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import { isDeploymentLikeJob } from "@/features/actions-analyzer/lib/security-utils";
import type { RuleModule, WorkflowStep } from "@/features/actions-analyzer/types";

const missingJobTimeoutRuleDefinition = requireRuleDefinition("GHA401");
const missingDeployConcurrencyRuleDefinition = requireRuleDefinition("GHA402");
const continueOnErrorRuleDefinition = requireRuleDefinition("GHA403");
const broadCacheKeyRuleDefinition = requireRuleDefinition("GHA404");
const missingArtifactRetentionRuleDefinition = requireRuleDefinition("GHA405");

export const missingJobTimeoutRule: RuleModule = {
  definition: missingJobTimeoutRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (
        job.reusableWorkflowCall !== null ||
        hasOwnField(job.raw, "timeout-minutes")
      ) {
        return [];
      }

      const location = job.location;
      const fix =
        parsedFile && location && hasSimpleMappingKeyLine(parsedFile.content, location.line)
          ? createInsertFixAfterLine(
              parsedFile.content,
              location.line,
              `${getChildIndent(parsedFile.content, location.line)}timeout-minutes: 15${detectLineEnding(parsedFile.content)}`,
              {
                description:
                  "Insert a conservative 15-minute timeout inside the job block.",
                filePath: workflow.filePath,
                label: "Add timeout-minutes: 15",
                safety: "safe",
              },
            )
          : undefined;

      return [
        createRuleFinding(
          missingJobTimeoutRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            fix,
            location,
            message: `Job \`${job.id}\` does not declare \`timeout-minutes\`, so a hung runner can wait until the platform default timeout is reached.`,
            relatedJobs: [job.id],
            remediation:
              "Set a job-level `timeout-minutes` value so stalled builds fail earlier and CI spend stays predictable.",
          },
          index,
        ),
      ];
    });
  },
};

export const missingDeployConcurrencyRule: RuleModule = {
  definition: missingDeployConcurrencyRuleDefinition,
  check(context) {
    return visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
      if (!isDeploymentLikeJob(job) || hasOwnField(job.raw, "concurrency")) {
        return [];
      }

      const location = job.location;
      const fix =
        parsedFile && location && hasSimpleMappingKeyLine(parsedFile.content, location.line)
          ? createInsertFixAfterLine(
              parsedFile.content,
              location.line,
              [
                `${getChildIndent(parsedFile.content, location.line)}concurrency:`,
                `${getGrandchildIndent(parsedFile.content, location.line)}group: deploy-\${{ github.ref }}`,
                `${getGrandchildIndent(parsedFile.content, location.line)}cancel-in-progress: false`,
                "",
              ].join(detectLineEnding(parsedFile.content)),
              {
                description:
                  "Add a conservative deployment concurrency example and review the grouping key before applying it.",
                filePath: workflow.filePath,
                label: "Add deploy concurrency example",
                safety: "review",
              },
            )
          : undefined;

      return [
        createRuleFinding(
          missingDeployConcurrencyRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            fix,
            location,
            message: `Deploy-style job \`${job.id}\` does not declare \`concurrency\`, so overlapping runs may race with each other.`,
            relatedJobs: [job.id],
            remediation:
              "Add a deployment-specific `concurrency` group so only the intended deploy lane can proceed at one time.",
          },
          index,
        ),
      ];
    });
  },
};

export const continueOnErrorRule: RuleModule = {
  definition: continueOnErrorRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(({ job, parsedFile, step, workflow }, index) => {
      if (step.continueOnError.raw !== true) {
        return [];
      }

      const location =
        step.continueOnError.location ??
        findPathLocation(
          parsedFile,
          ["jobs", job.id, "steps", step.index, "continue-on-error"],
          step.location,
        );
      const fix = location
        ? createReplaceFixAtLocation("false", location, {
            description:
              "Replace `continue-on-error: true` with `false` after confirming the step should fail the job.",
            filePath: workflow.filePath,
            label: "Change continue-on-error to false",
            safety: "review",
          })
        : undefined;

      return [
        createRuleFinding(
          continueOnErrorRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            fix,
            location,
            message: `Step \`${getStepLabel(step)}\` in job \`${job.id}\` sets \`continue-on-error: true\`, which can hide real failures from the final job result.`,
            relatedJobs: [job.id],
            relatedSteps: [getStepLabel(step)],
            remediation:
              "Keep `continue-on-error` only when the step is intentionally advisory. Otherwise let failures stop the job and surface clearly in review.",
          },
          index,
        ),
      ];
    });
  },
};

export const broadCacheKeyRule: RuleModule = {
  definition: broadCacheKeyRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(({ job, parsedFile, step, workflow }, index) => {
      if (!isCacheStep(step)) {
        return [];
      }

      const keyValue = step.with.value?.key;

      if (typeof keyValue !== "string" || keyValue.includes("hashFiles(")) {
        return [];
      }

      const location =
        findPathLocation(
          parsedFile,
          ["jobs", job.id, "steps", step.index, "with", "key"],
          step.with.location ?? step.location,
        ) ?? step.with.location ?? step.location;

      return [
        createRuleFinding(
          broadCacheKeyRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            fix: createManualSnippetFix(
              [
                "with:",
                "  key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}",
              ].join("\n"),
              {
                description:
                  "Use a dependency fingerprint such as `hashFiles(...)` in the cache key and adjust the lockfile glob for your package manager.",
                filePath: workflow.filePath,
                label: "Copy cache-key example",
                safety: "manual",
              },
            ),
            location,
            message: `Cache step \`${getStepLabel(step)}\` in job \`${job.id}\` uses key \`${keyValue}\` without a dependency fingerprint, so stale cache reuse is more likely.`,
            relatedJobs: [job.id],
            relatedSteps: [getStepLabel(step)],
            remediation:
              "Include a dependency fingerprint such as `hashFiles(...)` in the cache key so the cache rolls forward when dependency inputs change.",
          },
          index,
        ),
      ];
    });
  },
};

export const missingArtifactRetentionRule: RuleModule = {
  definition: missingArtifactRetentionRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(({ job, parsedFile, step, workflow }, index) => {
      if (!isUploadArtifactStep(step)) {
        return [];
      }

      if (
        hasOwnField(step.raw, "with") &&
        Object.hasOwn(step.with.value ?? {}, "retention-days")
      ) {
        return [];
      }

      const location =
        findPathLocation(
          parsedFile,
          ["jobs", job.id, "steps", step.index, "with", "retention-days"],
          step.with.location ?? step.location,
        ) ?? step.with.location ?? step.location;
      const fix =
        parsedFile &&
        step.with.location &&
        hasSimpleMappingKeyLine(parsedFile.content, step.with.location.line)
          ? createInsertFixAfterLine(
              parsedFile.content,
              step.with.location.line,
              `${getChildIndent(parsedFile.content, step.with.location.line)}retention-days: 7${detectLineEnding(parsedFile.content)}`,
              {
                description:
                  "Insert an explicit 7-day artifact retention value into the existing `with` block.",
                filePath: workflow.filePath,
                label: "Add retention-days: 7",
                safety: "safe",
              },
            )
          : undefined;

      return [
        createRuleFinding(
          missingArtifactRetentionRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            fix,
            location,
            message: `Artifact upload step \`${getStepLabel(step)}\` in job \`${job.id}\` does not set \`retention-days\`, so artifact lifetime is left implicit.`,
            relatedJobs: [job.id],
            relatedSteps: [getStepLabel(step)],
            remediation:
              "Set `retention-days` explicitly on upload steps so reviewers can verify storage and cleanup expectations.",
          },
          index,
        ),
      ];
    });
  },
};

function getChildIndent(content: string, lineNumber: number) {
  return `${getLineIndent(content, lineNumber)}  `;
}

function getGrandchildIndent(content: string, lineNumber: number) {
  return `${getChildIndent(content, lineNumber)}  `;
}

function getLineIndent(content: string, lineNumber: number) {
  return /^\s*/u.exec(getLineContent(content, lineNumber))?.[0] ?? "";
}

function isCacheStep(step: WorkflowStep) {
  return (
    step.uses?.kind === "repository-action" &&
    step.uses.owner?.toLowerCase() === "actions" &&
    step.uses.repo?.toLowerCase() === "cache"
  );
}

function isUploadArtifactStep(step: WorkflowStep) {
  return (
    step.uses?.kind === "repository-action" &&
    step.uses.owner?.toLowerCase() === "actions" &&
    step.uses.repo?.toLowerCase() === "upload-artifact"
  );
}
