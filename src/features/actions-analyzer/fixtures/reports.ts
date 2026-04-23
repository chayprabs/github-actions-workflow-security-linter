import {
  createFindingId,
  sortFindings,
} from "@/features/actions-analyzer/lib/scoring";
import { defaultAnalyzerSettings } from "@/features/actions-analyzer/lib/settings";
import { buildAnalysisSummary } from "@/features/actions-analyzer/lib/summary";
import type {
  AnalyzerFinding,
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

const sampleFile: WorkflowInputFile = {
  id: "sample-risky-report",
  path: ".github/workflows/release-risky.yml",
  content: `name: Release
on: pull_request_target
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm publish
`,
  sizeBytes: new TextEncoder().encode(`name: Release
on: pull_request_target
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm publish
`).byteLength,
  sourceKind: "sample",
};

const sampleFindings: AnalyzerFinding[] = sortFindings([
  {
    id: createFindingId(sampleFile.path, "GHA201", 7, 9, 0),
    ruleId: "GHA201",
    title: "First-party reference uses a mutable tag",
    message:
      "First-party actions like actions/checkout@v4 commonly use version tags, but strict supply-chain reviews still prefer full SHA pins.",
    severity: "medium",
    category: "supply-chain",
    confidence: "high",
    filePath: sampleFile.path,
    location: {
      filePath: sampleFile.path,
      line: 7,
      column: 9,
      endLine: 7,
      endColumn: 31,
    },
    evidence: "uses: actions/checkout@v4",
    remediation:
      "Replace the mutable tag with a reviewed full commit SHA when your policy requires immutable pins.",
    tags: ["actions", "pinning", "first-party"],
    relatedJobs: ["release"],
    relatedSteps: ["actions/checkout@v4"],
  },
  {
    id: createFindingId(sampleFile.path, "GHA100", 1, 1, 1),
    ruleId: "GHA100",
    title: "Top-level permissions are not declared explicitly",
    message:
      "Declare top-level permissions explicitly so token access remains least-privilege and reviewable.",
    severity: "medium",
    category: "permissions",
    confidence: "high",
    filePath: sampleFile.path,
    evidence: "permissions: <missing>",
    remediation:
      "Add a top-level permissions block and grant only the scopes required by the workflow.",
    tags: ["permissions", "token", "least-privilege"],
    relatedJobs: ["release"],
    relatedSteps: [],
  },
]);

export const emptyAnalysisReport: WorkflowAnalysisReport = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  files: [],
  summary: buildAnalysisSummary([], 0, 0, 0),
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
  settings: defaultAnalyzerSettings,
};

export const sampleAnalysisReport: WorkflowAnalysisReport = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  files: [sampleFile],
  summary: buildAnalysisSummary(sampleFindings, 1, 1, 1),
  findings: sampleFindings,
  ignoredFindings: [],
  actionInventory: [
    {
      action: "actions/checkout",
      filePath: sampleFile.path,
      isPrivileged: false,
      jobId: "release",
      jobName: null,
      kind: "first-party",
      location: {
        filePath: sampleFile.path,
        line: 7,
        column: 9,
        endLine: 7,
        endColumn: 29,
      },
      mutable: true,
      origin: "first-party",
      owner: "actions",
      path: null,
      permissions: {
        broadWriteScopes: [],
        hasIdTokenWrite: false,
        hasWriteAccess: false,
        scopes: [],
        shorthand: null,
        source: "none",
        summary: "Permissions not declared",
        writeScopes: [],
      },
      pinned: false,
      privilegedReasons: [],
      ref: "v4",
      refKind: "major-tag",
      repo: "checkout",
      sourceType: "step",
      stepIndex: 0,
      stepLabel: "step-1",
      uses: "actions/checkout@v4",
      workflowName: "Release",
    },
  ],
  expressionSummary: {
    contexts: [],
    totalExpressions: 0,
    unknownContexts: [],
    untrustedContextUsages: 0,
  },
  permissionSummary: {
    hasTopLevelPermissions: false,
    jobOverrides: [],
    jobRecommendations: [
      {
        copyableYaml: `jobs:
  release:
    permissions:
      contents: write`,
        currentPermissionsSource: "none",
        currentPermissionsYaml: null,
        currentWriteScopes: [],
        filePath: sampleFile.path,
        jobId: "release",
        recommendedPermissions: {
          contents: "write",
        },
        recommendedWriteScopes: ["contents"],
        riskLabel: "high",
        scopeRecommendations: [
          {
            currentAccess: null,
            rationale:
              "Job metadata includes `release`, which often signals release, tag, changelog, or version-bump work that may need repository writes. Review recommended because Authos is using static workflow heuristics, not runtime repository policy.",
            recommendedAccess: "write",
            scope: "contents",
            status: "review-recommended",
          },
        ],
        thirdPartyActions: [],
        trustLevel: "untrusted",
        workflowName: "Release",
      },
    ],
    missingPermissions: [sampleFile.path],
    topLevel: [],
    workflowRecommendations: [
      {
        copyableYaml: `permissions:
  contents: read

jobs:
  release:
    permissions:
      contents: write`,
        currentPermissionsYaml: null,
        currentWriteScopes: [],
        filePath: sampleFile.path,
        recommendedPermissions: {
          contents: "read",
        },
        recommendedWriteScopes: [],
        scopeRecommendations: [
          {
            currentAccess: null,
            rationale:
              "A read-only `contents` baseline is the conservative default for most jobs and supports standard checkout/read access.",
            recommendedAccess: "read",
            scope: "contents",
            status: "not-inferred",
          },
        ],
        trustLevel: "untrusted",
        workflowName: "Release",
      },
    ],
    writeScopes: [],
    scopes: [],
    recommendedPermissions: ["contents: read"],
    warnings: ["Top-level permissions are not declared."],
  },
  securitySummary: {
    criticalFindings: 0,
    highFindings: 0,
    totalFindings: 1,
  },
  triggerSummary: {
    events: ["pull_request_target"],
    details: [
      {
        filePath: sampleFile.path,
        event: "pull_request_target",
        filters: [],
      },
    ],
    manualEvents: [],
    privilegedEvents: ["pull_request_target"],
    releaseEvents: [],
    scheduledEvents: [],
    trustedEvents: [],
    untrustedEvents: ["pull_request_target"],
    usesPullRequestTarget: true,
    usesWorkflowDispatch: false,
    usesSchedule: false,
  },
  matrixSummary: {
    totalJobs: 0,
    maxCombinations: 0,
    warningCount: 0,
    jobs: [],
  },
  attackPaths: [
    {
      id: "ap-001",
      title: "PR head code could run with repository write access",
      description:
        "This `pull_request_target` job checks out pull request head content and still carries repository write access, which could allow untrusted pull request changes to influence a privileged execution path.",
      heuristic:
        "Static heuristic: pull_request_target plus PR head checkout plus a write-capable token.",
      jobIds: ["release"],
      mitigationChecklist: [
        "Move untrusted pull request builds to `pull_request` and keep `pull_request_target` limited to metadata-only automation.",
        "Do not check out pull request head code in a privileged follow-up job.",
        "Reduce job permissions before checkout or shell steps run.",
      ],
      severity: "high",
      relatedRuleIds: ["GHA100", "GHA201", "GHA103", "GHA104"],
      filePaths: [sampleFile.path],
      stepLabels: ["step-1"],
    },
  ],
  settings: defaultAnalyzerSettings,
};
