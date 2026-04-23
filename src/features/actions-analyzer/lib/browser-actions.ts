import type { WorkflowAnalysisReport } from "@/features/actions-analyzer/types";

export async function copyTextToClipboard(value: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available in this environment.");
  }

  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const didCopy = (
    document as Document & { execCommand?: (command: string) => boolean }
  ).execCommand?.("copy");

  document.body.removeChild(textarea);

  if (!didCopy) {
    throw new Error("Authos could not copy this text.");
  }
}

export function downloadTextFile({
  content,
  fileName,
  mimeType,
}: {
  content: string;
  fileName: string;
  mimeType: string;
}) {
  downloadBlob({
    blob: new Blob([content], {
      type: `${mimeType};charset=utf-8`,
    }),
    fileName,
  });
}

export function downloadBlob({
  blob,
  fileName,
}: {
  blob: Blob;
  fileName: string;
}) {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Downloads are not available in this environment.");
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

export function createReportDownloadBaseName(report: WorkflowAnalysisReport) {
  if (report.files.length === 1) {
    const fileName = report.files[0]?.path.split("/").at(-1) ?? "workflow";
    const withoutExtension = fileName.replace(/\.[A-Za-z0-9]+$/u, "");

    return `authos-${sanitizeFileNameSegment(withoutExtension)}`;
  }

  if (report.files.length > 1) {
    return "authos-workspace-report";
  }

  return "authos-workflow-report";
}

export function createSafeDownloadFileName({
  baseName,
  extension,
  timestamp,
}: {
  baseName: string;
  extension: string;
  timestamp?: string | undefined;
}) {
  const normalizedBaseName =
    sanitizeFileNameSegment(baseName) || "authos-report";
  const normalizedTimestamp = timestamp
    ? timestamp
        .replace(/[-:]/gu, "")
        .replace(/\.\d+Z$/u, "z")
        .replace(/T/gu, "-")
        .toLowerCase()
    : null;

  return normalizedTimestamp
    ? `${normalizedBaseName}-${normalizedTimestamp}.${extension}`
    : `${normalizedBaseName}.${extension}`;
}

function sanitizeFileNameSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "-")
    .replace(/[^a-z0-9._-]/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
}
