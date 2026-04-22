import { normalizeParsedWorkflow } from "@/features/actions-analyzer/lib/normalize-workflow";
import { parseWorkflowYamlFiles } from "@/features/actions-analyzer/lib/parse-workflow-yaml";
import { registeredRuleModules } from "@/features/actions-analyzer/lib/rules";
import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import { resolveAnalyzerSettings } from "@/features/actions-analyzer/lib/settings";
import { sortFindings, createFindingId } from "@/features/actions-analyzer/lib/scoring";
import { buildAnalysisSummary } from "@/features/actions-analyzer/lib/summary";
import type {
  ActionInventoryItem,
  AnalyzerFinding,
  AnalyzerSettings,
  MatrixJobSummary,
  MatrixSummary,
  NormalizedWorkflow,
  PermissionScopeSummary,
  PermissionSummary,
  RuleContext,
  RuleModule,
  TriggerDetail,
  TriggerSummary,
  WorkflowActionUse,
  WorkflowAnalysisReport,
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
  const parseFindings = parsedFiles.flatMap((parsedFile) => parsedFile.parseFindings);
  const context = createRuleContext({
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
    filterFindingsBySettings([...parseFindings, ...ruleFindings], resolvedSettings),
  );
  const actionInventory = buildActionInventoryPlaceholder(normalizedWorkflows);
  const triggerSummary = buildTriggerSummaryPlaceholder(normalizedWorkflows);
  const permissionSummary =
    buildPermissionSummaryPlaceholder(normalizedWorkflows);
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
    permissionSummary,
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
    permissionSummary: {
      hasTopLevelPermissions: false,
      scopes: [],
      recommendedPermissions: [],
      warnings: [],
    },
    triggerSummary: {
      events: [],
      details: [],
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

export function dedupeFindings(
  findings: AnalyzerFinding[],
): AnalyzerFinding[] {
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

function buildActionInventoryPlaceholder(
  normalizedWorkflows: NormalizedWorkflow[],
): ActionInventoryItem[] {
  return normalizedWorkflows.flatMap((workflow) =>
    workflow.jobs.flatMap((job) =>
      job.steps.flatMap((step) => {
        if (!step.uses) {
          return [];
        }

        const ref =
          step.uses.kind === "docker-action"
            ? step.uses.digest ?? step.uses.tag
            : step.uses.ref;

        return [
          {
            action: getActionInventoryName(step.uses),
            filePath: workflow.filePath,
            uses: step.uses.raw,
            ref: ref ?? null,
            isPinnedToSha: isPinnedActionUse(step.uses),
            relatedJobs: [job.id],
            relatedSteps: [
              step.id.value ??
                step.name.value ??
                `step-${step.index + 1}`,
            ],
          },
        ];
      }),
    ),
  );
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

function buildPermissionSummaryPlaceholder(
  normalizedWorkflows: NormalizedWorkflow[],
): PermissionSummary {
  const scopes: PermissionScopeSummary[] = [];
  const warnings: string[] = [];

  for (const workflow of normalizedWorkflows) {
    if (!workflow.permissions) {
      warnings.push(
        `${workflow.filePath} does not declare top-level permissions.`,
      );
    } else {
      scopes.push(
        ...toPermissionScopes(workflow.filePath, workflow.permissions, "top-level"),
      );
    }

    for (const job of workflow.jobs) {
      if (!job.permissions) {
        continue;
      }

      scopes.push(
        ...toPermissionScopes(
          workflow.filePath,
          job.permissions,
          "job",
          job.id,
        ),
      );
    }
  }

  return {
    hasTopLevelPermissions: normalizedWorkflows.some(
      (workflow) => workflow.permissions !== null,
    ),
    scopes,
    recommendedPermissions:
      normalizedWorkflows.length > 0 &&
      normalizedWorkflows.some((workflow) => workflow.permissions === null)
        ? ["contents: read"]
        : [],
    warnings,
  };
}

function buildTriggerSummaryPlaceholder(
  normalizedWorkflows: NormalizedWorkflow[],
): TriggerSummary {
  const details = normalizedWorkflows.flatMap((workflow) =>
    workflow.on.map(
      (trigger): TriggerDetail => ({
        filePath: workflow.filePath,
        event: trigger.name,
        filters: getTriggerFilterLabels(trigger),
      }),
    ),
  );
  const events = Array.from(new Set(details.map((detail) => detail.event))).sort();

  return {
    events,
    details,
    usesPullRequestTarget: events.includes("pull_request_target"),
    usesWorkflowDispatch: events.includes("workflow_dispatch"),
    usesSchedule: events.includes("schedule"),
  };
}

function createRuleContext({
  files,
  normalizedWorkflows,
  parseFindings,
  parsedFiles,
  settings,
}: {
  files: WorkflowInputFile[];
  normalizedWorkflows: NormalizedWorkflow[];
  parseFindings: AnalyzerFinding[];
  parsedFiles: RuleContext["parsedFiles"];
  settings: AnalyzerSettings;
}): RuleContext {
  return {
    files,
    normalizedWorkflows,
    parseFindings,
    parsedFiles,
    settings,
    getParsedFile(filePath: string) {
      return parsedFiles.find((parsedFile) => parsedFile.filePath === filePath);
    },
    getWorkflow(filePath: string) {
      return normalizedWorkflows.find((workflow) => workflow.filePath === filePath);
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
  const base = Object.values(matrix.dimensions).reduce((product, value) => {
    const cardinality = estimateDimensionCardinality(value);

    return cardinality > 0 ? product * cardinality : product;
  }, 1);
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

function getActionInventoryName(uses: WorkflowActionUse): string {
  if (uses.kind === "repository-action") {
    return [uses.owner, uses.repo, uses.path].filter(Boolean).join("/");
  }

  if (uses.kind === "docker-action") {
    return uses.image ?? uses.raw;
  }

  if (uses.kind === "local-action") {
    return uses.path ?? uses.raw;
  }

  return uses.raw;
}

function getTriggerFilterLabels(trigger: NormalizedWorkflow["on"][number]): string[] {
  const labels: string[] = [];

  if (trigger.branches.length > 0) {
    labels.push("branches");
  }

  if (trigger.branchesIgnore.length > 0) {
    labels.push("branches-ignore");
  }

  if (trigger.paths.length > 0) {
    labels.push("paths");
  }

  if (trigger.pathsIgnore.length > 0) {
    labels.push("paths-ignore");
  }

  if (trigger.tags.length > 0) {
    labels.push("tags");
  }

  if (trigger.tagsIgnore.length > 0) {
    labels.push("tags-ignore");
  }

  if (trigger.types.length > 0) {
    labels.push("types");
  }

  if (trigger.workflows.length > 0) {
    labels.push("workflows");
  }

  if (trigger.schedules.length > 0) {
    labels.push("schedule");
  }

  if (Object.keys(trigger.inputs).length > 0) {
    labels.push("inputs");
  }

  labels.push(...Object.keys(trigger.additionalFilters));

  return labels;
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

function isPinnedActionUse(uses: WorkflowActionUse): boolean {
  if (uses.kind === "docker-action") {
    return uses.digest !== null;
  }

  if (uses.kind === "repository-action") {
    return uses.ref !== null && /^[a-f0-9]{40}$/iu.test(uses.ref);
  }

  return false;
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

function toPermissionScopes(
  filePath: string,
  permissions: NonNullable<NormalizedWorkflow["permissions"]>,
  source: PermissionScopeSummary["source"],
  jobName?: string,
): PermissionScopeSummary[] {
  if (permissions.kind === "shorthand" && permissions.shorthand) {
    return [
      {
        filePath,
        scope: "*",
        access: permissions.shorthand,
        source,
        jobName,
      },
    ];
  }

  if (permissions.kind !== "mapping") {
    return [];
  }

  return Object.entries(permissions.scopes).map(([scope, access]) => ({
    filePath,
    scope,
    access: String(access),
    source,
    jobName,
  }));
}
