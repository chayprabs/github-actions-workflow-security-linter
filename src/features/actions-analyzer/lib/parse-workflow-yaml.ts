import {
  isMap,
  isNode,
  isScalar,
  isSeq,
  LineCounter,
  parseAllDocuments,
  type Node,
  type Pair,
  type YAMLMap,
} from "yaml";

import {
  createFindingId,
  sortFindings,
} from "@/features/actions-analyzer/lib/scoring";
import { getRuleDefinition } from "@/features/actions-analyzer/lib/rule-catalog";
import type {
  AnalyzerFinding,
  ParsedYamlDocument,
  ParsedYamlFile,
  ParsedYamlRootType,
  ParsedYamlSourceMap,
  SourceLocation,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

interface YamlErrorLike {
  code?: string | undefined;
  linePos?:
    | readonly [{ col?: number | undefined; line: number }]
    | readonly [
        { col?: number | undefined; line: number },
        { col?: number | undefined; line: number },
      ]
    | undefined;
  message: string;
  pos?: [number, number] | undefined;
}

interface FindingOverrides {
  evidence?: string | undefined;
  location?: SourceLocation | undefined;
  message: string;
  remediation?: string | undefined;
  ruleId: string;
}

export function parseWorkflowYaml(file: WorkflowInputFile): ParsedYamlFile {
  const lineCounter = new LineCounter();
  let documents: ParsedYamlDocument[] = [];

  try {
    documents = parseAllDocuments(file.content, {
      keepSourceTokens: true,
      lineCounter,
      prettyErrors: true,
      uniqueKeys: true,
    }) as ParsedYamlDocument[];
  } catch (error) {
    const fatalFinding = createParserFinding(file.path, file.content, 0, {
      message:
        error instanceof Error
          ? error.message
          : "Authos could not parse this YAML file.",
      remediation:
        "Fix the YAML syntax so the workflow can be parsed deterministically.",
      ruleId: "GHA001",
    });

    return {
      content: file.content,
      document: null,
      documents: [],
      duplicateKeyWarnings: [],
      fileId: file.id,
      filePath: file.path,
      isSuccessful: false,
      parsedValue: null,
      parseFindings: [fatalFinding],
      rootType: "unknown",
      sourceMap: createSourceMap(file, null, lineCounter),
      syntaxErrors: [fatalFinding],
      warnings: [],
      workflowFile: file,
    };
  }

  const document = documents[0] ?? null;
  const sourceMap = createSourceMap(file, document, lineCounter);
  const syntaxErrors: AnalyzerFinding[] = [];
  const duplicateKeyWarnings: AnalyzerFinding[] = [];
  const warnings: AnalyzerFinding[] = [];

  let findingIndex = 0;

  if (documents.length === 0) {
    syntaxErrors.push(
      createParserFinding(file.path, file.content, findingIndex++, {
        message:
          "The workflow file is empty. Add a YAML mapping with keys like name, on, and jobs.",
        remediation:
          "Add a single GitHub Actions workflow document to this file.",
        ruleId: "GHA003",
      }),
    );
  }

  for (const parsedDocument of documents) {
    for (const error of parsedDocument.errors) {
      const location = locationFromYamlError(
        file.path,
        file.content,
        lineCounter,
        error,
      );

      if (error.code === "DUPLICATE_KEY") {
        duplicateKeyWarnings.push(
          createParserFinding(file.path, file.content, findingIndex++, {
            evidence: getSourceSnippet(file.content, location) ?? undefined,
            location,
            message:
              "This mapping contains a duplicate key. GitHub Actions workflow keys must be unique.",
            remediation:
              "Remove or rename the duplicate key so each mapping key appears only once.",
            ruleId: "GHA002",
          }),
        );
        continue;
      }

      syntaxErrors.push(
        createParserFinding(file.path, file.content, findingIndex++, {
          evidence: getSourceSnippet(file.content, location) ?? undefined,
          location,
          message: error.message,
          remediation:
            "Fix the YAML syntax so the workflow can be parsed deterministically.",
          ruleId: "GHA001",
        }),
      );
    }
  }

  if (documents.length > 1) {
    const secondDocument = documents[1];
    const multiDocumentLocation =
      secondDocument?.range !== undefined
        ? createSourceLocationFromOffsets(
            file.path,
            file.content,
            secondDocument.range[0],
            secondDocument.range[1],
            lineCounter,
          )
        : undefined;

    warnings.push(
      createParserFinding(file.path, file.content, findingIndex++, {
        evidence:
          getSourceSnippet(file.content, multiDocumentLocation) ?? undefined,
        location: multiDocumentLocation,
        message:
          "GitHub Actions workflow files should contain a single YAML document, but this file contains multiple documents.",
        remediation:
          "Split the extra YAML documents into separate files under .github/workflows/.",
        ruleId: "GHA004",
      }),
    );
  }

  const rootType = getRootType(document?.contents);

  if (documents.length > 0 && rootType === "null") {
    syntaxErrors.push(
      createParserFinding(file.path, file.content, findingIndex++, {
        message:
          "The workflow file does not contain a YAML mapping. Add keys like name, on, and jobs.",
        remediation:
          "Add a single GitHub Actions workflow mapping to this file.",
        ruleId: "GHA003",
      }),
    );
  }

  if (
    documents.length > 0 &&
    (rootType === "sequence" || rootType === "scalar" || rootType === "unknown")
  ) {
    const rootLocation = getNodeLocation(
      file.path,
      file.content,
      lineCounter,
      document?.contents,
    );

    warnings.push(
      createParserFinding(file.path, file.content, findingIndex++, {
        evidence: getSourceSnippet(file.content, rootLocation) ?? undefined,
        location: rootLocation,
        message:
          "The workflow root should be a YAML mapping (object), not a scalar or sequence.",
        remediation:
          "Wrap the workflow in a top-level mapping with keys such as name, on, and jobs.",
        ruleId: "GHA005",
      }),
    );
  }

  const parseFindings = sortFindings([
    ...syntaxErrors,
    ...duplicateKeyWarnings,
    ...warnings,
  ]);

  return {
    content: file.content,
    document,
    documents,
    duplicateKeyWarnings,
    fileId: file.id,
    filePath: file.path,
    isSuccessful: parseFindings.length === 0 && rootType === "map",
    parsedValue:
      parseFindings.length === 0 && rootType === "map" && document
        ? document.toJS({ maxAliasCount: 100 })
        : null,
    parseFindings,
    rootType,
    sourceMap,
    syntaxErrors,
    warnings,
    workflowFile: file,
  };
}

export function parseWorkflowYamlFiles(
  files: WorkflowInputFile[],
): ParsedYamlFile[] {
  return files.map((file) => parseWorkflowYaml(file));
}

export function getLineColumnFromOffset(
  content: string,
  offset: number,
  lineCounter?: LineCounter | null,
): {
  column: number;
  line: number;
} {
  const safeOffset = Math.max(0, Math.min(offset, content.length));
  const linePosition = lineCounter?.linePos(safeOffset);

  if (linePosition && linePosition.line > 0) {
    return {
      column: linePosition.col,
      line: linePosition.line,
    };
  }

  const lines = content.slice(0, safeOffset).split(/\r?\n/u);
  const line = lines.length;
  const column = (lines.at(-1)?.length ?? 0) + 1;

  return {
    column,
    line,
  };
}

export function getSourceSnippet(
  content: string,
  location?: SourceLocation | undefined,
  contextLines = 2,
): string | null {
  if (!location) {
    return null;
  }

  const allLines = content.split(/\r?\n/u);

  if (allLines.length === 0) {
    return null;
  }

  const startLine = Math.max(1, location.line - contextLines);
  const endLine = Math.min(allLines.length, location.endLine + contextLines);
  const lineNumberWidth = String(endLine).length;

  return allLines
    .slice(startLine - 1, endLine)
    .map((line, index) => {
      const lineNumber = startLine + index;
      const marker = lineNumber === location.line ? ">" : " ";

      return `${marker} ${String(lineNumber).padStart(lineNumberWidth, " ")} | ${line}`;
    })
    .join("\n");
}

export function findTopLevelKeyLocation(
  parsedFile: ParsedYamlFile,
  key: string,
): SourceLocation | undefined {
  const root = parsedFile.document?.contents;

  if (!isMap(root)) {
    return undefined;
  }

  const pair = findMapPair(root, key);

  return getPairKeyLocation(parsedFile.filePath, parsedFile.content, pair);
}

export function findJobLocation(
  parsedFile: ParsedYamlFile,
  jobName: string,
): SourceLocation | undefined {
  return findLocationForPath(parsedFile, ["jobs", jobName]);
}

export function findLocationForPath(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
): SourceLocation | undefined {
  const resolved = resolveYamlPath(parsedFile.document?.contents, path);

  if (!resolved) {
    return undefined;
  }

  if (resolved.pair) {
    const valueLocation = getNodeLocation(
      parsedFile.filePath,
      parsedFile.content,
      undefined,
      resolved.node,
    );

    if (isScalar(resolved.node)) {
      return (
        valueLocation ??
        getPairKeyLocation(
          parsedFile.filePath,
          parsedFile.content,
          resolved.pair,
        )
      );
    }

    return (
      getPairKeyLocation(
        parsedFile.filePath,
        parsedFile.content,
        resolved.pair,
      ) ?? valueLocation
    );
  }

  return getNodeLocation(
    parsedFile.filePath,
    parsedFile.content,
    undefined,
    resolved.node,
  );
}

export function findStepLocation(
  parsedFile: ParsedYamlFile,
  jobName: string,
  stepIndex: number,
): SourceLocation | undefined {
  const stepNode = getNodeAtPath(parsedFile.document?.contents, [
    "jobs",
    jobName,
    "steps",
    stepIndex,
  ]);

  return getNodeLocation(
    parsedFile.filePath,
    parsedFile.content,
    undefined,
    stepNode,
  );
}

export function findScalarValueLocation(
  parsedFile: ParsedYamlFile,
  path: readonly (number | string)[],
): SourceLocation | undefined {
  const node = getNodeAtPath(parsedFile.document?.contents, path);

  return getNodeLocation(
    parsedFile.filePath,
    parsedFile.content,
    undefined,
    node,
  );
}

function createParserFinding(
  filePath: string,
  content: string,
  index: number,
  overrides: FindingOverrides,
): AnalyzerFinding {
  const rule = getRuleDefinition(overrides.ruleId);

  if (!rule) {
    throw new Error(`Unknown analyzer rule: ${overrides.ruleId}`);
  }

  const location = overrides.location;
  const line = location?.line ?? 0;
  const column = location?.column ?? 0;

  return {
    id: createFindingId(filePath, overrides.ruleId, line, column, index),
    ruleId: overrides.ruleId,
    title: rule.title,
    message: overrides.message,
    severity: rule.defaultSeverity,
    category: rule.category,
    confidence: "high",
    filePath,
    location,
    evidence:
      overrides.evidence ?? getSourceSnippet(content, location) ?? undefined,
    remediation: overrides.remediation ?? rule.description,
    docsUrl: rule.docsUrl,
    tags: rule.tags,
    relatedJobs: [],
    relatedSteps: [],
  };
}

function createSourceLocationFromOffsets(
  filePath: string,
  content: string,
  startOffset: number,
  endOffset: number,
  lineCounter?: LineCounter | undefined,
): SourceLocation {
  const start = getLineColumnFromOffset(content, startOffset, lineCounter);
  const end = getLineColumnFromOffset(
    content,
    Math.max(startOffset, endOffset - 1),
    lineCounter,
  );

  return {
    filePath,
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

function createSourceMap(
  file: WorkflowInputFile,
  document: ParsedYamlDocument | null,
  lineCounter: LineCounter,
): ParsedYamlSourceMap {
  return {
    findJobLocation: (jobName: string) =>
      findJobLocation(
        {
          content: file.content,
          document,
          documents: document ? [document] : [],
          duplicateKeyWarnings: [],
          fileId: file.id,
          filePath: file.path,
          isSuccessful: false,
          parsedValue: null,
          parseFindings: [],
          rootType: getRootType(document?.contents),
          sourceMap: undefined as never,
          syntaxErrors: [],
          warnings: [],
          workflowFile: file,
        },
        jobName,
      ),
    findLocationForPath: (path: readonly (number | string)[]) =>
      findLocationForPath(
        {
          content: file.content,
          document,
          documents: document ? [document] : [],
          duplicateKeyWarnings: [],
          fileId: file.id,
          filePath: file.path,
          isSuccessful: false,
          parsedValue: null,
          parseFindings: [],
          rootType: getRootType(document?.contents),
          sourceMap: undefined as never,
          syntaxErrors: [],
          warnings: [],
          workflowFile: file,
        },
        path,
      ),
    findScalarValueLocation: (path: readonly (number | string)[]) =>
      findScalarValueLocation(
        {
          content: file.content,
          document,
          documents: document ? [document] : [],
          duplicateKeyWarnings: [],
          fileId: file.id,
          filePath: file.path,
          isSuccessful: false,
          parsedValue: null,
          parseFindings: [],
          rootType: getRootType(document?.contents),
          sourceMap: undefined as never,
          syntaxErrors: [],
          warnings: [],
          workflowFile: file,
        },
        path,
      ),
    findStepLocation: (jobName: string, stepIndex: number) =>
      findStepLocation(
        {
          content: file.content,
          document,
          documents: document ? [document] : [],
          duplicateKeyWarnings: [],
          fileId: file.id,
          filePath: file.path,
          isSuccessful: false,
          parsedValue: null,
          parseFindings: [],
          rootType: getRootType(document?.contents),
          sourceMap: undefined as never,
          syntaxErrors: [],
          warnings: [],
          workflowFile: file,
        },
        jobName,
        stepIndex,
      ),
    findTopLevelKeyLocation: (key: string) =>
      findTopLevelKeyLocation(
        {
          content: file.content,
          document,
          documents: document ? [document] : [],
          duplicateKeyWarnings: [],
          fileId: file.id,
          filePath: file.path,
          isSuccessful: false,
          parsedValue: null,
          parseFindings: [],
          rootType: getRootType(document?.contents),
          sourceMap: undefined as never,
          syntaxErrors: [],
          warnings: [],
          workflowFile: file,
        },
        key,
      ),
    getLineColumnFromOffset: (offset: number) =>
      getLineColumnFromOffset(file.content, offset, lineCounter),
    getSourceSnippet: (
      location?: SourceLocation | undefined,
      contextLines = 2,
    ) => getSourceSnippet(file.content, location, contextLines),
  };
}

function findMapPair(
  map: YAMLMap<unknown, unknown>,
  key: number | string,
): Pair<unknown, unknown> | undefined {
  return map.items.find((pair) => {
    return isScalar(pair.key) ? pair.key.value === key : false;
  });
}

function getNodeAtPath(
  current: unknown,
  path: readonly (number | string)[],
): Node | null | undefined {
  const resolved = resolveYamlPath(current, path);

  return resolved?.node;
}

function resolveYamlPath(
  current: unknown,
  path: readonly (number | string)[],
): {
  node: Node | null | undefined;
  pair?: Pair<unknown, unknown> | undefined;
} | null {
  let node = current;
  let pair: Pair<unknown, unknown> | undefined;

  for (const segment of path) {
    if (typeof segment === "number") {
      if (!isSeq(node)) {
        return null;
      }

      node = node.items[segment];
      pair = undefined;
      continue;
    }

    if (!isMap(node)) {
      return null;
    }

    pair = findMapPair(node, segment);
    node = pair?.value;
  }

  return {
    node: isNode(node) ? node : undefined,
    pair,
  };
}

function getNodeLocation(
  filePath: string,
  content: string,
  lineCounter: LineCounter | undefined,
  node: unknown,
): SourceLocation | undefined {
  if (!isNode(node) || !node.range) {
    return undefined;
  }

  return createSourceLocationFromOffsets(
    filePath,
    content,
    node.range[0],
    node.range[1],
    lineCounter,
  );
}

function getPairKeyLocation(
  filePath: string,
  content: string,
  pair: Pair<unknown, unknown> | undefined,
): SourceLocation | undefined {
  return getNodeLocation(filePath, content, undefined, pair?.key);
}

function getRootType(root: unknown): ParsedYamlRootType {
  if (root == null) {
    return "null";
  }

  if (isMap(root)) {
    return "map";
  }

  if (isSeq(root)) {
    return "sequence";
  }

  if (isScalar(root)) {
    return "scalar";
  }

  return "unknown";
}

function locationFromYamlError(
  filePath: string,
  content: string,
  lineCounter: LineCounter,
  error: YamlErrorLike,
): SourceLocation | undefined {
  if (error.linePos?.[0]) {
    const start = error.linePos[0];
    const end = error.linePos[1] ?? start;

    return {
      filePath,
      line: start.line,
      column: start.col ?? 1,
      endLine: end.line,
      endColumn: end.col ?? start.col ?? 1,
    };
  }

  if (error.pos) {
    return createSourceLocationFromOffsets(
      filePath,
      content,
      error.pos[0],
      error.pos[1],
      lineCounter,
    );
  }

  return undefined;
}
