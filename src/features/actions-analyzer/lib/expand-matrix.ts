import type {
  MatrixCombination,
  MatrixEntryMatchSummary,
  MatrixExpansionResult,
  WorkflowMatrix,
} from "@/features/actions-analyzer/types";

const defaultSampleLimit = 20;

interface ExpandMatrixOptions {
  failFast?: boolean | null | undefined;
  maxParallel?: number | null | undefined;
  sampleLimit?: number | undefined;
}

type StaticMatrixValue =
  | null
  | boolean
  | number
  | string
  | StaticMatrixValue[]
  | { [key: string]: StaticMatrixValue };

type StaticMatrixCombination = Record<string, StaticMatrixValue>;

interface StaticMatrixAxis {
  name: string;
  values: StaticMatrixValue[];
}

export function expandMatrix(
  matrix: WorkflowMatrix,
  options: ExpandMatrixOptions = {},
): MatrixExpansionResult {
  const axisNames = Object.keys(matrix.dimensions);
  const sampleLimit = Math.max(1, options.sampleLimit ?? defaultSampleLimit);
  const unresolvedReasons: string[] = [];
  const axes: StaticMatrixAxis[] = [];

  for (const axisName of axisNames) {
    const axisValue = matrix.dimensions[axisName];

    if (!Array.isArray(axisValue)) {
      unresolvedReasons.push(
        `Axis \`${axisName}\` is not a static array. Dynamic matrix values such as \`fromJSON(...)\` cannot be expanded statically.`,
      );
      continue;
    }

    const staticValues: StaticMatrixValue[] = [];
    let axisIsResolved = true;

    for (const entry of axisValue) {
      if (!isStaticMatrixValue(entry)) {
        axisIsResolved = false;
        unresolvedReasons.push(
          `Axis \`${axisName}\` contains an expression or non-static value that cannot be expanded statically.`,
        );
        break;
      }

      staticValues.push(cloneStaticValue(entry));
    }

    if (axisIsResolved) {
      axes.push({
        name: axisName,
        values: staticValues,
      });
    }
  }

  const baseCombinations =
    unresolvedReasons.length === 0 ? buildCartesianProduct(axes) : null;
  const baseCombinationCount = baseCombinations?.length ?? null;

  const normalizedExcludeEntries = normalizeMatrixEntries(
    matrix.exclude,
    "exclude",
    unresolvedReasons,
  );
  const normalizedIncludeEntries = normalizeMatrixEntries(
    matrix.include,
    "include",
    unresolvedReasons,
  );

  if (baseCombinations === null || unresolvedReasons.length > 0) {
    return createExpansionResult({
      axisNames,
      baseCombinationCount,
      combinationKeys: axisNames,
      excludeEntries: normalizedExcludeEntries.map((entry) => ({
        entry,
        matchedBaseCombinations: 0,
        reason:
          "Static match counts are unavailable because the matrix could not be expanded deterministically.",
      })),
      excludedCombinationCount: null,
      failFast: options.failFast ?? null,
      finalCombinationCount: null,
      finalCombinations: [],
      includeEntries: normalizedIncludeEntries.map((entry) => ({
        entry,
        matchedBaseCombinations: 0,
        reason:
          "Static match counts are unavailable because the matrix could not be expanded deterministically.",
      })),
      includeOnlyCombinationCount: null,
      isUnresolved: true,
      maxParallel: options.maxParallel ?? null,
      sampleLimit,
      unresolvedReasons,
    });
  }

  const excludedIndices = new Set<number>();
  const excludeEntries: MatrixEntryMatchSummary[] =
    normalizedExcludeEntries.map((entry) => {
      const matchedIndices = baseCombinations.flatMap((combination, index) =>
        doesPartialMatrixEntryMatch(entry, combination) ? [index] : [],
      );

      for (const index of matchedIndices) {
        excludedIndices.add(index);
      }

      return {
        entry,
        matchedBaseCombinations: matchedIndices.length,
        reason:
          matchedIndices.length === 0
            ? "This exclude entry does not match any static base combination."
            : `This exclude entry removes ${matchedIndices.length} base combination${matchedIndices.length === 1 ? "" : "s"}.`,
      };
    });

  const remainingBaseCombinations = baseCombinations.filter(
    (_combination, index) => !excludedIndices.has(index),
  );
  const currentCombinations = remainingBaseCombinations.map((combination) =>
    cloneCombination(combination),
  );
  const includeEntries: MatrixEntryMatchSummary[] = [];
  let includeOnlyCombinationCount = 0;

  for (const entry of normalizedIncludeEntries) {
    const matchedBaseCombinations = baseCombinations.filter((combination) =>
      doesIncludeEntryMatchBaseCombination(entry, combination, axisNames),
    );
    const matchingCurrentIndices = currentCombinations.flatMap(
      (combination, index) =>
        doesIncludeEntryMatchBaseCombination(entry, combination, axisNames)
          ? [index]
          : [],
    );

    if (matchingCurrentIndices.length > 0) {
      for (const index of matchingCurrentIndices) {
        currentCombinations[index] = {
          ...currentCombinations[index],
          ...cloneCombination(entry),
        };
      }
    } else {
      currentCombinations.push(cloneCombination(entry));
      includeOnlyCombinationCount += 1;
    }

    includeEntries.push({
      entry,
      matchedBaseCombinations: matchedBaseCombinations.length,
      reason:
        matchedBaseCombinations.length === 0
          ? "This include entry does not match any static base combination and will be shown as an include-only combination."
          : `This include entry matches ${matchedBaseCombinations.length} base combination${matchedBaseCombinations.length === 1 ? "" : "s"}.`,
    });
  }

  return createExpansionResult({
    axisNames,
    baseCombinationCount,
    combinationKeys: getCombinationKeys(axisNames, currentCombinations),
    excludeEntries,
    excludedCombinationCount: excludedIndices.size,
    failFast: options.failFast ?? null,
    finalCombinationCount: currentCombinations.length,
    finalCombinations: currentCombinations.map(toMatrixCombination),
    includeEntries,
    includeOnlyCombinationCount,
    isUnresolved: false,
    maxParallel: options.maxParallel ?? null,
    sampleLimit,
    unresolvedReasons: [],
  });
}

function buildCartesianProduct(axes: StaticMatrixAxis[]) {
  if (axes.length === 0) {
    return [];
  }

  return axes.reduce<StaticMatrixCombination[]>((combinations, axis) => {
    if (axis.values.length === 0) {
      return [];
    }

    if (combinations.length === 0) {
      return axis.values.map((value) => ({
        [axis.name]: cloneStaticValue(value),
      }));
    }

    return combinations.flatMap((combination) =>
      axis.values.map((value) => ({
        ...cloneCombination(combination),
        [axis.name]: cloneStaticValue(value),
      })),
    );
  }, []);
}

function cloneCombination<T extends StaticMatrixCombination>(
  combination: T,
): T {
  return structuredCloneSafe(combination);
}

function cloneStaticValue<T extends StaticMatrixValue>(value: T): T {
  return structuredCloneSafe(value);
}

function createExpansionResult({
  axisNames,
  baseCombinationCount,
  combinationKeys,
  excludeEntries,
  excludedCombinationCount,
  failFast,
  finalCombinationCount,
  finalCombinations,
  includeEntries,
  includeOnlyCombinationCount,
  isUnresolved,
  maxParallel,
  sampleLimit,
  unresolvedReasons,
}: {
  axisNames: string[];
  baseCombinationCount: number | null;
  combinationKeys: string[];
  excludeEntries: MatrixEntryMatchSummary[];
  excludedCombinationCount: number | null;
  failFast: boolean | null;
  finalCombinationCount: number | null;
  finalCombinations: MatrixCombination[];
  includeEntries: MatrixEntryMatchSummary[];
  includeOnlyCombinationCount: number | null;
  isUnresolved: boolean;
  maxParallel: number | null;
  sampleLimit: number;
  unresolvedReasons: string[];
}): MatrixExpansionResult {
  const sampleCombinations = finalCombinations.slice(0, sampleLimit);

  return {
    axisNames,
    baseCombinationCount,
    combinationKeys,
    excludeEntries,
    excludedCombinationCount,
    failFast,
    finalCombinationCount,
    finalCombinations,
    hasMoreCombinations: finalCombinations.length > sampleLimit,
    includeEntries,
    includeOnlyCombinationCount,
    isUnresolved,
    maxParallel,
    sampleCombinations,
    sampleLimit,
    unresolvedReasons,
  };
}

function doesIncludeEntryMatchBaseCombination(
  entry: StaticMatrixCombination,
  combination: StaticMatrixCombination,
  axisNames: string[],
) {
  const baseAxisKeys = Object.keys(entry).filter((key) =>
    axisNames.includes(key),
  );

  if (baseAxisKeys.length === 0) {
    return false;
  }

  return baseAxisKeys.every((key) => deepEqual(entry[key], combination[key]));
}

function doesPartialMatrixEntryMatch(
  entry: StaticMatrixCombination,
  combination: StaticMatrixCombination,
) {
  return Object.entries(entry).every(([key, value]) =>
    deepEqual(value, combination[key]),
  );
}

function getCombinationKeys(
  axisNames: string[],
  combinations: StaticMatrixCombination[],
) {
  const additionalKeys = new Set<string>();

  for (const combination of combinations) {
    for (const key of Object.keys(combination)) {
      if (!axisNames.includes(key)) {
        additionalKeys.add(key);
      }
    }
  }

  return [...axisNames, ...[...additionalKeys].sort()];
}

function isExpressionString(value: string) {
  return value.includes("${{");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStaticMatrixValue(value: unknown): value is StaticMatrixValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return true;
  }

  if (typeof value === "string") {
    return !isExpressionString(value);
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isStaticMatrixValue(entry));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Object.values(value).every((entry) => isStaticMatrixValue(entry));
}

function normalizeMatrixEntries(
  entries: Record<string, unknown>[],
  kind: "exclude" | "include",
  unresolvedReasons: string[],
) {
  const normalizedEntries: StaticMatrixCombination[] = [];

  for (const entry of entries) {
    if (!isStaticMatrixValue(entry) || !isPlainObject(entry)) {
      unresolvedReasons.push(
        `A ${kind} entry contains an expression or non-static value that cannot be expanded statically.`,
      );
      continue;
    }

    normalizedEntries.push(cloneCombination(entry as StaticMatrixCombination));
  }

  return normalizedEntries;
}

function sortObjectKeys(value: StaticMatrixValue): StaticMatrixValue {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectKeys(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortObjectKeys(value[key] as StaticMatrixValue)]),
  );
}

function stableStringify(value: StaticMatrixValue) {
  return JSON.stringify(sortObjectKeys(value));
}

function deepEqual(
  left: StaticMatrixValue | undefined,
  right: StaticMatrixValue | undefined,
) {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return stableStringify(left) === stableStringify(right);
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toMatrixCombination(
  values: StaticMatrixCombination,
): MatrixCombination {
  return {
    entries: Object.keys(values)
      .sort()
      .map((key) => ({
        key,
        value: values[key],
      })),
    values: cloneCombination(values),
  };
}
