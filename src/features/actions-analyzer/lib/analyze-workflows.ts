import { buildActionInventory } from "@/features/actions-analyzer/lib/action-inventory";
import { buildAttackPaths } from "@/features/actions-analyzer/lib/attack-paths";
import { expandMatrix } from "@/features/actions-analyzer/lib/expand-matrix";
import {
  buildExpressionSummary,
  collectExpressionsFromWorkflow,
  hydrateWorkflowExpressions,
} from "@/features/actions-analyzer/lib/expression-utils";
import { applyIgnoreComments } from "@/features/actions-analyzer/lib/ignore-comments";
import { normalizeParsedWorkflow } from "@/features/actions-analyzer/lib/normalize-workflow";
import { parseWorkflowYamlFiles } from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import { buildPermissionSummary } from "@/features/actions-analyzer/lib/permission-minimizer";
import { registeredRuleModules } from "@/features/actions-analyzer/lib/rules";
import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import {
  isSecurityPackRuleId,
  summarizeTriggerKinds,
} from "@/features/actions-analyzer/lib/security-utils";
import { resolveAnalyzerSettings } from "@/features/actions-analyzer/lib/settings";
import {
  sortFindings,
  createFindingId,
} from "@/features/actions-analyzer/lib/scoring";
import { buildAnalysisSummary } from "@/features/actions-analyzer/lib/summary";
import type {
  ActionInventoryItem,
  AnalyzerFinding,
  AnalyzerSettings,
  IgnoredFinding,
  MatrixJobSummary,
  MatrixSummary,
  NormalizedWorkflow,
  RuleContext,
  RuleModule,
  SecuritySummary,
  TriggerSummary,
  WorkflowAnalysisReport,
  WorkflowExpression,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

export function analyzeWorkflowFiles(
  files: WorkflowInputFile[],
  settings: Partial<AnalyzerSettings> = {},
): WorkflowAnalysisReport {
  const resolvedSettings = resolveAnalyzerSettings(settings);
  const parsedFiles = parseWorkflowYamlFiles(files);
  const normalizedWorkflows = parsedFiles
    .filter((parsedFile) => parsedFile.isSuccessful)
    .map((parsedFile) => normalizeParsedWorkflow(parsedFile));
  const parseFindings = parsedFiles.flatMap(
    (parsedFile) => parsedFile.parseFindings,
  );
  const expressions = normalizedWorkflows.flatMap((workflow) => {
    const parsedFile = parsedFiles.find(
      (candidate) => candidate.filePath === workflow.filePath,
    );
    const collectedExpressions = collectExpressionsFromWorkflow(workflow);

    return parsedFile
      ? hydrateWorkflowExpressions(
          collectedExpressions,
          parsedFile.sourceMap.findLocationForPath,
        )
      : collectedExpressions;
  });
  const actionInventory = buildActionInventory(normalizedWorkflows);
  const matrixSummary = buildMatrixSummary(
    normalizedWorkflows,
    resolvedSettings,
  );
  const context = createRuleContext({
    actionInventory,
    expressions,
    files,
    matrixSummary,
    normalizedWorkflows,
    parseFindings,
    parsedFiles,
    settings: resolvedSettings,
  });
  const ruleFindings = runRules(
    context,
    applyRuleSettings(registeredRuleModules, resolvedSettings),
  );
  const enabledFindings = filterFindingsBySettings(
    [...parseFindings, ...ruleFindings],
    resolvedSettings,
  );
  const ignoreCommentResult = applyIgnoreComments(files, enabledFindings);
  const findings = finalizeFindings(
    filterFindingsBySettings(
      [...ignoreCommentResult.findings, ...ignoreCommentResult.warnings],
      resolvedSettings,
    ),
  );
  const ignoredFindings = finalizeIgnoredFindings(
    ignoreCommentResult.ignoredFindings,
  );
  const triggerSummary = buildTriggerSummary(normalizedWorkflows);
  const permissionSummary = buildPermissionSummary(
    normalizedWorkflows,
    actionInventory,
  );

  return {
    generatedAt: new Date().toISOString(),
    files,
    summary: buildAnalysisSummary(
      findings,
      files.length,
      normalizedWorkflows.length,
      normalizedWorkflows.reduce(
        (sum, workflow) => sum + workflow.jobs.length,
        0,
      ),
    ),
    findings,
    ignoredFindings,
    actionInventory,
    expressionSummary: buildExpressionSummary(expressions),
    permissionSummary,
    securitySummary: buildSecuritySummary(findings),
    triggerSummary,
    matrixSummary,
    attackPaths: buildAttackPaths({
      actionInventory,
      findings,
      normalizedWorkflows,
    }),
    settings: resolvedSettings,
  };
}

export function createEmptyReport(
  files: WorkflowInputFile[] = [],
  settings: Partial<AnalyzerSettings> = {},
): WorkflowAnalysisReport {
  const resolvedSettings = resolveAnalyzerSettings(settings);

  return {
    generatedAt: new Date().toISOString(),
    files,
    summary: buildAnalysisSummary([], files.length, 0, 0),
    findings: [],
    ignoredFindings: [],
    actionInventory: [],
    expressionSummary: {
      contexts: [],
      totalExpressions: 0,
      unknownContexts: [],
      untrustedContextUsages: 0,
    },
    permissionSummary: {
      hasTopLevelPermissions: false,
      jobOverrides: [],
      jobRecommendations: [],
      missingPermissions: [],
      topLevel: [],
      workflowRecommendations: [],
      writeScopes: [],
      scopes: [],
      recommendedPermissions: [],
      warnings: [],
    },
    securitySummary: {
      criticalFindings: 0,
      highFindings: 0,
      totalFindings: 0,
    },
    triggerSummary: {
      events: [],
      details: [],
      manualEvents: [],
      privilegedEvents: [],
      releaseEvents: [],
      scheduledEvents: [],
      trustedEvents: [],
      untrustedEvents: [],
      usesPullRequestTarget: false,
      usesWorkflowDispatch: false,
      usesSchedule: false,
    },
    matrixSummary: {
      totalJobs: 0,
      maxCombinations: 0,
      warningCount: 0,
      jobs: [],
    },
    attackPaths: [],
    settings: resolvedSettings,
  };
}

export function applyRuleSettings(
  rules: RuleModule[],
  settings: Pick<AnalyzerSettings, "disabledRuleIds" | "enabledRuleIds">,
): RuleModule[] {
  return rules.filter((rule) => isRuleEnabled(rule.definition.id, settings));
}

export function runRules(
  context: RuleContext,
  rules: RuleModule[],
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];

  for (const rule of rules) {
    try {
      findings.push(...rule.check(context));
    } catch {
      continue;
    }
  }

  return findings;
}

export function dedupeFindings(findings: AnalyzerFinding[]): AnalyzerFinding[] {
  const seen = new Set<string>();
  const deduped: AnalyzerFinding[] = [];

  for (const finding of findings) {
    const key = [
      finding.ruleId,
      finding.filePath,
      finding.location?.line ?? 0,
      finding.location?.column ?? 0,
      finding.title,
      finding.message,
      finding.remediation,
    ].join("::");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(finding);
  }

  return deduped;
}

function buildMatrixSummary(
  normalizedWorkflows: NormalizedWorkflow[],
  settings: Pick<AnalyzerSettings, "maxMatrixCombinationsBeforeWarning">,
): MatrixSummary {
  const jobs = normalizedWorkflows.flatMap((workflow) =>
    workflow.jobs.flatMap((job): MatrixJobSummary[] => {
      const matrix = job.strategy?.matrix;

      if (!matrix) {
        return [];
      }

      return [
        {
          filePath: workflow.filePath,
          jobId: job.id,
          jobName: job.name.value,
          location: matrix.location ?? job.strategy?.location ?? job.location,
          ...expandMatrix(matrix, {
            failFast: job.strategy?.failFast.value ?? null,
            maxParallel: job.strategy?.maxParallel.value ?? null,
          }),
        },
      ];
    }),
  );

  return {
    totalJobs: jobs.length,
    maxCombinations: Math.max(
      0,
      ...jobs.map((job) => job.finalCombinationCount ?? 0),
    ),
    warningCount: jobs.filter(
      (job) =>
        job.isUnresolved ||
        (job.finalCombinationCount ?? 0) >
          settings.maxMatrixCombinationsBeforeWarning ||
        (job.finalCombinationCount ?? 0) === 0 ||
        job.excludeEntries.some(
          (entry) => entry.matchedBaseCombinations === 0,
        ) ||
        job.includeEntries.some((entry) => entry.matchedBaseCombinations === 0),
    ).length,
    jobs,
  };
}

function buildSecuritySummary(findings: AnalyzerFinding[]): SecuritySummary {
  const securityFindings = findings.filter((finding) =>
    isSecurityPackRuleId(finding.ruleId),
  );

  return {
    criticalFindings: securityFindings.filter(
      (finding) => finding.severity === "critical",
    ).length,
    highFindings: securityFindings.filter(
      (finding) => finding.severity === "high",
    ).length,
    totalFindings: securityFindings.length,
  };
}

function buildTriggerSummary(
  normalizedWorkflows: NormalizedWorkflow[],
): TriggerSummary {
  return summarizeTriggerKinds(normalizedWorkflows);
}

function createRuleContext({
  actionInventory,
  expressions,
  files,
  matrixSummary,
  normalizedWorkflows,
  parseFindings,
  parsedFiles,
  settings,
}: {
  actionInventory: ActionInventoryItem[];
  expressions: WorkflowExpression[];
  files: WorkflowInputFile[];
  matrixSummary: MatrixSummary;
  normalizedWorkflows: NormalizedWorkflow[];
  parseFindings: AnalyzerFinding[];
  parsedFiles: RuleContext["parsedFiles"];
  settings: AnalyzerSettings;
}): RuleContext {
  return {
    actionInventory,
    expressions,
    files,
    matrixSummary,
    normalizedWorkflows,
    parseFindings,
    parsedFiles,
    settings,
    getExpressions(filePath?: string) {
      return filePath
        ? expressions.filter((expression) => expression.filePath === filePath)
        : expressions;
    },
    getMatrixJobSummary(filePath: string, jobId: string) {
      return matrixSummary.jobs.find(
        (job) => job.filePath === filePath && job.jobId === jobId,
      );
    },
    getParsedFile(filePath: string) {
      return parsedFiles.find((parsedFile) => parsedFile.filePath === filePath);
    },
    getWorkflow(filePath: string) {
      return normalizedWorkflows.find(
        (workflow) => workflow.filePath === filePath,
      );
    },
  };
}

function filterFindingsBySettings(
  findings: AnalyzerFinding[],
  settings: Pick<AnalyzerSettings, "disabledRuleIds" | "enabledRuleIds">,
): AnalyzerFinding[] {
  return findings.filter((finding) => isRuleEnabled(finding.ruleId, settings));
}

function finalizeFindings(findings: AnalyzerFinding[]): AnalyzerFinding[] {
  return sortFindings(
    dedupeFindings(findings).map((finding, index) =>
      hydrateFindingWithDefinition(finding, index),
    ),
  );
}

function finalizeIgnoredFindings(
  ignoredFindings: IgnoredFinding[],
): IgnoredFinding[] {
  const hydrated = ignoredFindings.map((ignoredFinding, index) => ({
    ...ignoredFinding,
    finding: hydrateFindingWithDefinition(ignoredFinding.finding, index),
  }));
  const sortOrder = new Map(
    sortFindings(hydrated.map((ignoredFinding) => ignoredFinding.finding)).map(
      (finding, index) => [finding.id, index],
    ),
  );

  return [...hydrated].sort((left, right) => {
    const leftSortOrder =
      sortOrder.get(left.finding.id) ?? Number.MAX_SAFE_INTEGER;
    const rightSortOrder =
      sortOrder.get(right.finding.id) ?? Number.MAX_SAFE_INTEGER;

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }

    return left.line - right.line;
  });
}

function hydrateFindingWithDefinition(
  finding: AnalyzerFinding,
  index: number,
): AnalyzerFinding {
  const definition = getRuleDefinition(finding.ruleId);
  const location = finding.location;
  const line = location?.line ?? 0;
  const column = location?.column ?? 0;

  return {
    ...finding,
    id:
      finding.id ||
      createFindingId(finding.filePath, finding.ruleId, line, column, index),
    title: finding.title || definition?.title || finding.ruleId,
    severity: finding.severity ?? definition?.defaultSeverity ?? "info",
    category: finding.category ?? definition?.category ?? "maintainability",
    remediation:
      finding.remediation ?? definition?.description ?? "Review this finding.",
    confidence: finding.confidence ?? "high",
    docsUrl: finding.docsUrl ?? definition?.docsUrl,
    tags: Array.from(
      new Set([...(definition?.tags ?? []), ...(finding.tags ?? [])]),
    ),
    relatedJobs: finding.relatedJobs ?? [],
    relatedSteps: finding.relatedSteps ?? [],
  };
}

function isRuleEnabled(
  ruleId: string,
  settings: Pick<AnalyzerSettings, "disabledRuleIds" | "enabledRuleIds">,
): boolean {
  const enabledRuleIds = settings.enabledRuleIds ?? [];
  const disabledRuleIds = settings.disabledRuleIds ?? [];

  if (enabledRuleIds.length > 0 && !enabledRuleIds.includes(ruleId)) {
    return false;
  }

  return !disabledRuleIds.includes(ruleId);
}
