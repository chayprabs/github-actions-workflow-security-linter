import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  asRecord,
  buildEvidence,
  findDuplicateMapKeysAtPath,
  getRawJobEntries,
  getRawStepEntries,
  getWorkflowAnchorLocation,
  isPlainObject,
  requireRuleDefinition,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import type { RuleModule } from "@/features/actions-analyzer/types";

const missingOnRuleDefinition = requireRuleDefinition("GHA004");
const missingJobsRuleDefinition = requireRuleDefinition("GHA005");
const invalidJobsShapeRuleDefinition = requireRuleDefinition("GHA006");
const duplicateJobIdsRuleDefinition = requireRuleDefinition("GHA012");
const suspiciousKeyTypoRuleDefinition = requireRuleDefinition("GHA017");

const typoSuggestions = {
  job: {
    expected: "jobs",
    severity: "medium",
    subject: "top-level workflow key",
  },
  permission: {
    expected: "permissions",
    severity: "medium",
    subject: "top-level workflow key",
  },
  runs_on: {
    expected: "runs-on",
    severity: "low",
    subject: "job key",
  },
  "time-out-minutes": {
    expected: "timeout-minutes",
    severity: "low",
    subject: "job or step key",
  },
} as const;

export const missingOnRule: RuleModule = {
  definition: missingOnRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow, index) => {
      if (workflow.onRaw !== undefined && workflow.on.length > 0) {
        return [];
      }

      const parsedFile = context.getParsedFile(workflow.filePath);
      const location =
        workflow.onLocation ?? getWorkflowAnchorLocation(workflow, parsedFile);

      return [
        createRuleFinding(
          missingOnRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            location,
            message:
              workflow.onRaw === undefined
                ? "This workflow is missing a top-level `on` declaration, so GitHub Actions has no event that starts it."
                : "This workflow's top-level `on` declaration does not define any usable triggers.",
            remediation:
              "Add a top-level `on` section. Manual suggestion: `on: [push, pull_request]`.",
          },
          index,
        ),
      ];
    });
  },
};

export const missingJobsRule: RuleModule = {
  definition: missingJobsRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow, index) => {
      if (workflow.jobsRaw !== undefined) {
        return [];
      }

      const parsedFile = context.getParsedFile(workflow.filePath);
      const location = workflow.jobsLocation ?? getWorkflowAnchorLocation(workflow, parsedFile);

      return [
        createRuleFinding(
          missingJobsRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            location,
            message:
              "This workflow is missing the top-level `jobs` mapping, so it cannot define any runnable jobs.",
            remediation:
              "Add a `jobs` section with at least one job. Manual skeleton: `jobs: { build: { runs-on: ubuntu-latest, steps: [{ run: \"echo TODO\" }] } }`.",
          },
          index,
        ),
      ];
    });
  },
};

export const invalidJobsShapeRule: RuleModule = {
  definition: invalidJobsShapeRuleDefinition,
  check(context) {
    return context.normalizedWorkflows.flatMap((workflow, index) => {
      if (workflow.jobsRaw === undefined) {
        return [];
      }

      if (
        isPlainObject(workflow.jobsRaw) &&
        Object.keys(workflow.jobsRaw).length > 0
      ) {
        return [];
      }

      const parsedFile = context.getParsedFile(workflow.filePath);
      const location = workflow.jobsLocation ?? getWorkflowAnchorLocation(workflow, parsedFile);
      const message = isPlainObject(workflow.jobsRaw)
        ? "The top-level `jobs` mapping is empty. GitHub Actions expects at least one named job."
        : "The top-level `jobs` field must be an object keyed by job id.";

      return [
        createRuleFinding(
          invalidJobsShapeRuleDefinition,
          {
            evidence: buildEvidence(parsedFile, location),
            filePath: workflow.filePath,
            location,
            message,
            remediation:
              "Replace `jobs` with a mapping such as `jobs: { build: { runs-on: ubuntu-latest, steps: [{ run: \"echo ok\" }] } }`.",
          },
          index,
        ),
      ];
    });
  },
};

export const duplicateJobIdsRule: RuleModule = {
  definition: duplicateJobIdsRuleDefinition,
  check(context) {
    return context.parsedFiles.flatMap((parsedFile) => {
      return findDuplicateMapKeysAtPath(parsedFile, ["jobs"]).map(
        (duplicate, index) => {
          const duplicateEvidence =
            duplicate.duplicateWarning?.evidence ??
            buildEvidence(parsedFile, duplicate.location);
          const parserReference = duplicate.duplicateWarning
            ? " The YAML parser also reported a duplicate mapping key here."
            : "";

          return createRuleFinding(
            duplicateJobIdsRuleDefinition,
            {
              evidence: duplicateEvidence,
              filePath: parsedFile.filePath,
              location: duplicate.location,
              message: `Job id \`${duplicate.key}\` is declared ${duplicate.occurrences} times under \`jobs\`. GitHub Actions requires unique job ids.${parserReference}`,
              relatedJobs: [duplicate.key],
              remediation:
                "Rename or merge the duplicate jobs so each entry under `jobs` has a unique id.",
            },
            index,
          );
        },
      );
    });
  },
};

export const suspiciousKeyTypoRule: RuleModule = {
  definition: suspiciousKeyTypoRuleDefinition,
  check(context) {
    return context.parsedFiles.flatMap((parsedFile) => {
      if (!parsedFile.isSuccessful || !isPlainObject(parsedFile.parsedValue)) {
        return [];
      }

      const root = asRecord(parsedFile.parsedValue);
      const findings = [
        ...findTypoFindings({
          filePath: parsedFile.filePath,
          parsedFile,
          raw: root,
          severity: typoSuggestions.job.severity,
          suggestions: {
            job: typoSuggestions.job,
            permission: typoSuggestions.permission,
          },
        }),
        ...getRawJobEntries(parsedFile).flatMap(({ jobId, raw }) => {
          return [
            ...findTypoFindings({
              filePath: parsedFile.filePath,
              parsedFile,
              pathPrefix: ["jobs", jobId],
              raw,
              relatedJobs: [jobId],
              severity: typoSuggestions.runs_on.severity,
              suggestions: {
                runs_on: typoSuggestions.runs_on,
                "time-out-minutes": typoSuggestions["time-out-minutes"],
              },
            }),
            ...getRawStepEntries(raw).flatMap(({ index, raw: stepRaw }) =>
              findTypoFindings({
                filePath: parsedFile.filePath,
                parsedFile,
                pathPrefix: ["jobs", jobId, "steps", index],
                raw: stepRaw,
                relatedJobs: [jobId],
                relatedSteps: [`step-${index + 1}`],
                severity: typoSuggestions["time-out-minutes"].severity,
                suggestions: {
                  "time-out-minutes": typoSuggestions["time-out-minutes"],
                },
              }),
            ),
          ];
        }),
      ];

      return findings;
    });
  },
};

function findTypoFindings({
  filePath,
  parsedFile,
  pathPrefix = [],
  raw,
  relatedJobs = [],
  relatedSteps = [],
  suggestions,
}: {
  filePath: string;
  parsedFile: {
    sourceMap: {
      findLocationForPath: (
        path: readonly (number | string)[],
      ) => ReturnType<
        typeof createRuleFinding
      >["location"];
      getSourceSnippet: (
        location?: ReturnType<typeof createRuleFinding>["location"],
        contextLines?: number,
      ) => string | null;
    };
  };
  pathPrefix?: (number | string)[] | undefined;
  raw: Record<string, unknown>;
  relatedJobs?: string[] | undefined;
  relatedSteps?: string[] | undefined;
  severity: "low" | "medium";
  suggestions: Record<
    string,
    {
      expected: string;
      severity: "low" | "medium";
      subject: string;
    }
  >;
}) {
  return Object.entries(suggestions).flatMap(([actualKey, suggestion], index) => {
    if (!Object.hasOwn(raw, actualKey)) {
      return [];
    }

    const location = parsedFile.sourceMap.findLocationForPath([
      ...pathPrefix,
      actualKey,
    ]);

    return [
      createRuleFinding(
        suspiciousKeyTypoRuleDefinition,
        {
          confidence: "high",
          evidence: parsedFile.sourceMap.getSourceSnippet(location) ?? undefined,
          filePath,
          location,
          message: `\`${actualKey}\` looks like a typo of \`${suggestion.expected}\`. GitHub Actions will ignore the misspelled ${suggestion.subject}.`,
          relatedJobs,
          relatedSteps,
          remediation: `Rename \`${actualKey}\` to \`${suggestion.expected}\` so GitHub Actions reads the intended field.`,
          severity: suggestion.severity,
        },
        index,
      ),
    ];
  });
}
