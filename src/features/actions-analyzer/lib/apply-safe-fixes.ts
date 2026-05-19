import { applySuggestedFix } from "@/features/actions-analyzer/lib/suggested-fixes";
import type {
  AnalyzerFinding,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

export interface ApplySafeFixesResult {
  appliedCount: number;
  files: WorkflowInputFile[];
  skippedCount: number;
}

export function applyAllSafeFixes({
  analyzedContentsByPath,
  files,
  findings,
}: {
  analyzedContentsByPath: Record<string, string>;
  files: WorkflowInputFile[];
  findings: AnalyzerFinding[];
}): ApplySafeFixesResult {
  const safeFindings = findings
    .filter((finding) => finding.fix?.safety === "safe" && finding.fix)
    .sort((left, right) => {
      const leftLine = left.location?.line ?? 0;
      const rightLine = right.location?.line ?? 0;

      if (left.filePath !== right.filePath) {
        return left.filePath.localeCompare(right.filePath);
      }

      return rightLine - leftLine;
    });

  const nextFiles = files.map((file) => ({ ...file }));
  let appliedCount = 0;
  let skippedCount = 0;

  for (const finding of safeFindings) {
    const fix = finding.fix;

    if (!fix) {
      continue;
    }

    const fileIndex = nextFiles.findIndex(
      (file) => file.path === finding.filePath,
    );

    if (fileIndex === -1) {
      skippedCount += 1;
      continue;
    }

    const currentFile = nextFiles[fileIndex];

    if (!currentFile) {
      skippedCount += 1;
      continue;
    }

    const analyzedContent =
      analyzedContentsByPath[finding.filePath] ?? currentFile.content;
    const result = applySuggestedFix({
      analyzedContent,
      currentContent: currentFile.content,
      fix,
    });

    if (!result.ok) {
      skippedCount += 1;
      continue;
    }

    nextFiles[fileIndex] = {
      ...currentFile,
      content: result.nextContent,
      sizeBytes: new TextEncoder().encode(result.nextContent).byteLength,
    };
    appliedCount += 1;
  }

  return {
    appliedCount,
    files: nextFiles,
    skippedCount,
  };
}
