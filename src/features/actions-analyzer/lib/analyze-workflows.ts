import { buildActionInventory } from "@/features/actions-analyzer/lib/action-inventory";
import {
  buildExpressionSummary,
  collectExpressionsFromWorkflow,
  hydrateWorkflowExpressions,
} from "@/features/actions-analyzer/lib/expression-utils";
import { normalizeParsedWorkflow } from "@/features/actions-analyzer/lib/normalize-workflow";
import { parseWorkflowYamlFiles } from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import { registeredRuleModules } from "@/features/actions-analyzer/lib/rules";
import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import {
  buildPermissionDeclarationSummary,
  getBroadWriteScopes,
  isSecurityPackRuleId,
  summarizeTriggerKinds,
  toPermissionScopes,
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
  MatrixJobSummary,
  MatrixSummary,
  NormalizedWorkflow,
  PermissionSummary,
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
  const context = createRuleContext({
    actionInventory,
    expressions,
    files,
    normalizedWorkflows,
    parseFindings,
    parsedFiles,
    settings: resolvedSettings,
  });
  const ruleFindings = runRules(
    context,
    applyRuleSettings(registeredRuleModules, resolvedSettings),
  );
  const findings = finalizeFindings(
    filterFindingsBySettings(
      [...parseFindings, ...ruleFindings],
      resolvedSettings,
    ),
  );
  const triggerSummary = buildTriggerSummary(normalizedWorkflows);
  const permissionSummary = buildPermissionSummary(normalizedWorkflows);
  const matrixSummary = buildMatrixSummaryPlaceholder(normalizedWorkflows);

  return {
    generatedAt: new Date().toISOString(),
    files,
    summary: buildAnalysisSummary(
      findings,
      files.length,
      normalizedWorkflows.length,
    ),
    findings,
    actionInventory,
    expressionSummary: buildExpressionSummary(expressions),
    permissionSummary,
    securitySummary: buildSecuritySummary(findings),
    triggerSummary,
    matrixSummary,
    attackPaths: [],
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
    summary: buildAnalysisSummary([], files.length, 0),
    findings: [],
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
      missingPermissions: [],
      topLevel: [],
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
    } catch (error) {
      console.error(
        `Authos rule ${rule.definition.id} failed during analysis.`,
        error,
      );
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

function buildMatrixSummaryPlaceholder(
  normalizedWorkflows: NormalizedWorkflow[],
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
          jobName: job.id,
          dimensions: Object.keys(matrix.dimensions),
          combinations: estimateMatrixCombinations(matrix),
        },
      ];
    }),
  );

  return {
    totalJobs: jobs.length,
    maxCombinations: Math.max(0, ...jobs.map((job) => job.combinations)),
    jobs,
  };
}

function buildPermissionSummary(
  normalizedWorkflows: NormalizedWorkflow[],
): PermissionSummary {
  const jobOverrides = normalizedWorkflows.flatMap((workflow) =>
    workflow.jobs.flatMap((job) => {
      return job.permissions
        ? [
            buildPermissionDeclarationSummary(
              workflow.filePath,
              job.permissions,
              "job",
              job.id,
            ),
          ]
        : [];
    }),
  );
  const missingPermissions = normalizedWorkflows
    .filter((workflow) => workflow.permissions === null)
    .map((workflow) => workflow.filePath);
  const scopes = normalizedWorkflows.flatMap((workflow) => [
    ...(workflow.permissions
      ? toPermissionScopes(workflow.filePath, workflow.permissions, "top-level")
      : []),
    ...workflow.jobs.flatMap((job) =>
      job.permissions
        ? toPermissionScopes(workflow.filePath, job.permissions, "job", job.id)
        : [],
    ),
  ]);
  const topLevel = normalizedWorkflows.flatMap((workflow) =>
    workflow.permissions
      ? [
          buildPermissionDeclarationSummary(
            workflow.filePath,
            workflow.permissions,
            "top-level",
          ),
        ]
      : [],
  );
  const writeScopes = normalizedWorkflows.flatMap((workflow) => [
    ...topLevelWriteScopes(workflow),
    ...workflow.jobs.flatMap((job) =>
      (job.permissions ? getBroadWriteScopes(job.permissions) : []).map(
        (scope) => ({
          access: "write",
          filePath: workflow.filePath,
          jobName: job.id,
          location: job.permissions?.scopeLocations[scope] ?? job.permissions?.location,
          scope,
          source: "job" as const,
        }),
      ),
    ),
  ]);
  const warnings: string[] = [];

  for (const workflow of normalizedWorkflows) {
    if (!workflow.permissions) {
      warnings.push(
        `${workflow.filePath} does not declare top-level permissions.`,
      );
    }
  }

  return {
    hasTopLevelPermissions: normalizedWorkflows.some(
      (workflow) => workflow.permissions !== null,
    ),
    jobOverrides,
    missingPermissions,
    topLevel,
    writeScopes,
    scopes,
    recommendedPermissions:
      normalizedWorkflows.length > 0 &&
      normalizedWorkflows.some((workflow) => workflow.permissions === null)
        ? ["contents: read"]
        : [],
    warnings,
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
  normalizedWorkflows,
  parseFindings,
  parsedFiles,
  settings,
}: {
  actionInventory: ActionInventoryItem[];
  expressions: WorkflowExpression[];
  files: WorkflowInputFile[];
  normalizedWorkflows: NormalizedWorkflow[];
  parseFindings: AnalyzerFinding[];
  parsedFiles: RuleContext["parsedFiles"];
  settings: AnalyzerSettings;
}): RuleContext {
  return {
    actionInventory,
    expressions,
    files,
    normalizedWorkflows,
    parseFindings,
    parsedFiles,
    settings,
    getExpressions(filePath?: string) {
      return filePath
        ? expressions.filter((expression) => expression.filePath === filePath)
        : expressions;
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

function estimateDimensionCardinality(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === "string" || typeof value === "number") {
    return 1;
  }

  return 0;
}

function estimateMatrixCombinations(
  matrix: NonNullable<
    NonNullable<NormalizedWorkflow["jobs"][number]["strategy"]>["matrix"]
  >,
): number {
  const base = Object.values(matrix.dimensions).reduce<number>(
    (product, value) => {
      const cardinality = estimateDimensionCardinality(value);

      return cardinality > 0 ? product * cardinality : product;
    },
    1,
  );
  const adjustedBase =
    Object.keys(matrix.dimensions).length > 0
      ? Math.max(0, base - matrix.exclude.length)
      : 0;

  return adjustedBase + matrix.include.length;
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

function topLevelWriteScopes(workflow: NormalizedWorkflow) {
  if (!workflow.permissions) {
    return [];
  }

  return getBroadWriteScopes(workflow.permissions).map((scope) => ({
    access: "write",
    filePath: workflow.filePath,
    location:
      workflow.permissions?.scopeLocations[scope] ??
      workflow.permissions?.location,
    scope,
    source: "top-level" as const,
  }));
}
