import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

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

export function decodeWorkflowSharePayload(
  payloadParam: string,
): WorkflowSharePayload | null {
  try {
    const decompressed = decompressFromEncodedURIComponent(payloadParam);

    if (!decompressed) {
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

    return parsed;
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
