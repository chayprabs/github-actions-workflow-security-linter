"use client";

import { useState } from "react";
import { Bookmark, GitCompareArrows, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePushActionToast } from "@/features/actions-analyzer/components/action-toast-provider";
import {
  deleteReportSnapshot,
  readReportSnapshots,
  saveReportSnapshot,
  type ReportSnapshotEntry,
} from "@/features/actions-analyzer/lib/report-snapshots";
import type { WorkflowAnalysisReport } from "@/features/actions-analyzer/types";

export function ReportSnapshotsPanel({
  onCompareSnapshot,
  rememberSnapshots,
  report,
}: {
  onCompareSnapshot?: ((snapshot: ReportSnapshotEntry) => void) | undefined;
  rememberSnapshots: boolean;
  report: WorkflowAnalysisReport;
}) {
  const pushToast = usePushActionToast();
  const [refreshKey, setRefreshKey] = useState(0);
  void refreshKey;
  const snapshots = readReportSnapshots();

  if (!rememberSnapshots) {
    return (
      <section
        className="rounded-xl border border-border/80 bg-background/70 p-4"
        data-testid="report-snapshots-disabled"
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Report snapshots are off. Enable &quot;Remember report snapshots&quot;
          in settings to save analysis results locally for later comparison.
        </p>
      </section>
    );
  }

  function handleSaveSnapshot() {
    const entry = saveReportSnapshot({ report });
    setRefreshKey((current) => current + 1);
    pushToast({
      message: `Saved snapshot "${entry.label}".`,
      tone: "success",
    });
  }

  function handleDeleteSnapshot(snapshotId: string) {
    deleteReportSnapshot(snapshotId);
    setRefreshKey((current) => current + 1);
    pushToast({
      message: "Report snapshot deleted.",
      tone: "success",
    });
  }

  return (
    <section
      className="rounded-xl border border-border/80 bg-background/70 p-4"
      data-testid="report-snapshots-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Report snapshots
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Save the current analysis locally and compare against it later
            without re-pasting workflows.
          </p>
        </div>
        <Button onClick={handleSaveSnapshot} size="sm" variant="secondary">
          <Bookmark className="h-4 w-4" />
          Save snapshot
        </Button>
      </div>

      {snapshots.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            description="Saved snapshots stay in this browser only and never leave your device."
            title="No report snapshots yet"
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {snapshots.map((snapshot) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/80 px-3 py-3"
              key={snapshot.id}
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {snapshot.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(snapshot.createdAt).toLocaleString()} · Score{" "}
                  {snapshot.score}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {onCompareSnapshot ? (
                  <Button
                    onClick={() => {
                      onCompareSnapshot(snapshot);
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    <GitCompareArrows className="h-4 w-4" />
                    Compare
                  </Button>
                ) : null}
                <Button
                  onClick={() => {
                    handleDeleteSnapshot(snapshot.id);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
