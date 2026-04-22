import { describe, expect, it } from "vitest";

import {
  createEmptyPasteFile,
  DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES,
  formatBytes,
  validateWorkflowFileSelection,
} from "@/features/actions-analyzer/lib/workflow-input-utils";

describe("formatBytes", () => {
  it("formats bytes into readable units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });
});

describe("validateWorkflowFileSelection", () => {
  it("accepts supported upload files and rejects unsupported extensions", () => {
    const result = validateWorkflowFileSelection([
      { name: "ci.yml", size: 120 },
      { name: "workflow.yaml", size: 200 },
      { name: "notes.txt", size: 64 },
      { name: "package.json", size: 80 },
    ]);

    expect(result.accepted.map((candidate) => candidate.path)).toEqual([
      "ci.yml",
      "workflow.yaml",
      "notes.txt",
    ]);
    expect(result.errors).toEqual([
      'Unsupported file type for "package.json". Supported uploads are .yml, .yaml, and .txt.',
    ]);
  });

  it("rejects files over the configured size limit", () => {
    const result = validateWorkflowFileSelection(
      [
        {
          name: "too-large.yml",
          size: DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES + 10,
        },
      ],
      {
        maxFileSizeBytes: DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES,
      },
    );

    expect(result.accepted).toHaveLength(0);
    expect(result.errors).toEqual([
      'File "too-large.yml" is 1 MB, which exceeds the 1 MB per-file limit.',
    ]);
  });

  it("filters folder uploads to workflow YAML files by default", () => {
    const result = validateWorkflowFileSelection(
      [
        {
          name: "ci.yml",
          size: 120,
          webkitRelativePath: "repo/.github/workflows/ci.yml",
        },
        {
          name: "values.yaml",
          size: 140,
          webkitRelativePath: "repo/deploy/values.yaml",
        },
      ],
      {
        mode: "folder",
      },
    );

    expect(result.accepted.map((candidate) => candidate.path)).toEqual([
      "repo/.github/workflows/ci.yml",
    ]);
    expect(result.errors).toEqual([]);
  });

  it('includes all YAML files when "Include all YAML files" is enabled', () => {
    const result = validateWorkflowFileSelection(
      [
        {
          name: "ci.yml",
          size: 120,
          webkitRelativePath: "repo/.github/workflows/ci.yml",
        },
        {
          name: "values.yaml",
          size: 140,
          webkitRelativePath: "repo/deploy/values.yaml",
        },
      ],
      {
        includeAllYamlFiles: true,
        mode: "folder",
      },
    );

    expect(result.accepted.map((candidate) => candidate.path)).toEqual([
      "repo/.github/workflows/ci.yml",
      "repo/deploy/values.yaml",
    ]);
  });
});

describe("createEmptyPasteFile", () => {
  it("creates unique default draft paths when more than one paste file exists", () => {
    const firstDraft = createEmptyPasteFile();
    const secondDraft = createEmptyPasteFile([firstDraft.path], 1);

    expect(firstDraft.path).toBe(".github/workflows/workflow.yml");
    expect(secondDraft.path).toBe(".github/workflows/workflow-2.yml");
  });
});
