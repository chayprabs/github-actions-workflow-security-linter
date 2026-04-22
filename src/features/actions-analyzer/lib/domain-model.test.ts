import { describe, expect, it } from "vitest";

import {
  createFindingId,
  calculateScore,
  gradeFromScore,
  severityWeights,
  sortFindings,
} from "@/features/actions-analyzer/lib/scoring";
import {
  defaultAnalyzerSettings,
  resolveAnalyzerSettings,
} from "@/features/actions-analyzer/lib/settings";
import type { AnalyzerFinding } from "@/features/actions-analyzer/types";

function createTestFinding(
  overrides: Partial<AnalyzerFinding>,
): AnalyzerFinding {
  const filePath = overrides.filePath ?? ".github/workflows/test.yml";
  const line = overrides.location?.line ?? 1;
  const column = overrides.location?.column ?? 1;
  const ruleId = overrides.ruleId ?? "GHA101";
  const id = overrides.id ?? createFindingId(filePath, ruleId, line, column, 0);

  return {
    id,
    ruleId,
    title: overrides.title ?? "Test finding",
    message: overrides.message ?? "Test message",
    severity: overrides.severity ?? "medium",
    category: overrides.category ?? "permissions",
    confidence: overrides.confidence ?? "high",
    filePath,
    location: overrides.location,
    evidence: overrides.evidence,
    remediation: overrides.remediation ?? "Test remediation",
    docsUrl: overrides.docsUrl,
    tags: overrides.tags ?? [],
    relatedJobs: overrides.relatedJobs ?? [],
    relatedSteps: overrides.relatedSteps ?? [],
    fix: overrides.fix,
  };
}

describe("severityWeights", () => {
  it("matches the reserved analyzer score weights", () => {
    expect(severityWeights).toEqual({
      critical: 20,
      high: 10,
      medium: 5,
      low: 2,
      info: 0.5,
    });
  });
});

describe("calculateScore", () => {
  it("returns 100 for a clean finding set", () => {
    expect(calculateScore([])).toBe(100);
  });

  it("subtracts weighted penalties and caps at zero", () => {
    const score = calculateScore([
      createTestFinding({ severity: "critical" }),
      createTestFinding({ severity: "high", ruleId: "GHA201" }),
      createTestFinding({ severity: "medium", ruleId: "GHA401" }),
      createTestFinding({ severity: "low", ruleId: "GHA500" }),
      createTestFinding({ severity: "info", ruleId: "GHA900" }),
    ]);

    expect(score).toBe(62.5);
    expect(
      calculateScore(
        Array.from({ length: 20 }, (_, index) =>
          createTestFinding({
            severity: "critical",
            ruleId: `GHA9${index.toString().padStart(2, "0")}`,
          }),
        ),
      ),
    ).toBe(0);
  });
});

describe("gradeFromScore", () => {
  it("maps numeric scores to A through F grades", () => {
    expect(gradeFromScore(95)).toBe("A");
    expect(gradeFromScore(85)).toBe("B");
    expect(gradeFromScore(75)).toBe("C");
    expect(gradeFromScore(65)).toBe("D");
    expect(gradeFromScore(59.9)).toBe("F");
  });
});

describe("sortFindings", () => {
  it("orders findings by severity, then file path, then location", () => {
    const findings = [
      createTestFinding({
        id: "4",
        severity: "medium",
        filePath: ".github/workflows/zeta.yml",
        location: {
          filePath: ".github/workflows/zeta.yml",
          line: 8,
          column: 1,
          endLine: 8,
          endColumn: 12,
        },
      }),
      createTestFinding({
        id: "2",
        severity: "critical",
        filePath: ".github/workflows/beta.yml",
        location: {
          filePath: ".github/workflows/beta.yml",
          line: 9,
          column: 1,
          endLine: 9,
          endColumn: 12,
        },
      }),
      createTestFinding({
        id: "1",
        severity: "critical",
        filePath: ".github/workflows/alpha.yml",
        location: {
          filePath: ".github/workflows/alpha.yml",
          line: 4,
          column: 3,
          endLine: 4,
          endColumn: 10,
        },
      }),
      createTestFinding({
        id: "3",
        severity: "critical",
        filePath: ".github/workflows/alpha.yml",
        location: {
          filePath: ".github/workflows/alpha.yml",
          line: 10,
          column: 1,
          endLine: 10,
          endColumn: 5,
        },
      }),
    ];

    expect(sortFindings(findings).map((finding) => finding.id)).toEqual([
      "1",
      "3",
      "2",
      "4",
    ]);
  });
});

describe("defaultAnalyzerSettings", () => {
  it("ships with stable balanced defaults", () => {
    expect(defaultAnalyzerSettings).toEqual({
      profile: "balanced",
      requireShaPinning: true,
      warnOnMissingTopLevelPermissions: true,
      allowSelfHostedOnPullRequest: false,
      maxMatrixCombinationsBeforeWarning: 16,
      detectSecretsInInput: true,
    });
  });

  it("merges overrides without dropping optional rule lists", () => {
    expect(
      resolveAnalyzerSettings({
        profile: "open-source",
        enabledRuleIds: ["GHA101", "GHA201"],
      }),
    ).toEqual({
      ...defaultAnalyzerSettings,
      profile: "open-source",
      enabledRuleIds: ["GHA101", "GHA201"],
    });
  });
});

describe("createFindingId", () => {
  it("creates deterministic ids from file path, rule, and location", () => {
    expect(
      createFindingId(
        ".github\\workflows\\Release Flow.yml",
        "GHA201",
        7,
        9,
        2,
      ),
    ).toBe("GHA201:github/workflows/release-flowyml:7:9:2");
  });
});
