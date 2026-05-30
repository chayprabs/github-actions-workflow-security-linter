import { createFindingId } from "@/features/actions-analyzer/lib/scoring";
import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import {
  createSourceLocationFromOffset,
  getLineStarts,
} from "@/features/actions-analyzer/lib/source-location-utils";
import { normalizeWorkflowPath } from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  AnalyzerFinding,
  IgnoredFinding,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

const ignoreCommentPattern =
  /#\s*(?:gha|authos)-ignore\s+([A-Za-z]{3}\d{3})(?:\s*:(.*))?/u;

const WORKFLOW_SCOPED_IGNORE_RULES = new Set([
  "GHA004",
  "GHA005",
  "GHA006",
  "GHA013",
  "GHA100",
]);

const META_MAINTENANCE_RULE_IDS = new Set(["GHA901", "GHA902"]);

interface IgnoreDirective {
  comment: string;
  filePath: string;
  line: number;
  reason: string;
  ruleId: string;
  targetLines: number[];
}

export function applyIgnoreComments(
  files: WorkflowInputFile[],
  findings: AnalyzerFinding[],
) {
  const warnings: AnalyzerFinding[] = [];
  const directives = files.flatMap((file) =>
    parseIgnoreDirectives(file, warnings),
  );
  const ignoredIds = new Set<string>();
  const ignoredFindings: IgnoredFinding[] = [];

  for (const directive of directives) {
    const matchLines = getMatchLinesForRule(directive);

    const matchingFindings = findings.filter((finding) => {
      if (
        ignoredIds.has(finding.id) ||
        finding.ruleId !== directive.ruleId ||
        !finding.location ||
        normalizeWorkflowPath(finding.filePath).toLowerCase() !==
          normalizeWorkflowPath(directive.filePath).toLowerCase()
      ) {
        return false;
      }

      return matchLines.some((targetLine) =>
        linesOverlap(
          finding.location!.line,
          finding.location!.endLine,
          targetLine,
        ),
      );
    });

    for (const matchingFinding of matchingFindings) {
      ignoredIds.add(matchingFinding.id);
      ignoredFindings.push({
        comment: directive.comment,
        finding: matchingFinding,
        line: directive.line,
        reason: directive.reason,
      });
    }
  }

  return {
    findings: findings.filter((finding) => !ignoredIds.has(finding.id)),
    ignoredFindings,
    warnings,
  };
}

export function isMetaMaintenanceRuleId(ruleId: string) {
  return META_MAINTENANCE_RULE_IDS.has(ruleId);
}

function getMatchLinesForRule(directive: IgnoreDirective) {
  if (WORKFLOW_SCOPED_IGNORE_RULES.has(directive.ruleId)) {
    return directive.targetLines;
  }

  return directive.targetLines.slice(0, 1);
}

function linesOverlap(
  findingStartLine: number,
  findingEndLine: number,
  targetLine: number,
) {
  return findingStartLine <= targetLine && findingEndLine >= targetLine;
}

function parseIgnoreDirectives(
  file: WorkflowInputFile,
  warnings: AnalyzerFinding[],
): IgnoreDirective[] {
  const lines = file.content.split(/\r?\n/u);
  const lineStarts = getLineStarts(file.content);
  const directives: IgnoreDirective[] = [];

  lines.forEach((line, index) => {
    const match = ignoreCommentPattern.exec(line);

    if (!match || match.index === undefined) {
      return;
    }

    const ruleId = match[1]?.toUpperCase();
    const reason = match[2]?.trim() ?? "";
    const comment = match[0];
    const location = createSourceLocationFromOffset(
      file.path,
      file.content,
      (lineStarts[index] ?? 0) + match.index,
    );

    if (!ruleId || reason.length === 0) {
      warnings.push(
        createIgnoreCommentWarning(file.path, file.content, comment, location),
      );
      return;
    }

    const hasInlineContent = line.slice(0, match.index).trim().length > 0;
    const targetLines = hasInlineContent
      ? [index + 1]
      : buildTargetLines(lines, index, ruleId);

    directives.push({
      comment,
      filePath: file.path,
      line: index + 1,
      reason,
      ruleId,
      targetLines,
    });
  });

  return directives;
}

function buildTargetLines(
  lines: string[],
  commentLineIndex: number,
  ruleId: string,
) {
  if (WORKFLOW_SCOPED_IGNORE_RULES.has(ruleId)) {
    return collectTargetLines(lines, commentLineIndex);
  }

  const nextLine = findNextRelevantLine(lines, commentLineIndex);

  return nextLine === null ? [] : [nextLine];
}

function collectTargetLines(lines: string[], commentLineIndex: number) {
  const targetLines: number[] = [];

  for (let index = commentLineIndex + 1; index < lines.length; index += 1) {
    const trimmedLine = lines[index]?.trim() ?? "";

    if (trimmedLine.length === 0) {
      if (targetLines.length > 0) {
        break;
      }
      continue;
    }

    if (trimmedLine.startsWith("#") && !ignoreCommentPattern.test(trimmedLine)) {
      if (targetLines.length > 0) {
        break;
      }
      continue;
    }

    targetLines.push(index + 1);

    if (targetLines.length >= 16) {
      break;
    }
  }

  if (targetLines.length === 0) {
    const fallbackLine = findNextRelevantLine(lines, commentLineIndex);

    if (fallbackLine !== null) {
      targetLines.push(fallbackLine);
    }
  }

  return targetLines;
}

function createIgnoreCommentWarning(
  filePath: string,
  content: string,
  comment: string,
  location: ReturnType<typeof createSourceLocationFromOffset>,
): AnalyzerFinding {
  const definition = getRuleDefinition("GHA901");

  if (!definition) {
    throw new Error('Missing rule definition for "GHA901".');
  }

  return {
    id: createFindingId(
      filePath,
      definition.id,
      location.line,
      location.column,
      0,
    ),
    ruleId: definition.id,
    title: definition.title,
    message:
      "Ignore comments must include a reason after a colon so reviewers can understand why the finding is being suppressed.",
    severity: definition.defaultSeverity,
    category: definition.category,
    confidence: "high",
    filePath,
    location,
    evidence: comment,
    remediation:
      "Add a short reason after the rule id, for example `# gha-ignore GHA200: internal action is pinned elsewhere`.",
    docsUrl: definition.docsUrl,
    tags: definition.tags,
    relatedJobs: [],
    relatedSteps: [],
  };
}

function findNextRelevantLine(lines: string[], currentIndex: number) {
  for (let index = currentIndex + 1; index < lines.length; index += 1) {
    const trimmedLine = lines[index]?.trim() ?? "";

    if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
      continue;
    }

    return index + 1;
  }

  return null;
}
