import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  buildEvidence,
  requireRuleDefinition,
  visitSteps,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import type { RuleModule } from "@/features/actions-analyzer/types";

const untrustedEventInRunRuleDefinition = requireRuleDefinition("GHA300");
const commandSubstitutionInRunRuleDefinition = requireRuleDefinition("GHA301");
const curlPipeEventDataRuleDefinition = requireRuleDefinition("GHA302");
const githubScriptDynamicRuleDefinition = requireRuleDefinition("GHA303");

const githubEventInRunPattern =
  /\$\{\{\s*github\.event\.[^{}]+\}\}/u;
const commandSubstitutionPattern = /`[^`]*\$\{\{[^}]+\}\}[^`]*`/u;
const curlPipePattern =
  /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sh|bash|zsh)\b|\|\s*(?:curl|wget)\b/iu;
const githubScriptActionPattern = /^actions\/github-script@/iu;

export const untrustedEventInRunRule: RuleModule = {
  definition: untrustedEventInRunRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(({ job, parsedFile, step, workflow }, index) => {
      const runValue = step.run?.text;

      if (!runValue || !githubEventInRunPattern.test(runValue)) {
        return [];
      }

      return [
        createRuleFinding(
          untrustedEventInRunRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, step.run?.location),
            filePath: workflow.filePath,
            location: step.run?.location,
            message: `Step \`${step.name?.value ?? step.index}\` embeds \`github.event\` data directly inside a shell \`run\` script.`,
            relatedJobs: [job.id],
            relatedSteps: [step.name?.value ?? `step-${step.index}`],
            remediation:
              "Move untrusted event fields into step `env` first, then reference the environment variable from the shell script with strict quoting.",
            severity: "high",
          },
          index,
        ),
      ];
    });
  },
};

export const commandSubstitutionInRunRule: RuleModule = {
  definition: commandSubstitutionInRunRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(({ job, parsedFile, step, workflow }, index) => {
      const runValue = step.run?.text;

      if (!runValue || !commandSubstitutionPattern.test(runValue)) {
        return [];
      }

      return [
        createRuleFinding(
          commandSubstitutionInRunRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, step.run?.location),
            filePath: workflow.filePath,
            location: step.run?.location,
            message: `Step \`${step.name?.value ?? step.index}\` uses shell command substitution with an embedded GitHub Actions expression.`,
            relatedJobs: [job.id],
            relatedSteps: [step.name?.value ?? `step-${step.index}`],
            remediation:
              "Avoid backtick command substitution around expressions; assign values to environment variables and use quoted shell variables instead.",
            severity: "medium",
          },
          index,
        ),
      ];
    });
  },
};

export const curlPipeEventDataRule: RuleModule = {
  definition: curlPipeEventDataRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(({ job, parsedFile, step, workflow }, index) => {
      const runValue = step.run?.text;

      if (!runValue || !curlPipePattern.test(runValue)) {
        return [];
      }

      return [
        createRuleFinding(
          curlPipeEventDataRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, step.run?.location),
            filePath: workflow.filePath,
            location: step.run?.location,
            message: `Step \`${step.name?.value ?? step.index}\` pipes remote download output directly into a shell interpreter.`,
            relatedJobs: [job.id],
            relatedSteps: [step.name?.value ?? `step-${step.index}`],
            remediation:
              "Download artifacts to a file, verify checksums, and execute only reviewed scripts instead of piping network output into a shell.",
            severity: "high",
          },
          index,
        ),
      ];
    });
  },
};

export const githubScriptDynamicRule: RuleModule = {
  definition: githubScriptDynamicRuleDefinition,
  check(context) {
    return visitSteps(context).flatMap(({ job, step, workflow }, index) => {
      const usesValue = step.uses?.raw;

      if (!usesValue || !githubScriptActionPattern.test(usesValue)) {
        return [];
      }

      const scriptValue = getWithInputString(step, "script");

      if (!scriptValue || !/\$\{\{/u.test(scriptValue)) {
        return [];
      }

      return [
        createRuleFinding(
          githubScriptDynamicRuleDefinition,
          {
            evidence: scriptValue.slice(0, 240),
            filePath: workflow.filePath,
            location: step.uses?.location,
            message: `Step \`${step.name?.value ?? step.index}\` runs \`actions/github-script\` with a dynamic \`script\` input containing expressions.`,
            relatedJobs: [job.id],
            relatedSteps: [step.name?.value ?? `step-${step.index}`],
            remediation:
              "Keep github-script logic static in the workflow file or load reviewed script content from a trusted path instead of composing script bodies from event data.",
            severity: "medium",
          },
          index,
        ),
      ];
    });
  },
};

function getWithInputString(
  step: { with: { value: Record<string, unknown> | null } },
  key: string,
) {
  const withValue = step.with.value;

  if (!withValue || typeof withValue !== "object") {
    return null;
  }

  const entry = withValue[key];

  return typeof entry === "string" ? entry : null;
}
