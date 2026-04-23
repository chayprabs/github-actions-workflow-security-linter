import {
  createSourceRangeFromOffsets,
  detectLineEnding,
  getLineContent,
  getLineEndOffset,
  getLineStarts,
  getStartOfNextLineOffset,
} from "@/features/actions-analyzer/lib/source-location-utils";
import type {
  SourceLocation,
  SuggestedFix,
} from "@/features/actions-analyzer/types";

interface BaseFixOptions {
  description: string;
  filePath: string;
  label: string;
  safety: SuggestedFix["safety"];
}

export function createInsertFixAfterLine(
  content: string,
  lineNumber: number,
  insertionText: string,
  options: BaseFixOptions,
): SuggestedFix {
  const lineStarts = getLineStarts(content);
  const insertionOffset = getStartOfNextLineOffset(content, lineNumber);
  const lineEndOffset = getLineEndOffset(content, lineStarts, lineNumber);
  const prefix = insertionOffset === lineEndOffset ? detectLineEnding(content) : "";

  return createInsertFixAtOffset(content, insertionOffset, `${prefix}${insertionText}`, options);
}

export function createInsertFixAtOffset(
  content: string,
  offset: number,
  insertionText: string,
  options: BaseFixOptions,
): SuggestedFix {
  return {
    description: options.description,
    filePath: options.filePath,
    kind: "insert",
    label: options.label,
    range: createSourceRangeFromOffsets(
      options.filePath,
      content,
      offset,
      offset,
    ),
    replacement: insertionText,
    safety: options.safety,
  };
}

export function createManualSnippetFix(
  snippet: string,
  options: BaseFixOptions,
): SuggestedFix {
  return {
    description: options.description,
    filePath: options.filePath,
    kind: "manual",
    label: options.label,
    replacement: snippet,
    safety: options.safety,
  };
}

export function createReplaceFixAtLocation(
  replacement: string,
  location: SourceLocation,
  options: BaseFixOptions,
): SuggestedFix {
  return {
    description: options.description,
    filePath: options.filePath,
    kind: "replace",
    label: options.label,
    range: {
      start: {
        filePath: location.filePath,
        line: location.line,
        column: location.column,
        endLine: location.line,
        endColumn: location.column,
      },
      end: {
        filePath: location.filePath,
        line: location.endLine,
        column: location.endColumn + 1,
        endLine: location.endLine,
        endColumn: location.endColumn + 1,
      },
    },
    replacement,
    safety: options.safety,
  };
}

export function findTopLevelInsertionOffset(content: string) {
  const lineStarts = getLineStarts(content);

  for (let lineNumber = 1; lineNumber <= lineStarts.length; lineNumber += 1) {
    const trimmedLine = getLineContent(content, lineNumber).trim();

    if (
      trimmedLine.length === 0 ||
      trimmedLine === "---" ||
      trimmedLine.startsWith("#")
    ) {
      continue;
    }

    return lineStarts[lineNumber - 1] ?? 0;
  }

  return content.length;
}

export function hasSimpleMappingKeyLine(content: string, lineNumber: number) {
  const trimmedLine = getLineContent(content, lineNumber).trim();

  return /:\s*(?:#.*)?$/u.test(trimmedLine) && !trimmedLine.includes("{");
}
