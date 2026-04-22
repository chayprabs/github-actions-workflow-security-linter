import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import type {
  RuleDefinition,
  RuleModule,
} from "@/features/actions-analyzer/types";

const noFilesRuleDefinition = requireRuleDefinition("GHA900");

export const noFilesRule: RuleModule = {
  definition: noFilesRuleDefinition,
  check(context) {
    if (
      context.files.length > 0 ||
      !context.settings.includeEmptyInputFinding
    ) {
      return [];
    }

    return [
      createRuleFinding(
        noFilesRuleDefinition,
        {
          evidence: "No workflow files loaded.",
          filePath: "<workspace>",
          message:
            "Paste workflow YAML, upload a file, or load a sample before running analysis.",
          remediation:
            "Add at least one GitHub Actions workflow file to the workspace, then run analysis again.",
        },
        0,
      ),
    ];
  },
};

function requireRuleDefinition(ruleId: string): RuleDefinition {
  const definition = getRuleDefinition(ruleId);

  if (!definition) {
    throw new Error(`Missing rule definition for ${ruleId}.`);
  }

  return definition;
}
