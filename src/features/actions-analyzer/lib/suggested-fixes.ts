import {
  getLocationText,
  getOffsetsForSourceRange,
} from "@/features/actions-analyzer/lib/source-location-utils";
import type { SuggestedFix } from "@/features/actions-analyzer/types";

export interface SuggestedFixPreview {
  content: string;
  format: "diff" | "snippet";
}

export type ApplySuggestedFixResult =
  | {
      nextContent: string;
      ok: true;
      preview: SuggestedFixPreview;
    }
  | {
      code: "invalid-range" | "stale" | "unsupported";
      message: string;
      ok: false;
    };

export function buildSuggestedFixPreview(
  analyzedContent: string,
  fix: SuggestedFix,
): SuggestedFixPreview | null {
  if (supportsPatchPreview(fix)) {
    const originalText = getLocationText(analyzedContent, fix.range);
    const replacementText = getReplacementText(fix);

    return {
      content: createPatchText(
        fix.filePath,
        fix.range.start.line,
        originalText,
        replacementText,
      ),
      format: "diff",
    };
  }

  if (typeof fix.replacement === "string" && fix.replacement.length > 0) {
    return {
      content: fix.replacement,
      format: "snippet",
    };
  }

  return null;
}

export function canApplySuggestedFix(fix: SuggestedFix) {
  return fix.safety === "safe" && supportsPatchPreview(fix);
}

export function applySuggestedFix(params: {
  analyzedContent: string;
  currentContent: string;
  fix: SuggestedFix;
}): ApplySuggestedFixResult {
  const { analyzedContent, currentContent, fix } = params;

  if (!supportsPatchPreview(fix)) {
    return {
      code: "unsupported",
      message: "This finding does not include an exact patchable source range.",
      ok: false,
    };
  }

  if (currentContent !== analyzedContent) {
    return {
      code: "stale",
      message: "Re-run analysis before applying this fix.",
      ok: false,
    };
  }

  const offsets = getOffsetsForSourceRange(analyzedContent, fix.range);

  if (
    offsets.from < 0 ||
    offsets.to < offsets.from ||
    offsets.to > analyzedContent.length
  ) {
    return {
      code: "invalid-range",
      message: "This suggested fix points at an invalid source range.",
      ok: false,
    };
  }

  const nextContent = [
    currentContent.slice(0, offsets.from),
    getReplacementText(fix),
    currentContent.slice(offsets.to),
  ].join("");
  const preview = buildSuggestedFixPreview(analyzedContent, fix);

  if (!preview) {
    return {
      code: "unsupported",
      message: "This finding does not include a patch preview.",
      ok: false,
    };
  }

  return {
    nextContent,
    ok: true,
    preview,
  };
}

export function supportsPatchPreview(
  fix: SuggestedFix,
): fix is SuggestedFix & { range: NonNullable<SuggestedFix["range"]> } {
  if (!fix.range || fix.kind === "manual") {
    return false;
  }

  if (fix.kind === "delete") {
    return true;
  }

  return typeof fix.replacement === "string";
}

function createPatchText(
  filePath: string,
  startLine: number,
  originalText: string,
  replacementText: string,
) {
  const originalLines = normalizePatchLines(originalText);
  const replacementLines = normalizePatchLines(replacementText);
  const lines = [
    `--- ${filePath}`,
    `+++ ${filePath}`,
    `@@ line ${startLine} @@`,
    ...originalLines.map((line) => `-${line}`),
    ...replacementLines.map((line) => `+${line}`),
  ];

  if (originalLines.length === 0 && replacementLines.length === 0) {
    lines.push("+");
  }

  return lines.join("\n");
}

function getReplacementText(fix: SuggestedFix) {
  if (fix.kind === "delete") {
    return "";
  }

  return fix.replacement ?? "";
}

function normalizePatchLines(value: string) {
  const normalizedValue = value.replace(/\r\n/gu, "\n");

  if (normalizedValue.length === 0) {
    return [];
  }

  const lines = normalizedValue.split("\n");

  if (lines.at(-1) === "") {
    lines.pop();
  }

  return lines;
}
