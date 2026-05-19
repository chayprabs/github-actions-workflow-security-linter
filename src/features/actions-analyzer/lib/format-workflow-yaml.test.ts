import { describe, expect, it } from "vitest";

import {
  canSafelyFormatWorkflowYaml,
  formatWorkflowYaml,
} from "@/features/actions-analyzer/lib/format-workflow-yaml";

describe("formatWorkflowYaml", () => {
  it("formats comment-free workflow yaml", () => {
    const input = `name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n`;

    expect(formatWorkflowYaml(input)).toEqual({
      ok: true,
      content: `name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
`,
    });
  });

  it("blocks files with authos ignore comments", () => {
    const result = formatWorkflowYaml(`name: CI
# authos-ignore GHA401: benchmark
jobs:
  test:
    runs-on: ubuntu-latest
`);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Authos ignore");
    }
  });

  it("blocks files with regular comments", () => {
    expect(canSafelyFormatWorkflowYaml(`name: CI # inline`).allowed).toBe(false);
  });
});
