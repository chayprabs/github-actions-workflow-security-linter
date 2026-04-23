import type { SourceLocation, SourceRange } from "@/features/actions-analyzer/types";

export function createSourceRangeFromOffsets(
  filePath: string,
  content: string,
  startOffset: number,
  endOffset: number,
): SourceRange {
  return {
    start: createSourceLocationFromOffset(filePath, content, startOffset),
    end: createSourceLocationFromOffset(
      filePath,
      content,
      Math.max(startOffset, endOffset),
    ),
  };
}

export function createSourceLocationFromOffset(
  filePath: string,
  content: string,
  offset: number,
): SourceLocation {
  const lineStarts = getLineStarts(content);
  const safeOffset = clamp(offset, 0, content.length);
  let lineIndex = 0;

  for (let index = 0; index < lineStarts.length; index += 1) {
    const lineStart = lineStarts[index] ?? 0;
    const nextLineStart = lineStarts[index + 1] ?? Number.POSITIVE_INFINITY;

    if (safeOffset >= lineStart && safeOffset < nextLineStart) {
      lineIndex = index;
      break;
    }

    if (safeOffset >= lineStart) {
      lineIndex = index;
    }
  }

  const lineStart = lineStarts[lineIndex] ?? 0;
  const lineEnd = getLineEndOffset(content, lineStarts, lineIndex + 1);
  const column = clamp(safeOffset - lineStart + 1, 1, lineEnd - lineStart + 1);

  return {
    filePath,
    line: lineIndex + 1,
    column,
    endLine: lineIndex + 1,
    endColumn: column,
  };
}

export function detectLineEnding(content: string) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

export function getLineContent(content: string, lineNumber: number) {
  const lineStarts = getLineStarts(content);
  const lineStart = lineStarts[lineNumber - 1] ?? 0;
  const lineEnd = getLineEndOffset(content, lineStarts, lineNumber);

  return content.slice(lineStart, lineEnd);
}

export function getLineEndOffset(
  content: string,
  lineStarts: number[],
  lineNumber: number,
) {
  const lineStart = lineStarts[lineNumber - 1] ?? 0;
  const nextLineStart = lineStarts[lineNumber] ?? content.length;

  return getLineBreakStart(content, lineStart, nextLineStart);
}

export function getLineStarts(content: string) {
  const lineStarts = [0];

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === "\r") {
      if (content[index + 1] === "\n") {
        index += 1;
      }

      lineStarts.push(index + 1);
      continue;
    }

    if (character === "\n") {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}

export function getLocationText(
  content: string,
  range: SourceRange,
) {
  const { from, to } = getOffsetsForSourceRange(content, range);

  return content.slice(from, to);
}

export function getOffsetsForSourceRange(
  content: string,
  range: SourceRange,
) {
  const lineStarts = getLineStarts(content);
  const from = getOffsetForLineColumn(
    content,
    lineStarts,
    range.start.line,
    range.start.column,
  );
  const to = getOffsetForLineColumn(
    content,
    lineStarts,
    range.end.line,
    range.end.column,
  );

  return {
    from,
    to: Math.max(from, to),
  };
}

export function getStartOfNextLineOffset(content: string, lineNumber: number) {
  const lineStarts = getLineStarts(content);

  return lineStarts[lineNumber] ?? getLineEndOffset(content, lineStarts, lineNumber);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getLineBreakStart(content: string, lineStart: number, lineEnd: number) {
  let nextLineStart = lineEnd;

  while (
    nextLineStart > lineStart &&
    (content[nextLineStart - 1] === "\n" || content[nextLineStart - 1] === "\r")
  ) {
    nextLineStart -= 1;
  }

  return nextLineStart;
}

function getOffsetForLineColumn(
  content: string,
  lineStarts: number[],
  lineNumber: number,
  column: number,
) {
  const lineStart = lineStarts[lineNumber - 1] ?? 0;
  const lineEnd = getLineEndOffset(content, lineStarts, lineNumber);

  return lineStart + clamp(column - 1, 0, lineEnd - lineStart);
}
