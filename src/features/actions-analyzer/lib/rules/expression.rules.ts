import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import { requireRuleDefinition } from "@/features/actions-analyzer/lib/rules/rule-helpers";
import type {
  RuleModule,
  WorkflowExpression,
} from "@/features/actions-analyzer/types";

const malformedExpressionRuleDefinition = requireRuleDefinition("GHA050");
const unknownContextRuleDefinition = requireRuleDefinition("GHA051");
const secretsInIfRuleDefinition = requireRuleDefinition("GHA052");
const matrixOutsideMatrixJobRuleDefinition = requireRuleDefinition("GHA053");
const unknownNeedsExpressionRuleDefinition = requireRuleDefinition("GHA054");
const untrustedContextRuleDefinition = requireRuleDefinition("GHA055");
const dynamicUsesRuleDefinition = requireRuleDefinition("GHA056");

export const malformedExpressionRule: RuleModule = {
  definition: malformedExpressionRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression, index) => {
      if (!expression.isMalformed) {
        return [];
      }

      const unmatchedBraces = expression.isWrapped && !expression.rawExpression.endsWith("}}");

      return [
        createRuleFinding(
          malformedExpressionRuleDefinition,
          {
            evidence: expression.rawExpression,
            filePath: expression.filePath,
            location: expression.location,
            message: unmatchedBraces
              ? `Expression in \`${expression.fieldPathLabel}\` starts with \`${"${{"}\` but does not close with \`}}\`.`
              : `Expression in \`${expression.fieldPathLabel}\` looks malformed or empty and should be reviewed.`,
            relatedJobs: expression.jobId ? [expression.jobId] : [],
            relatedSteps: expression.stepLabel ? [expression.stepLabel] : [],
            remediation:
              "Use balanced `${{ ... }}` delimiters and keep non-empty expression content inside the braces.",
            severity: unmatchedBraces ? "high" : "medium",
          },
          index,
        ),
      ];
    });
  },
};

export const unknownContextRule: RuleModule = {
  definition: unknownContextRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression, index) => {
      if (expression.isMalformed || expression.unknownContexts.length === 0) {
        return [];
      }

      return [
        createRuleFinding(
          unknownContextRuleDefinition,
          {
            evidence: expression.rawExpression,
            filePath: expression.filePath,
            location: expression.location,
            message: `Expression in \`${expression.fieldPathLabel}\` uses unknown context root${expression.unknownContexts.length === 1 ? "" : "s"} ${expression.unknownContexts
              .map((unknownContext) => `\`${unknownContext}\``)
              .join(", ")}.`,
            relatedJobs: expression.jobId ? [expression.jobId] : [],
            relatedSteps: expression.stepLabel ? [expression.stepLabel] : [],
            remediation:
              "Start the expression from a documented GitHub Actions context or fix the misspelled root identifier.",
          },
          index,
        ),
      ];
    });
  },
};

export const secretsInIfRule: RuleModule = {
  definition: secretsInIfRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression, index) => {
      if (
        expression.isMalformed ||
        expression.fieldType !== "if" ||
        !expression.references.some((reference) => reference.startsWith("secrets."))
      ) {
        return [];
      }

      return [
        createRuleFinding(
          secretsInIfRuleDefinition,
          {
            evidence: expression.rawExpression,
            filePath: expression.filePath,
            location: expression.location,
            message: `Expression in \`${expression.fieldPathLabel}\` references \`secrets.*\` directly inside an \`if\` conditional.`,
            relatedJobs: expression.jobId ? [expression.jobId] : [],
            relatedSteps: expression.stepLabel ? [expression.stepLabel] : [],
            remediation:
              "Assign the secret to an environment variable first when appropriate, then reference the environment variable in the conditional.",
          },
          index,
        ),
      ];
    });
  },
};

export const matrixOutsideMatrixJobRule: RuleModule = {
  definition: matrixOutsideMatrixJobRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression, index) => {
      if (
        expression.isMalformed ||
        !expression.contexts.includes("matrix") ||
        !expression.jobId
      ) {
        return [];
      }

      const workflow = context.getWorkflow(expression.filePath);
      const job = workflow?.jobs.find((candidate) => candidate.id === expression.jobId);

      if (!job || job.strategy?.matrix != null) {
        return [];
      }

      return [
        createRuleFinding(
          matrixOutsideMatrixJobRuleDefinition,
          {
            evidence: expression.rawExpression,
            filePath: expression.filePath,
            location: expression.location,
            message: `Expression in \`${expression.fieldPathLabel}\` uses the \`matrix\` context, but job \`${expression.jobId}\` does not define \`strategy.matrix\`.`,
            relatedJobs: [expression.jobId],
            relatedSteps: expression.stepLabel ? [expression.stepLabel] : [],
            remediation:
              "Define `strategy.matrix` on the job before using `matrix.*`, or replace the reference with another supported context.",
          },
          index,
        ),
      ];
    });
  },
};

export const unknownNeedsExpressionRule: RuleModule = {
  definition: unknownNeedsExpressionRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression) => {
      if (expression.isMalformed) {
        return [];
      }

      const workflow = context.getWorkflow(expression.filePath);
      const knownJobIds = new Set(workflow?.jobs.map((job) => job.id) ?? []);

      return expression.references.flatMap((reference, index) => {
        if (!reference.startsWith("needs.")) {
          return [];
        }

        const neededJobId = reference.split(".")[1];

        if (
          !neededJobId ||
          neededJobId === "*" ||
          knownJobIds.has(neededJobId)
        ) {
          return [];
        }

        return [
          createRuleFinding(
            unknownNeedsExpressionRuleDefinition,
            {
              evidence: expression.rawExpression,
              filePath: expression.filePath,
              location: expression.location,
              message: `Expression in \`${expression.fieldPathLabel}\` references \`needs.${neededJobId}\`, but no job with id \`${neededJobId}\` exists in this workflow.`,
              relatedJobs: expression.jobId
                ? [expression.jobId, neededJobId]
                : [neededJobId],
              relatedSteps: expression.stepLabel ? [expression.stepLabel] : [],
              remediation:
                "Reference only defined job ids in `needs.*` expression paths, or rename the target job to match the expression.",
              severity: "high",
            },
            index,
          ),
        ];
      });
    });
  },
};

export const untrustedContextRule: RuleModule = {
  definition: untrustedContextRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression, index) => {
      if (
        expression.isMalformed ||
        expression.fieldType === "env" ||
        !isUntrustedUsage(expression)
      ) {
        return [];
      }

      const riskyReferences = getRiskyReferences(expression);

      return [
        createRuleFinding(
          untrustedContextRuleDefinition,
          {
            evidence: expression.rawExpression,
            filePath: expression.filePath,
            location: expression.location,
            message: `Expression in \`${expression.fieldPathLabel}\` uses potentially untrusted GitHub event data directly: ${riskyReferences
              .map((reference) => `\`${reference}\``)
              .join(", ")}.`,
            relatedJobs: expression.jobId ? [expression.jobId] : [],
            relatedSteps: expression.stepLabel ? [expression.stepLabel] : [],
            remediation:
              "Pass the untrusted value through an environment variable boundary first, then quote it carefully in scripts or downstream tools.",
          },
          index,
        ),
      ];
    });
  },
};

export const dynamicUsesRule: RuleModule = {
  definition: dynamicUsesRuleDefinition,
  check(context) {
    return context.expressions.flatMap((expression, index) => {
      if (
        expression.isMalformed ||
        expression.fieldType !== "uses" ||
        !/@\s*\$\{\{/u.test(expression.rawValue)
      ) {
        return [];
      }

      return [
        createRuleFinding(
          dynamicUsesRuleDefinition,
          {
            evidence: expression.rawExpression,
            filePath: expression.filePath,
            location: expression.location,
            message: `\`uses\` in \`${expression.fieldPathLabel}\` selects its ref dynamically at runtime, which makes review and pinning harder.`,
            relatedJobs: expression.jobId ? [expression.jobId] : [],
            relatedSteps: expression.stepLabel ? [expression.stepLabel] : [],
            remediation:
              "Use a static action or reusable workflow reference so the reviewed ref is visible in the workflow file and can be pinned safely.",
          },
          index,
        ),
      ];
    });
  },
};

function getRiskyReferences(expression: WorkflowExpression) {
  const riskyReferences = new Set(expression.matchedUntrustedContexts);

  if (expression.fieldType === "run") {
    expression.references
      .filter((reference) => reference.startsWith("github.event."))
      .forEach((reference) => riskyReferences.add(reference));
  }

  return [...riskyReferences].sort();
}

function isUntrustedUsage(expression: WorkflowExpression) {
  return getRiskyReferences(expression).length > 0;
}
