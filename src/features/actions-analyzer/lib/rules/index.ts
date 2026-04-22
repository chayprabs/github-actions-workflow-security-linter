import type { RuleModule } from "@/features/actions-analyzer/types";

import { noFilesRule } from "@/features/actions-analyzer/lib/rules/no-files.rule";

export const registeredRuleModules: RuleModule[] = [noFilesRule];
