import { createFindingId } from "@/features/actions-analyzer/lib/scoring";
import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import type {
  AnalyzerFinding,
  FindingCategory,
  FindingConfidence,
  RuleDefinition,
  Severity,
  SourceLocation,
  SuggestedFix,
} from "@/features/actions-analyzer/types";

interface RuleFindingDraft {
  category?: FindingCategory | undefined;
  confidence?: FindingConfidence | undefined;
  docsUrl?: string | undefined;
  evidence?: string | undefined;
  filePath: string;
  fix?: SuggestedFix | undefined;
  id?: string | undefined;
  location?: SourceLocation | undefined;
  message: string;
  relatedJobs?: string[] | undefined;
  relatedSteps?: string[] | undefined;
  remediation?: string | undefined;
  severity?: Severity | undefined;
  tags?: string[] | undefined;
  title?: string | undefined;
}

export function createRuleFinding(
  rule: RuleDefinition | string,
  draft: RuleFindingDraft,
  index = 0,
): AnalyzerFinding {
  const definition =
    typeof rule === "string" ? getRuleDefinition(rule) : rule;

  if (!definition) {
    throw new Error(
      `Cannot create analyzer finding for unknown rule "${String(rule)}".`,
    );
  }

  const line = draft.location?.line ?? 0;
  const column = draft.location?.column ?? 0;

  return {
    id:
      draft.id ??
      createFindingId(draft.filePath, definition.id, line, column, index),
    ruleId: definition.id,
    title: draft.title ?? definition.title,
    message: draft.message,
    severity: draft.severity ?? definition.defaultSeverity,
    category: draft.category ?? definition.category,
    confidence: draft.confidence ?? "high",
    filePath: draft.filePath,
    location: draft.location,
    evidence: draft.evidence,
    remediation: draft.remediation ?? definition.description,
    docsUrl: draft.docsUrl ?? definition.docsUrl,
    tags: Array.from(new Set([...(definition.tags ?? []), ...(draft.tags ?? [])])),
    relatedJobs: draft.relatedJobs ?? [],
    relatedSteps: draft.relatedSteps ?? [],
    fix: draft.fix,
  };
}
