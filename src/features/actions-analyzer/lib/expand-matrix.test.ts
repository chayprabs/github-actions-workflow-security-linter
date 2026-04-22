import { describe, expect, it } from "vitest";

import { expandMatrix } from "@/features/actions-analyzer/lib/expand-matrix";
import type { WorkflowMatrix } from "@/features/actions-analyzer/types";

function createMatrix(
  overrides: Partial<WorkflowMatrix> & Pick<WorkflowMatrix, "dimensions">,
): WorkflowMatrix {
  return {
    additionalFields: {},
    dimensions: overrides.dimensions,
    exclude: overrides.exclude ?? [],
    include: overrides.include ?? [],
    location: overrides.location,
    raw: overrides.raw ?? overrides.dimensions,
  };
}

describe("expandMatrix", () => {
  it("builds the Cartesian product for static scalar axes", () => {
    const result = expandMatrix(
      createMatrix({
        dimensions: {
          node: [18, 20],
          os: ["ubuntu-latest", "windows-latest"],
        },
      }),
    );

    expect(result).toMatchObject({
      axisNames: ["node", "os"],
      baseCombinationCount: 4,
      excludedCombinationCount: 0,
      finalCombinationCount: 4,
      includeOnlyCombinationCount: 0,
      isUnresolved: false,
    });
    expect(
      result.finalCombinations.map((combination) => combination.values),
    ).toEqual([
      { node: 18, os: "ubuntu-latest" },
      { node: 18, os: "windows-latest" },
      { node: 20, os: "ubuntu-latest" },
      { node: 20, os: "windows-latest" },
    ]);
  });

  it("removes matching combinations through exclude entries", () => {
    const result = expandMatrix(
      createMatrix({
        dimensions: {
          node: [18, 20],
          os: ["ubuntu-latest", "windows-latest"],
        },
        exclude: [
          {
            node: 20,
            os: "windows-latest",
          },
        ],
      }),
    );

    expect(result.excludedCombinationCount).toBe(1);
    expect(result.excludeEntries[0]).toMatchObject({
      matchedBaseCombinations: 1,
    });
    expect(result.finalCombinationCount).toBe(3);
    expect(
      result.finalCombinations.map((combination) => combination.values),
    ).not.toContainEqual({
      node: 20,
      os: "windows-latest",
    });
  });

  it("augments matching combinations and adds include-only entries", () => {
    const result = expandMatrix(
      createMatrix({
        dimensions: {
          node: [20],
          os: ["ubuntu-latest"],
        },
        include: [
          {
            experimental: true,
            node: 20,
            os: "ubuntu-latest",
          },
          {
            experimental: true,
            node: 22,
            os: "windows-latest",
          },
        ],
      }),
    );

    expect(
      result.includeEntries.map((entry) => entry.matchedBaseCombinations),
    ).toEqual([1, 0]);
    expect(result.includeOnlyCombinationCount).toBe(1);
    expect(result.finalCombinationCount).toBe(2);
    expect(result.combinationKeys).toEqual(["node", "os", "experimental"]);
    expect(
      result.finalCombinations.map((combination) => combination.values),
    ).toContainEqual({
      experimental: true,
      node: 20,
      os: "ubuntu-latest",
    });
    expect(
      result.finalCombinations.map((combination) => combination.values),
    ).toContainEqual({
      experimental: true,
      node: 22,
      os: "windows-latest",
    });
  });

  it("supports object-valued axis entries", () => {
    const result = expandMatrix(
      createMatrix({
        dimensions: {
          runtime: ["node"],
          target: [
            {
              name: "api",
              path: "services/api",
            },
            {
              name: "web",
              path: "apps/web",
            },
          ],
        },
      }),
    );

    expect(result.finalCombinationCount).toBe(2);
    expect(
      result.finalCombinations.map((combination) => combination.values),
    ).toContainEqual({
      runtime: "node",
      target: {
        name: "api",
        path: "services/api",
      },
    });
    expect(
      result.finalCombinations.map((combination) => combination.values),
    ).toContainEqual({
      runtime: "node",
      target: {
        name: "web",
        path: "apps/web",
      },
    });
  });

  it("marks dynamic matrix expressions as unresolved without crashing", () => {
    const result = expandMatrix(
      createMatrix({
        dimensions: {
          version: "${{ fromJSON(needs.setup.outputs.versions) }}",
        },
      }),
    );

    expect(result).toMatchObject({
      baseCombinationCount: null,
      finalCombinationCount: null,
      isUnresolved: true,
    });
    expect(result.unresolvedReasons[0]).toContain(
      "cannot be expanded statically",
    );
  });

  it("handles empty matrices after exclusions", () => {
    const result = expandMatrix(
      createMatrix({
        dimensions: {
          os: ["ubuntu-latest"],
        },
        exclude: [
          {
            os: "ubuntu-latest",
          },
        ],
      }),
    );

    expect(result.excludedCombinationCount).toBe(1);
    expect(result.finalCombinationCount).toBe(0);
    expect(result.finalCombinations).toEqual([]);
    expect(result.sampleCombinations).toEqual([]);
  });
});
