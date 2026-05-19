import { describe, expect, it } from "vitest";

import {
  GitHubImportError,
  parseGitHubUrl,
} from "@/features/actions-analyzer/lib/github-import";
import { parseAnalyzerShareState } from "@/features/actions-analyzer/lib/report-share";
import { compressToEncodedURIComponent } from "lz-string";

import { decodeWorkflowSharePayload } from "@/features/actions-analyzer/lib/report-share-payload";
import {
  normalizeWorkflowPath,
  validateWorkflowFileSelection,
} from "@/features/actions-analyzer/lib/workflow-input-utils";
import { readStoredAnalysisHistory } from "@/features/actions-analyzer/lib/analysis-history";

describe("GitHub import URL inputs", () => {
  it("rejects empty and whitespace-only URLs", () => {
    for (const input of ["", "   ", "\n\t"]) {
      expect(() => parseGitHubUrl(input)).toThrow(GitHubImportError);
      expect(() => parseGitHubUrl(input)).toThrow(/public GitHub/i);
    }
  });

  it("rejects non-HTTPS and unsupported hosts", () => {
    expect(() =>
      parseGitHubUrl(
        "http://github.com/octo-org/example-repo/blob/main/.github/workflows/ci.yml",
      ),
    ).toThrow(/HTTPS/i);

    expect(() =>
      parseGitHubUrl("https://github.enterprise.com/octo/repo"),
    ).toThrow(/github.com/i);
  });

  it("rejects blob URLs outside .github/workflows", () => {
    expect(() =>
      parseGitHubUrl(
        "https://github.com/octo-org/example-repo/blob/main/README.md",
      ),
    ).toThrow(/\.github\/workflows/i);
  });

  it("rejects malformed URLs", () => {
    expect(() => parseGitHubUrl("not-a-url")).toThrow(GitHubImportError);
  });
});

describe("workflow path normalization", () => {
  it("normalizes backslashes and leading slashes", () => {
    expect(normalizeWorkflowPath("\\.github\\workflows\\ci.yml")).toBe(
      ".github/workflows/ci.yml",
    );
    expect(normalizeWorkflowPath("///.github/workflows/ci.yml")).toBe(
      ".github/workflows/ci.yml",
    );
  });

  it("preserves unicode in paths without traversal tricks", () => {
    expect(normalizeWorkflowPath(".github/workflows/日本語.yml")).toBe(
      ".github/workflows/日本語.yml",
    );
  });
});

describe("share URL query parameters", () => {
  it("ignores invalid severity and rule filters", () => {
    const state = parseAnalyzerShareState(
      "?sev=not-a-severity,critical&rulesOff=GHA20,GHA1234,not-a-rule,GHA201",
    );

    expect(state.results?.selectedSeverities).toEqual(["critical"]);
    expect(state.disabledRuleIds).toEqual(["GHA201"]);
  });

  it("parses boolean analyzer settings from query strings", () => {
    const state = parseAnalyzerShareState(
      "?requireShaPinning=false&maxMatrixCombinationsBeforeWarning=32",
    );

    expect(state.settings).toMatchObject({
      requireShaPinning: false,
      maxMatrixCombinationsBeforeWarning: 32,
    });
  });

  it("ignores NaN numeric settings", () => {
    const state = parseAnalyzerShareState(
      "?maxMatrixCombinationsBeforeWarning=not-a-number",
    );

    expect(state.settings?.maxMatrixCombinationsBeforeWarning).toBeUndefined();
  });
});

describe("share payload encoding", () => {
  it("returns null for malformed compressed payloads", () => {
    expect(decodeWorkflowSharePayload("not-valid-lz")).toBeNull();
    expect(decodeWorkflowSharePayload("")).toBeNull();
  });

  it("returns null when files array is missing or invalid", () => {
    function encodeRaw(value: unknown) {
      return compressToEncodedURIComponent(JSON.stringify(value));
    }

    expect(decodeWorkflowSharePayload(encodeRaw({ files: "bad" }))).toBeNull();
    expect(decodeWorkflowSharePayload(encodeRaw({ files: [] }))).toBeNull();
    expect(
      decodeWorkflowSharePayload(
        encodeRaw({
          files: [{ path: ".github/workflows/ci.yml", sourceKind: "paste" }],
        }),
      ),
    ).toBeNull();
    expect(
      decodeWorkflowSharePayload(
        encodeRaw({
          files: [
            {
              content: 123,
              path: ".github/workflows/ci.yml",
              sourceKind: "paste",
            },
          ],
        }),
      ),
    ).toBeNull();
  });
});

describe("upload file selection boundaries", () => {
  it("accepts zero-byte supported files", () => {
    const result = validateWorkflowFileSelection([{ name: "empty.yml", size: 0 }]);

    expect(result.accepted).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects empty folder selections with a helpful error", () => {
    const result = validateWorkflowFileSelection(
      [{ name: "readme.md", size: 10, webkitRelativePath: "repo/README.md" }],
      { mode: "folder" },
    );

    expect(result.accepted).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("analysis history localStorage input", () => {
  it("returns an empty list for corrupt stored history", () => {
    window.localStorage.setItem(
      "authos.actions-analyzer.history.v1",
      "{not-json",
    );

    expect(readStoredAnalysisHistory()).toEqual([]);

    window.localStorage.setItem(
      "authos.actions-analyzer.history.v1",
      JSON.stringify([{ id: 123 }]),
    );

    expect(readStoredAnalysisHistory()).toEqual([]);
  });
});
