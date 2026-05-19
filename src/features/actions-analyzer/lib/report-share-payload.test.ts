import { describe, expect, it } from "vitest";

import {
  decodeWorkflowSharePayload,
  encodeWorkflowSharePayload,
} from "@/features/actions-analyzer/lib/report-share-payload";

describe("report-share-payload", () => {
  it("round-trips a small workflow payload", () => {
    const payload = {
      files: [
        {
          content: "name: test\non: push\n",
          path: ".github/workflows/ci.yml",
          sourceKind: "paste" as const,
        },
      ],
      shareState: {
        disabledRuleIds: ["GHA201"],
      },
    };

    const encoded = encodeWorkflowSharePayload(payload);

    expect(encoded.ok).toBe(true);

    if (!encoded.ok) {
      return;
    }

    const decoded = decodeWorkflowSharePayload(encoded.payloadParam);

    expect(decoded).toEqual(payload);
  });

  it("rejects oversized payloads", () => {
    const noisyContent = Array.from(
      { length: 120_000 },
      (_, index) => `step-${index}: ${(index * 17) % 9973}\n`,
    ).join("");
    const payload = {
      files: [
        {
          content: `name: large\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: |\n${noisyContent}`,
          path: ".github/workflows/large.yml",
          sourceKind: "paste" as const,
        },
      ],
    };

    const encoded = encodeWorkflowSharePayload(payload);

    expect(encoded.ok).toBe(false);
  });
});
