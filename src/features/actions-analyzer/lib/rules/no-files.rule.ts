import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import { ruleCatalogById } from "@/features/actions-analyzer/lib/rule-catalog";
import type { RuleModule } from "@/features/actions-analyzer/types";

export const noFilesRule: RuleModule = {
  definition: ruleCatalogById.GHA900,
  check(context) {
    if (
      context.files.length > 0 ||
      !context.settings.includeEmptyInputFinding
    ) {
      return [];
    }

    return [
      createRuleFinding(
        ruleCatalogById.GHA900,
        {
          evidence: "No workflow files loaded.",
          filePath: "<workspace>",
          message:
            "Paste workflow YAML, upload a file, or load a sample before running analysis.",
          remediation:
            "Add at least one GitHub Actions workflow file to the workspace, then run analysis again.",
          relatedJobs: [],
          relatedSteps: [],
        },
        0,
      ),
    ];
  },
};
