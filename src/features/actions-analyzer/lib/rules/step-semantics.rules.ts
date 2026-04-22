import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  asRecord,
  buildEvidence,
  findPathLocation,
  getStepLabel,
  hasOwnField,
  requireRuleDefinition,
  visitJobs,
  visitSteps,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import type {
  ReusableWorkflowCall,
  RuleModule,
  WorkflowActionUse,
} from "@/features/actions-analyzer/types";

const stepRunAndUsesRuleDefinition = requireRuleDefinition("GHA008");
const stepMissingRunOrUsesRuleDefinition = requireRuleDefinition("GHA009");
const malformedUsesRuleDefinition = requireRuleDefinition("GHA010");

export const stepRunAndUsesRule: RuleModule = {
  definition: stepRunAndUsesRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(
      ({ job, parsedFile, step, workflow }, index) => {
        if (!hasOwnField(step.raw, "run") || !hasOwnField(step.raw, "uses")) {
          return [];
        }

        const location =
          step.uses?.location ??
          step.run?.location ??
          findPathLocation(
            parsedFile,
            ["jobs", job.id, "steps", step.index, "uses"],
            step.location,
          ) ??
          step.location;

        return [
          createRuleFinding(
            stepRunAndUsesRuleDefinition,
            {
              evidence: buildEvidence(parsedFile, location),
              filePath: workflow.filePath,
              location,
              message: `Step \`${getStepLabel(step)}\` in job \`${job.id}\` defines both \`run\` and \`uses\`. A step must choose one execution mode.`,
              relatedJobs: [job.id],
              relatedSteps: [getStepLabel(step)],
              remediation:
                "Keep either `run` for a shell command or `uses` for an action call, but not both in the same step.",
            },
            index,
          ),
        ];
      },
    );
  },
};

export const stepMissingRunOrUsesRule: RuleModule = {
  definition: stepMissingRunOrUsesRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(
      ({ job, parsedFile, step, workflow }, index) => {
        if (hasOwnField(step.raw, "run") || hasOwnField(step.raw, "uses")) {
          return [];
        }

        return [
          createRuleFinding(
            stepMissingRunOrUsesRuleDefinition,
            {
              evidence: buildEvidence(parsedFile, step.location),
              filePath: workflow.filePath,
              location: step.location,
              message: `Step \`${getStepLabel(step)}\` in job \`${job.id}\` defines neither \`run\` nor \`uses\`, so it has nothing to execute.`,
              relatedJobs: [job.id],
              relatedSteps: [getStepLabel(step)],
              remediation:
                "Add `run` for a shell command or `uses` for an action reference so the step performs work.",
            },
            index,
          ),
        ];
      },
    );
  },
};

export const malformedUsesRule: RuleModule = {
  definition: malformedUsesRuleDefinition,
  check(context) {
    return [
      ...visitSteps(context).flatMap(
        ({ job, parsedFile, step, workflow }, index) => {
          if (isValidStepUses(step.uses) || !hasOwnField(step.raw, "uses")) {
            return [];
          }

          const location =
            step.uses?.location ??
            findPathLocation(
              parsedFile,
              ["jobs", job.id, "steps", step.index, "uses"],
              step.location,
            ) ??
            step.location;

          return [
            createRuleFinding(
              malformedUsesRuleDefinition,
              {
                evidence: buildEvidence(parsedFile, location),
                filePath: workflow.filePath,
                location,
                message: buildStepUsesMessage(step.raw),
                relatedJobs: [job.id],
                relatedSteps: [getStepLabel(step)],
                remediation:
                  "Use one of the supported step syntaxes: `./path`, `docker://image:tag`, `docker://image@sha256:digest`, `owner/repo@ref`, or `owner/repo/path@ref`.",
              },
              index,
            ),
          ];
        },
      ),
      ...visitJobs(context).flatMap(({ job, parsedFile, workflow }, index) => {
        if (
          isValidReusableWorkflowCall(job.reusableWorkflowCall) ||
          !hasOwnField(job.raw, "uses")
        ) {
          return [];
        }

        const location =
          job.reusableWorkflowCall?.location ??
          findPathLocation(parsedFile, ["jobs", job.id, "uses"], job.location) ??
          job.location;

        return [
          createRuleFinding(
            malformedUsesRuleDefinition,
            {
              evidence: buildEvidence(parsedFile, location),
              filePath: workflow.filePath,
              location,
              message: buildJobUsesMessage(job.raw),
              relatedJobs: [job.id],
              remediation:
                "For reusable workflow calls, use `owner/repo/.github/workflows/file.yml@ref` or `./.github/workflows/file.yml`.",
            },
            index,
          ),
        ];
      }),
    ];
  },
};

function buildJobUsesMessage(rawJob: unknown) {
  const rawUses = asRecord(rawJob).uses;

  if (typeof rawUses !== "string") {
    return "Job-level `uses` should be a string that references a reusable workflow file.";
  }

  if (/^\.\/?\.github\/workflows\/.+$/u.test(rawUses)) {
    return "Job-level `uses` points at a reusable workflow file, but the local path is incomplete or malformed.";
  }

  if (rawUses.includes(".github/workflows/")) {
    return "Job-level `uses` should reference a reusable workflow with `owner/repo/.github/workflows/file.yml@ref` or `./.github/workflows/file.yml`.";
  }

  return "Job-level `uses` must point to a reusable workflow file, not a regular action reference.";
}

function buildStepUsesMessage(rawStep: unknown) {
  const rawUses = asRecord(rawStep).uses;

  if (typeof rawUses !== "string") {
    return "Step-level `uses` should be a string reference to an action.";
  }

  if (rawUses.startsWith("docker://")) {
    return "Docker action references should use `docker://image:tag` or `docker://image@sha256:digest`.";
  }

  if (rawUses.includes(".github/workflows/")) {
    return "Step-level `uses` points at a reusable workflow file. Reusable workflows belong on job-level `uses`, not in steps.";
  }

  if (rawUses.startsWith("./")) {
    return "Local action references should point to an action directory such as `./path/to/action`.";
  }

  return "Repository action references should use `owner/repo@ref` or `owner/repo/path@ref`.";
}

function isValidReusableWorkflowCall(
  reusableWorkflowCall: ReusableWorkflowCall | null,
) {
  if (!reusableWorkflowCall) {
    return false;
  }

  if (reusableWorkflowCall.kind === "local-reusable-workflow") {
    return reusableWorkflowCall.workflowPath !== null;
  }

  if (reusableWorkflowCall.kind === "repository-reusable-workflow") {
    return (
      reusableWorkflowCall.owner !== null &&
      reusableWorkflowCall.repo !== null &&
      reusableWorkflowCall.ref !== null &&
      reusableWorkflowCall.workflowPath !== null
    );
  }

  return false;
}

function isValidStepUses(uses: WorkflowActionUse | null) {
  if (!uses) {
    return false;
  }

  if (uses.kind === "local-action") {
    return uses.path !== null;
  }

  if (uses.kind === "repository-action") {
    return uses.owner !== null && uses.repo !== null && uses.ref !== null;
  }

  if (uses.kind === "docker-action") {
    return uses.image !== null && (uses.tag !== null || uses.digest !== null);
  }

  return false;
}
