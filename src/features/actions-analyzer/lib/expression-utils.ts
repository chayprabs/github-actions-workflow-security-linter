import type {
  ExpressionContextAnalysis,
  ExpressionContextName,
  ExpressionFieldType,
  ExpressionSummary,
  ExtractedExpression,
  NormalizedWorkflow,
  SourceLocation,
  WorkflowExpression,
} from "@/features/actions-analyzer/types";

const identifierPattern = /[A-Za-z0-9_-]/u;
const knownExpressionContextList = [
  "env",
  "github",
  "inputs",
  "job",
  "jobs",
  "matrix",
  "needs",
  "runner",
  "secrets",
  "steps",
  "strategy",
  "vars",
] satisfies ExpressionContextName[];
const knownExpressionFunctionList = [
  "always",
  "cancelled",
  "case",
  "contains",
  "endsWith",
  "failure",
  "format",
  "fromJSON",
  "hashFiles",
  "join",
  "startsWith",
  "success",
  "toJSON",
] as const;
const untrustedGitHubContextCatalog = [
  "github.event.pull_request.title",
  "github.event.pull_request.body",
  "github.event.issue.title",
  "github.event.issue.body",
  "github.event.comment.body",
  "github.event.review.body",
  "github.event.pages",
  "github.head_ref",
  "github.ref_name",
  "github.event.head_commit.message",
] as const;
const knownExpressionContexts = new Set<string>(knownExpressionContextList);
const knownExpressionFunctions = new Set<string>(
  knownExpressionFunctionList.map((name) => name.toLowerCase()),
);
const literalKeywords = new Set(["false", "null", "true"]);

interface CollectionMetadata {
  allowBareExpression?: boolean | undefined;
  fieldPath: Array<number | string>;
  fieldType: ExpressionFieldType;
  jobId?: string | undefined;
  location?: SourceLocation | undefined;
  stepIndex?: number | undefined;
  stepLabel?: string | undefined;
}

interface ParsedReference {
  endIndex: number;
  normalized: string;
  root: string;
}

export function buildExpressionSummary(
  expressions: WorkflowExpression[],
): ExpressionSummary {
  const contexts = new Set<string>();
  const unknownContexts = new Set<string>();
  let untrustedContextUsages = 0;

  for (const expression of expressions) {
    for (const context of expression.contexts) {
      contexts.add(context);
    }

    for (const unknownContext of expression.unknownContexts) {
      unknownContexts.add(unknownContext);
    }

    untrustedContextUsages += getUntrustedUsageCount(expression);
  }

  return {
    contexts: [...contexts].sort(),
    totalExpressions: expressions.length,
    unknownContexts: [...unknownContexts].sort(),
    untrustedContextUsages,
  };
}

export function collectExpressionsFromWorkflow(
  workflow: NormalizedWorkflow,
): WorkflowExpression[] {
  const expressions: WorkflowExpression[] = [];

  collectFromUnknownValue(expressions, workflow.name.raw, {
    fieldPath: ["name"],
    fieldType: "name",
    location: workflow.name.location,
  }, workflow.filePath);
  collectFromUnknownValue(expressions, workflow.concurrency.raw, {
    fieldPath: ["concurrency"],
    fieldType: "concurrency",
    location: workflow.concurrency.location,
  }, workflow.filePath);
  collectFromUnknownValue(expressions, workflow.env.raw, {
    fieldPath: ["env"],
    fieldType: "env",
    location: workflow.env.location,
  }, workflow.filePath);
  collectFromUnknownValue(expressions, workflow.defaults.raw, {
    fieldPath: ["defaults"],
    fieldType: "other",
    location: workflow.defaults.location,
  }, workflow.filePath);

  for (const job of workflow.jobs) {
    const jobPath = ["jobs", job.id] as Array<number | string>;
    const jobStepLabel = job.name.value ?? job.id;
    const jobRaw = asRecord(job.raw);

    collectFromUnknownValue(expressions, job.name.raw, {
      fieldPath: [...jobPath, "name"],
      fieldType: "name",
      jobId: job.id,
      location: job.name.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.if.raw, {
      allowBareExpression: true,
      fieldPath: [...jobPath, "if"],
      fieldType: "if",
      jobId: job.id,
      location: job.if.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.runsOn.raw, {
      fieldPath: [...jobPath, "runs-on"],
      fieldType: "other",
      jobId: job.id,
      location: job.runsOn.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.concurrency.raw, {
      fieldPath: [...jobPath, "concurrency"],
      fieldType: "concurrency",
      jobId: job.id,
      location: job.concurrency.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.environment.raw, {
      fieldPath: [...jobPath, "environment"],
      fieldType: "other",
      jobId: job.id,
      location: job.environment.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.timeoutMinutes.raw, {
      fieldPath: [...jobPath, "timeout-minutes"],
      fieldType: "timeout-minutes",
      jobId: job.id,
      location: job.timeoutMinutes.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.strategy?.raw, {
      fieldPath: [...jobPath, "strategy"],
      fieldType: "strategy",
      jobId: job.id,
      location: job.strategy?.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.with.raw, {
      fieldPath: [...jobPath, "with"],
      fieldType: "with",
      jobId: job.id,
      location: job.with.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.secrets.raw, {
      fieldPath: [...jobPath, "secrets"],
      fieldType: "other",
      jobId: job.id,
      location: job.secrets.location,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, jobRaw.env, {
      fieldPath: [...jobPath, "env"],
      fieldType: "env",
      jobId: job.id,
    }, workflow.filePath);
    collectFromUnknownValue(expressions, job.reusableWorkflowCall?.raw, {
      fieldPath: [...jobPath, "uses"],
      fieldType: "uses",
      jobId: job.id,
      location: job.reusableWorkflowCall?.location,
    }, workflow.filePath);

    for (const step of job.steps) {
      const stepLabel =
        step.id.value ?? step.name.value ?? `step-${step.index + 1}`;
      const stepPath = [...jobPath, "steps", step.index] as Array<
        number | string
      >;

      collectFromUnknownValue(expressions, step.name.raw, {
        fieldPath: [...stepPath, "name"],
        fieldType: "name",
        jobId: job.id,
        location: step.name.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.if.raw, {
        allowBareExpression: true,
        fieldPath: [...stepPath, "if"],
        fieldType: "if",
        jobId: job.id,
        location: step.if.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.run?.raw, {
        fieldPath: [...stepPath, "run"],
        fieldType: "run",
        jobId: job.id,
        location: step.run?.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.shell.raw, {
        fieldPath: [...stepPath, "shell"],
        fieldType: "shell",
        jobId: job.id,
        location: step.shell.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.timeoutMinutes.raw, {
        fieldPath: [...stepPath, "timeout-minutes"],
        fieldType: "timeout-minutes",
        jobId: job.id,
        location: step.timeoutMinutes.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.continueOnError.raw, {
        fieldPath: [...stepPath, "continue-on-error"],
        fieldType: "other",
        jobId: job.id,
        location: step.continueOnError.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.workingDirectory.raw, {
        fieldPath: [...stepPath, "working-directory"],
        fieldType: "working-directory",
        jobId: job.id,
        location: step.workingDirectory.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.with.raw, {
        fieldPath: [...stepPath, "with"],
        fieldType: "with",
        jobId: job.id,
        location: step.with.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.env.raw, {
        fieldPath: [...stepPath, "env"],
        fieldType: "env",
        jobId: job.id,
        location: step.env.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);
      collectFromUnknownValue(expressions, step.uses?.raw, {
        fieldPath: [...stepPath, "uses"],
        fieldType: "uses",
        jobId: job.id,
        location: step.uses?.location,
        stepIndex: step.index,
        stepLabel,
      }, workflow.filePath);

      if (stepLabel !== jobStepLabel) {
        collectFromUnknownValue(expressions, step.additionalFields, {
          fieldPath: stepPath,
          fieldType: "other",
          jobId: job.id,
          stepIndex: step.index,
          stepLabel,
        }, workflow.filePath);
      }
    }
  }

  return expressions;
}

export function containsUntrustedContext(expressionText: string): boolean {
  return getMatchedUntrustedContexts(expressionText).length > 0;
}

export function extractExpressionContexts(
  expressionText: string,
): ExpressionContextAnalysis {
  const sanitizedText = stripQuotedStrings(expressionText);
  const contexts = new Set<ExpressionContextName>();
  const functions = new Set<string>();
  const references = new Set<string>();
  const unknownContexts = new Set<string>();

  let cursor = 0;

  while (cursor < sanitizedText.length) {
    const character = sanitizedText[cursor] ?? "";

    if (!isIdentifierStart(character)) {
      cursor += 1;
      continue;
    }

    const previousCharacter = findPreviousNonWhitespace(sanitizedText, cursor);

    if (
      previousCharacter !== null &&
      (isIdentifierCharacter(previousCharacter) ||
        previousCharacter === "." ||
        previousCharacter === "]")
    ) {
      cursor += 1;
      continue;
    }

    const root = readIdentifier(sanitizedText, cursor);
    const nextIndex = skipWhitespace(sanitizedText, root.endIndex);
    const normalizedRoot = root.value.toLowerCase();

    if (sanitizedText[nextIndex] === "(") {
      functions.add(root.value);
      cursor = nextIndex + 1;
      continue;
    }

    if (literalKeywords.has(normalizedRoot)) {
      cursor = root.endIndex;
      continue;
    }

    const reference = readReference(sanitizedText, cursor);
    references.add(reference.normalized);

    if (knownExpressionContexts.has(reference.root.toLowerCase())) {
      contexts.add(reference.root.toLowerCase() as ExpressionContextName);
    } else if (!knownExpressionFunctions.has(normalizedRoot)) {
      unknownContexts.add(reference.root);
    }

    cursor = reference.endIndex;
  }

  return {
    contexts: [...contexts].sort(),
    functions: [...functions].sort((left, right) =>
      left.localeCompare(right),
    ),
    references: [...references].sort(),
    unknownContexts: [...unknownContexts].sort(),
  };
}

export function extractExpressionsFromString(
  value: string,
  locationBase?: SourceLocation | undefined,
): ExtractedExpression[] {
  const expressions: ExtractedExpression[] = [];
  let searchOffset = 0;

  while (searchOffset < value.length) {
    const startOffset = value.indexOf("${{", searchOffset);

    if (startOffset === -1) {
      break;
    }

    const endDelimiterOffset = value.indexOf("}}", startOffset + 3);
    const isClosed = endDelimiterOffset !== -1;
    const endOffset = isClosed ? endDelimiterOffset + 2 : value.length;
    const expressionText = (
      isClosed
        ? value.slice(startOffset + 3, endDelimiterOffset)
        : value.slice(startOffset + 3)
    ).trim();

    expressions.push({
      endOffset,
      expressionText,
      isClosed,
      isMalformed: !isClosed || expressionText.length === 0,
      isWrapped: true,
      location: locationBase
        ? resolveExpressionLocationFromBase(
            value,
            locationBase,
            startOffset,
            endOffset,
          )
        : undefined,
      rawExpression: value.slice(startOffset, endOffset),
      startOffset,
    });

    if (!isClosed) {
      break;
    }

    searchOffset = endOffset;
  }

  return expressions;
}

export function hydrateWorkflowExpressions(
  expressions: WorkflowExpression[],
  resolveLocationForPath: (
    path: readonly (number | string)[],
  ) => SourceLocation | undefined,
): WorkflowExpression[] {
  return expressions.map((expression) => {
    if (expression.location) {
      return expression;
    }

    const baseLocation = resolveLocationForPath(expression.fieldPath);

    if (!baseLocation) {
      return expression;
    }

    return {
      ...expression,
      location: resolveExpressionLocationFromBase(
        expression.rawValue,
        baseLocation,
        expression.startOffset,
        expression.startOffset + expression.rawExpression.length,
      ),
    };
  });
}

export function isProbablyExpression(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return false;
  }

  if (trimmedValue.includes("${{")) {
    return true;
  }

  return (
    /\b(?:github|env|vars|secrets|inputs|matrix|needs|strategy|runner|job|jobs|steps)\s*(?:\.|\[)/u.test(
      trimmedValue,
    ) ||
    /\b(?:always|cancelled|case|contains|endsWith|failure|format|fromJSON|hashFiles|join|startsWith|success|toJSON)\s*\(/u.test(
      trimmedValue,
    )
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function collectFromStringValue(
  expressions: WorkflowExpression[],
  rawValue: string,
  metadata: CollectionMetadata,
  filePath: string,
) {
  const wrappedExpressions = extractExpressionsFromString(
    rawValue,
    metadata.location,
  );
  const bareExpressions =
    wrappedExpressions.length === 0 &&
    metadata.allowBareExpression &&
    isProbablyExpression(rawValue)
      ? [
          {
            endOffset: rawValue.length,
            expressionText: rawValue.trim(),
            isClosed: true,
            isMalformed: false,
            isWrapped: false,
            location: metadata.location,
            rawExpression: rawValue,
            startOffset: 0,
          } satisfies ExtractedExpression,
        ]
      : [];

  for (const extractedExpression of [...wrappedExpressions, ...bareExpressions]) {
    const contextAnalysis = extractExpressionContexts(
      extractedExpression.expressionText,
    );

    expressions.push({
      ...contextAnalysis,
      containsUntrustedContext: containsUntrustedContext(
        extractedExpression.expressionText,
      ),
      fieldPath: metadata.fieldPath,
      fieldPathLabel: stringifyPath(metadata.fieldPath),
      fieldType: metadata.fieldType,
      filePath,
      isMalformed: extractedExpression.isMalformed,
      isWrapped: extractedExpression.isWrapped,
      jobId: metadata.jobId,
      location: extractedExpression.location,
      matchedUntrustedContexts: getMatchedUntrustedContexts(
        extractedExpression.expressionText,
      ),
      rawExpression: extractedExpression.rawExpression,
      rawValue,
      startOffset: extractedExpression.startOffset,
      stepIndex: metadata.stepIndex,
      stepLabel: metadata.stepLabel,
      text: extractedExpression.expressionText,
    });
  }
}

function collectFromUnknownValue(
  expressions: WorkflowExpression[],
  value: unknown,
  metadata: CollectionMetadata,
  filePath: string,
) {
  if (typeof value === "string") {
    collectFromStringValue(expressions, value, metadata, filePath);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collectFromUnknownValue(
        expressions,
        entry,
        {
          ...metadata,
          fieldPath: [...metadata.fieldPath, index],
          location: undefined,
        },
        filePath,
      );
    });
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    collectFromUnknownValue(
      expressions,
      entry,
      {
        ...metadata,
        fieldPath: [...metadata.fieldPath, key],
        location: undefined,
      },
      filePath,
    );
  }
}

function findPreviousNonWhitespace(text: string, fromIndex: number) {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    if (!/\s/u.test(text[index] ?? "")) {
      return text[index] ?? null;
    }
  }

  return null;
}

function getMatchedUntrustedContexts(expressionText: string) {
  const { references } = extractExpressionContexts(expressionText);

  return references.filter((reference) =>
    untrustedGitHubContextCatalog.some((candidate) => {
      return (
        reference === candidate || reference.startsWith(`${candidate}.`)
      );
    }),
  );
}

function getUntrustedUsageCount(expression: WorkflowExpression) {
  const explicitMatches = new Set(expression.matchedUntrustedContexts);
  const runEventMatches =
    expression.fieldType === "run"
      ? expression.references.filter((reference) =>
          reference.startsWith("github.event."),
        )
      : [];

  for (const runEventMatch of runEventMatches) {
    explicitMatches.add(runEventMatch);
  }

  return explicitMatches.size;
}

function isIdentifierCharacter(value: string) {
  return identifierPattern.test(value);
}

function isIdentifierStart(value: string) {
  return /[A-Za-z_]/u.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBracketSegment(segment: string) {
  const trimmedSegment = segment.trim();

  if (
    (trimmedSegment.startsWith("'") && trimmedSegment.endsWith("'")) ||
    (trimmedSegment.startsWith('"') && trimmedSegment.endsWith('"'))
  ) {
    return trimmedSegment.slice(1, -1);
  }

  if (/^\d+$/u.test(trimmedSegment) || trimmedSegment === "*") {
    return trimmedSegment;
  }

  return null;
}

function readIdentifier(text: string, startIndex: number) {
  let cursor = startIndex;

  while (cursor < text.length && isIdentifierCharacter(text[cursor] ?? "")) {
    cursor += 1;
  }

  return {
    endIndex: cursor,
    value: text.slice(startIndex, cursor),
  };
}

function readReference(text: string, startIndex: number): ParsedReference {
  const rootIdentifier = readIdentifier(text, startIndex);
  const segments = [rootIdentifier.value];
  let cursor = rootIdentifier.endIndex;

  while (cursor < text.length) {
    cursor = skipWhitespace(text, cursor);

    if (text[cursor] === ".") {
      const nextIndex = skipWhitespace(text, cursor + 1);

      if (text[nextIndex] === "*") {
        segments.push("*");
        cursor = nextIndex + 1;
        continue;
      }

      if (!isIdentifierStart(text[nextIndex] ?? "")) {
        break;
      }

      const identifier = readIdentifier(text, nextIndex);
      segments.push(identifier.value);
      cursor = identifier.endIndex;
      continue;
    }

    if (text[cursor] === "[") {
      const bracketEndIndex = text.indexOf("]", cursor + 1);

      if (bracketEndIndex === -1) {
        break;
      }

      const bracketSegment = normalizeBracketSegment(
        text.slice(cursor + 1, bracketEndIndex),
      );

      if (bracketSegment === null) {
        break;
      }

      segments.push(bracketSegment);
      cursor = bracketEndIndex + 1;
      continue;
    }

    break;
  }

  return {
    endIndex: cursor,
    normalized: segments.join("."),
    root: rootIdentifier.value,
  };
}

function resolveExpressionLocationFromBase(
  value: string,
  locationBase: SourceLocation,
  startOffset: number,
  endOffset: number,
): SourceLocation {
  const startPosition = resolveRelativePosition(value, locationBase, startOffset);
  const endPosition = resolveRelativePosition(
    value,
    locationBase,
    Math.max(startOffset, endOffset - 1),
  );

  return {
    filePath: locationBase.filePath,
    line: startPosition.line,
    column: startPosition.column,
    endLine: endPosition.line,
    endColumn: endPosition.column,
  };
}

function resolveRelativePosition(
  value: string,
  locationBase: SourceLocation,
  offset: number,
) {
  const prefix = value.slice(0, Math.max(0, Math.min(offset, value.length)));
  const lines = prefix.split(/\r?\n/u);
  const lineOffset = lines.length - 1;

  if (lineOffset === 0) {
    return {
      column: locationBase.column + prefix.length,
      line: locationBase.line,
    };
  }

  return {
    column: (lines.at(-1)?.length ?? 0) + 1,
    line: locationBase.line + lineOffset,
  };
}

function skipWhitespace(text: string, startIndex: number) {
  let cursor = startIndex;

  while (cursor < text.length && /\s/u.test(text[cursor] ?? "")) {
    cursor += 1;
  }

  return cursor;
}

function stringifyPath(path: readonly (number | string)[]) {
  return path.reduce<string>((label, segment) => {
    if (typeof segment === "number") {
      return `${label}[${segment}]`;
    }

    if (label.length === 0) {
      return segment;
    }

    return `${label}.${segment}`;
  }, "");
}

function stripQuotedStrings(text: string) {
  let result = "";
  let activeQuote: '"' | "'" | null = null;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (activeQuote) {
      if (character === activeQuote) {
        if (activeQuote === "'" && text[index + 1] === "'") {
          result += "  ";
          index += 1;
          continue;
        }

        activeQuote = null;
      }

      result += " ";
      continue;
    }

    if (character === "'" || character === '"') {
      activeQuote = character;
      result += " ";
      continue;
    }

    result += character;
  }

  return result;
}
