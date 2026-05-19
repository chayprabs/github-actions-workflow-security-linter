import type { WorkflowAnalysisReport } from "@/features/actions-analyzer/types";

export interface ReportSnapshotEntry {
  createdAt: string;
  id: string;
  label: string;
  report: WorkflowAnalysisReport;
  score: number;
}

const reportSnapshotsStorageKey = "authos.actions-analyzer.snapshots.v1";
const maxReportSnapshots = 20;

export function readReportSnapshots(): ReportSnapshotEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(reportSnapshotsStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as ReportSnapshotEntry[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => {
      return (
        typeof entry.id === "string" &&
        typeof entry.label === "string" &&
        typeof entry.createdAt === "string" &&
        entry.report &&
        typeof entry.report === "object"
      );
    });
  } catch {
    return [];
  }
}

export function writeReportSnapshots(entries: ReportSnapshotEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    reportSnapshotsStorageKey,
    JSON.stringify(entries.slice(0, maxReportSnapshots)),
  );
}

export function saveReportSnapshot({
  label,
  report,
}: {
  label?: string | undefined;
  report: WorkflowAnalysisReport;
}) {
  const snapshots = readReportSnapshots();
  const entry: ReportSnapshotEntry = {
    createdAt: new Date().toISOString(),
    id: `snapshot-${Date.now()}`,
    label:
      label?.trim() ||
      `Report ${report.summary.score}/100 (${report.summary.grade})`,
    report,
    score: report.summary.score,
  };

  writeReportSnapshots([entry, ...snapshots].slice(0, maxReportSnapshots));

  return entry;
}

export function deleteReportSnapshot(snapshotId: string) {
  writeReportSnapshots(
    readReportSnapshots().filter((entry) => entry.id !== snapshotId),
  );
}

export function clearReportSnapshots() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(reportSnapshotsStorageKey);
}
