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
      - uses: actions/checkout@main
      - run: npm publish
`,
  sizeBytes: new TextEncoder().encode(`name: Release
on: pull_request_target
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - run: npm publish
`).byteLength,
  sourceKind: "sample",
};

const sampleFindings: AnalyzerFinding[] = sortFindings([
  {
    id: createFindingId(sampleFile.path, "GHA201", 7, 9, 0),
    ruleId: "GHA201",
    title: "Action uses a floating ref",
    message:
      "Avoid floating refs for actions. Pin to an immutable commit SHA or a trusted release tag.",
    severity: "high",
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
    evidence: "uses: actions/checkout@main",
    remediation:
      "Replace the floating ref with a commit SHA or a vetted immutable release reference.",
    tags: ["actions", "pinning", "supply-chain"],
    relatedJobs: ["release"],
    relatedSteps: ["actions/checkout@main"],
  },
  {
    id: createFindingId(sampleFile.path, "GHA101", 1, 1, 1),
    ruleId: "GHA101",
    title: "Top-level permissions are not declared",
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
  summary: buildAnalysisSummary([], 0, 0),
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
  settings: defaultAnalyzerSettings,
};

export const sampleAnalysisReport: WorkflowAnalysisReport = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  files: [sampleFile],
  summary: buildAnalysisSummary(sampleFindings, 1, 1),
  findings: sampleFindings,
  actionInventory: [
    {
      action: "actions/checkout",
      filePath: sampleFile.path,
      uses: "actions/checkout@main",
      ref: "main",
      isPinnedToSha: false,
      relatedJobs: ["release"],
      relatedSteps: ["actions/checkout@main"],
    },
  ],
  permissionSummary: {
    hasTopLevelPermissions: false,
    scopes: [],
    recommendedPermissions: ["contents: read"],
    warnings: ["Top-level permissions are not declared."],
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
    usesPullRequestTarget: true,
    usesWorkflowDispatch: false,
    usesSchedule: false,
  },
  matrixSummary: {
    totalJobs: 0,
    maxCombinations: 0,
    jobs: [],
  },
  attackPaths: [
    {
      id: "ap-001",
      title: "Untrusted code can influence privileged workflow execution",
      description:
        "The workflow uses pull_request_target with an unpinned third-party action, increasing the blast radius of upstream changes.",
      severity: "high",
      relatedRuleIds: ["GHA101", "GHA201"],
      filePaths: [sampleFile.path],
    },
  ],
  settings: defaultAnalyzerSettings,
};
