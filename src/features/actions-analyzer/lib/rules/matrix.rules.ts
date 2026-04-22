import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  buildEvidence,
  findPathLocation,
  requireRuleDefinition,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import type { RuleModule } from "@/features/actions-analyzer/types";

const largeMatrixRuleDefinition = requireRuleDefinition("GHA407");
const unmatchedMatrixEntryRuleDefinition = requireRuleDefinition("GHA412");
const emptyMatrixRuleDefinition = requireRuleDefinition("GHA413");
const unresolvedMatrixRuleDefinition = requireRuleDefinition("GHA414");

export const largeMatrixRule: RuleModule = {
  definition: largeMatrixRuleDefinition,
  check(context) {
    return context.matrixSummary.jobs.flatMap((matrixJob, index) => {
      const finalCombinationCount = matrixJob.finalCombinationCount;

      if (
        matrixJob.isUnresolved ||
        finalCombinationCount === null ||
        finalCombinationCount <=
          context.settings.maxMatrixCombinationsBeforeWarning
      ) {
        return [];
      }

      return [
        createRuleFinding(
          largeMatrixRuleDefinition,
          {
            evidence: buildEvidence(
              context.getParsedFile(matrixJob.filePath),
              matrixJob.location,
            ),
            filePath: matrixJob.filePath,
            location: matrixJob.location,
            message: `Job \`${matrixJob.jobId}\` expands to ${finalCombinationCount} static matrix combinations, which is above the configured review threshold of ${context.settings.maxMatrixCombinationsBeforeWarning}.`,
            relatedJobs: [matrixJob.jobId],
            remediation:
              "Reduce the matrix size, split expensive variants into separate workflows, or accept the larger matrix intentionally after reviewing cost and feedback-time impact.",
            severity:
              finalCombinationCount >=
              context.settings.maxMatrixCombinationsBeforeWarning * 2
                ? "medium"
                : "low",
          },
          index,
        ),
      ];
    });
  },
};

export const unmatchedMatrixEntryRule: RuleModule = {
  definition: unmatchedMatrixEntryRuleDefinition,
  check(context) {
    return context.matrixSummary.jobs.flatMap((matrixJob) => {
      const parsedFile = context.getParsedFile(matrixJob.filePath);

      return [
        ...matrixJob.excludeEntries.flatMap((entry, index) => {
          if (entry.matchedBaseCombinations > 0) {
            return [];
          }

          const location = findPathLocation(
            parsedFile,
            ["jobs", matrixJob.jobId, "strategy", "matrix", "exclude", index],
            matrixJob.location,
          );

          return [
            createRuleFinding(
              unmatchedMatrixEntryRuleDefinition,
              {
                evidence:
                  buildEvidence(parsedFile, location) ??
                  JSON.stringify(entry.entry, null, 2),
                filePath: matrixJob.filePath,
                location,
                message: `Job \`${matrixJob.jobId}\` has an \`exclude\` entry that does not match any static base matrix combination, so it will not remove anything.`,
                relatedJobs: [matrixJob.jobId],
                remediation:
                  "Review the `exclude` entry for typos or outdated values. If the matrix changed, remove or update the entry so it matches the intended combinations.",
                severity: "medium",
              },
              index,
            ),
          ];
        }),
        ...matrixJob.includeEntries.flatMap((entry, index) => {
          if (entry.matchedBaseCombinations > 0) {
            return [];
          }

          const location = findPathLocation(
            parsedFile,
            ["jobs", matrixJob.jobId, "strategy", "matrix", "include", index],
            matrixJob.location,
          );

          return [
            createRuleFinding(
              unmatchedMatrixEntryRuleDefinition,
              {
                evidence:
                  buildEvidence(parsedFile, location) ??
                  JSON.stringify(entry.entry, null, 2),
                filePath: matrixJob.filePath,
                location,
                message: `Job \`${matrixJob.jobId}\` has an \`include\` entry that does not match any static base matrix combination, so it adds an include-only combination.`,
                relatedJobs: [matrixJob.jobId],
                remediation:
                  "Confirm that this standalone `include` combination is intentional. If you expected it to augment an existing base combination, update the keys so it matches the base matrix.",
                severity: "low",
              },
              index,
            ),
          ];
        }),
      ];
    });
  },
};

export const emptyMatrixRule: RuleModule = {
  definition: emptyMatrixRuleDefinition,
  check(context) {
    return context.matrixSummary.jobs.flatMap((matrixJob, index) => {
      if (
        matrixJob.isUnresolved ||
        matrixJob.finalCombinationCount === null ||
        matrixJob.finalCombinationCount > 0
      ) {
        return [];
      }

      return [
        createRuleFinding(
          emptyMatrixRuleDefinition,
          {
            evidence: buildEvidence(
              context.getParsedFile(matrixJob.filePath),
              matrixJob.location,
            ),
            filePath: matrixJob.filePath,
            location: matrixJob.location,
            message: `Job \`${matrixJob.jobId}\` resolves to zero matrix combinations after static exclusions and includes are applied.`,
            relatedJobs: [matrixJob.jobId],
            remediation:
              "Review the matrix axes, `exclude`, and `include` entries so the job still schedules at least one intended combination.",
            severity: "high",
          },
          index,
        ),
      ];
    });
  },
};

export const unresolvedMatrixRule: RuleModule = {
  definition: unresolvedMatrixRuleDefinition,
  check(context) {
    return context.matrixSummary.jobs.flatMap((matrixJob, index) => {
      if (!matrixJob.isUnresolved) {
        return [];
      }

      return [
        createRuleFinding(
          unresolvedMatrixRuleDefinition,
          {
            confidence: "high",
            evidence: buildEvidence(
              context.getParsedFile(matrixJob.filePath),
              matrixJob.location,
            ),
            filePath: matrixJob.filePath,
            location: matrixJob.location,
            message: `Job \`${matrixJob.jobId}\` uses matrix values that cannot be expanded statically. ${matrixJob.unresolvedReasons.join(" ")}`,
            relatedJobs: [matrixJob.jobId],
            remediation:
              "Keep the dynamic matrix if it is intentional, but review the unresolved reasons and verify the runtime-generated combinations separately.",
            severity: "low",
          },
          index,
        ),
      ];
    });
  },
};
