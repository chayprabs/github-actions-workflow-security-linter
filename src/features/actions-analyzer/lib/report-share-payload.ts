import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

import { parseAnalyzerShareState } from "@/features/actions-analyzer/lib/report-share";
import type { AnalyzerShareState } from "@/features/actions-analyzer/lib/report-share";
import type { WorkflowInputFile } from "@/features/actions-analyzer/types";

export const maxSharePayloadBytes = 32_000;

export interface WorkflowSharePayload {
  files: Array<{
    content: string;
    path: string;
    sourceKind: WorkflowInputFile["sourceKind"];
  }>;
  shareState?: AnalyzerShareState | undefined;
}

export type EncodeSharePayloadResult =
  | { ok: true; payloadParam: string }
  | { ok: false; reason: string; byteLength: number };

export function encodeWorkflowSharePayload(
  payload: WorkflowSharePayload,
): EncodeSharePayloadResult {
  const serialized = JSON.stringify(payload);
  const payloadParam = compressToEncodedURIComponent(serialized);
  const byteLength = new TextEncoder().encode(payloadParam).byteLength;

  if (byteLength > maxSharePayloadBytes) {
    return {
      byteLength,
      ok: false,
      reason: `This workspace is too large to share in a URL (${byteLength} bytes compressed; limit is ${maxSharePayloadBytes}). Download JSON instead.`,
    };
  }

  return {
    ok: true,
    payloadParam,
  };
}

function isValidSharePayloadFile(
  value: unknown,
): value is WorkflowSharePayload["files"][number] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WorkflowSharePayload["files"][number]>;

  return (
    typeof candidate.content === "string" &&
    typeof candidate.path === "string" &&
    (candidate.sourceKind === "paste" ||
      candidate.sourceKind === "upload" ||
      candidate.sourceKind === "sample" ||
      candidate.sourceKind === "github")
  );
}

function sanitizeShareState(
  shareState: unknown,
): AnalyzerShareState | undefined {
  if (!shareState || typeof shareState !== "object") {
    return undefined;
  }

  const candidate = shareState as AnalyzerShareState;
  const params = new URLSearchParams();

  if (candidate.sampleId) {
    params.set("sample", candidate.sampleId);
  }

  if (candidate.previousSampleId) {
    params.set("prevSample", candidate.previousSampleId);
  }

  if (candidate.workspaceMode === "compare") {
    params.set("workspace", "compare");
  }

  if (Array.isArray(candidate.disabledRuleIds)) {
    params.set("rulesOff", candidate.disabledRuleIds.join(","));
  }

  const parsed = parseAnalyzerShareState(`?${params.toString()}`);
  const sanitized: AnalyzerShareState = {};

  if (parsed.sampleId) {
    sanitized.sampleId = parsed.sampleId;
  }

  if (parsed.previousSampleId) {
    sanitized.previousSampleId = parsed.previousSampleId;
  }

  if (parsed.workspaceMode === "compare") {
    sanitized.workspaceMode = "compare";
  }

  if (parsed.disabledRuleIds) {
    sanitized.disabledRuleIds = parsed.disabledRuleIds;
  }

  if (candidate.settings && typeof candidate.settings === "object") {
    sanitized.settings = candidate.settings;
  }

  if (candidate.results && typeof candidate.results === "object") {
    sanitized.results = parsed.results;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function decodeWorkflowSharePayload(
  payloadParam: string,
): WorkflowSharePayload | null {
  try {
    const decompressed = decompressFromEncodedURIComponent(payloadParam);

    if (!decompressed) {
      return null;
    }

    const decompressedSize = new TextEncoder().encode(decompressed).byteLength;

    if (decompressedSize > maxSharePayloadBytes * 4) {
      return null;
    }

    const parsed = JSON.parse(decompressed) as WorkflowSharePayload;

    if (
      !parsed ||
      !Array.isArray(parsed.files) ||
      parsed.files.length === 0 ||
      !parsed.files.every(isValidSharePayloadFile)
    ) {
      return null;
    }

    return {
      files: parsed.files,
      shareState: sanitizeShareState(parsed.shareState),
    };
  } catch {
    return null;
  }
}

export function buildContentIncludingShareUrl({
  baseUrl,
  payload,
}: {
  baseUrl: string;
  payload: WorkflowSharePayload;
}) {
  const encoded = encodeWorkflowSharePayload(payload);

  if (!encoded.ok) {
    return encoded;
  }

  const url = new URL(baseUrl);
  url.searchParams.set("payload", encoded.payloadParam);

  return {
    ok: true as const,
    url: url.toString(),
  };
}
