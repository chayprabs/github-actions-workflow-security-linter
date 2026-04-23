"use client";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OverlayPanel } from "@/components/ui/overlay-panel";
import {
  canReloadHistoryEntry,
  type RecentAnalysisHistoryEntry,
} from "@/features/actions-analyzer/lib/analysis-history";

interface AnalysisHistoryPanelProps {
  entries: RecentAnalysisHistoryEntry[];
  onClearHistory: () => void;
  onClose: () => void;
  onReloadEntry: (entry: RecentAnalysisHistoryEntry) => void | Promise<void>;
  open: boolean;
  reloadingEntryId: string | null;
}

export function AnalysisHistoryPanel({
  entries,
  onClearHistory,
  onClose,
  onReloadEntry,
  open,
  reloadingEntryId,
}: AnalysisHistoryPanelProps) {
  return (
    <OverlayPanel
      description="Recent analysis history stays on this device. By default it stores metadata only, not pasted or uploaded YAML content."
      onClose={onClose}
      open={open}
      title="Recent history"
      variant="drawer"
    >
      <div className="space-y-5">
        <Alert title="Private content stays opt-in" tone="info">
          Sample and public GitHub imports can be reopened without storing
          workflow content. Pasted and uploaded YAML only becomes reloadable if
          you enable local content history in settings.
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {entries.length} saved {entries.length === 1 ? "run" : "runs"}
            </p>
            <p className="text-sm text-muted-foreground">
              Newer runs replace older duplicates and the newest 12 entries are
              kept.
            </p>
          </div>
          <Button
            disabled={entries.length === 0}
            onClick={onClearHistory}
            variant="ghost"
          >
            Clear history
          </Button>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            description="Run an analysis and it will appear here for quick local reuse."
            title="No recent analysis history yet"
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const reloadable = canReloadHistoryEntry(entry);
              const uniqueImportUrls = Array.from(
                new Set(entry.githubImports.map((item) => item.importUrl)),
              );
              const isReloading = reloadingEntryId === entry.id;

              return (
                <article
                  className="rounded-2xl border border-border/80 bg-background/70 p-4"
                  key={entry.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="info">Score {entry.score}</Badge>
                        <Badge tone="subtle">
                          {entry.totalFindings}{" "}
                          {entry.totalFindings === 1 ? "finding" : "findings"}
                        </Badge>
                        <Badge tone="subtle">
                          {entry.workflowCount}{" "}
                          {entry.workflowCount === 1 ? "workflow" : "workflows"}
                        </Badge>
                        {entry.rememberedFiles?.length ? (
                          <Badge tone="success">Content remembered</Badge>
                        ) : reloadable ? (
                          <Badge tone="warning">
                            Reloadable without content
                          </Badge>
                        ) : (
                          <Badge tone="subtle">Metadata only</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {formatHistoryTimestamp(entry.timestamp)}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {entry.fileNames.join(", ")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {entry.sourceKinds.map((sourceKind) => (
                          <Badge
                            key={`${entry.id}:${sourceKind}`}
                            tone="subtle"
                          >
                            {formatSourceKind(sourceKind)}
                          </Badge>
                        ))}
                        {entry.selectedSampleId ? (
                          <Badge tone="info">Sample reload available</Badge>
                        ) : null}
                      </div>
                    </div>

                    <Button
                      aria-label={`Reload history entry from ${formatHistoryTimestamp(entry.timestamp)}`}
                      disabled={!reloadable || isReloading}
                      onClick={() => {
                        void onReloadEntry(entry);
                      }}
                      variant={reloadable ? "secondary" : "ghost"}
                    >
                      {isReloading ? "Reloading..." : "Reload"}
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/80 bg-card/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Severity counts
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        Critical {entry.severityCounts.critical}, high{" "}
                        {entry.severityCounts.high}, medium{" "}
                        {entry.severityCounts.medium}, low{" "}
                        {entry.severityCounts.low}, info{" "}
                        {entry.severityCounts.info}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-card/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Reopen path
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {entry.rememberedFiles?.length
                          ? "Saved content on this device"
                          : reloadable
                            ? "Refetch from public source or sample"
                            : "Metadata only"}
                      </p>
                    </div>
                  </div>

                  {uniqueImportUrls.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-border/80 bg-card/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Public GitHub source
                      </p>
                      <div className="mt-2 space-y-2">
                        {uniqueImportUrls.map((importUrl) => (
                          <a
                            className="block break-all text-sm text-info underline-offset-4 hover:underline"
                            href={importUrl}
                            key={`${entry.id}:${importUrl}`}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {importUrl}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </OverlayPanel>
  );
}

function formatHistoryTimestamp(timestamp: string) {
  const parsedTimestamp = Date.parse(timestamp);

  if (Number.isNaN(parsedTimestamp)) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedTimestamp);
}

function formatSourceKind(
  sourceKind: RecentAnalysisHistoryEntry["sourceKinds"][number],
) {
  switch (sourceKind) {
    case "github":
      return "GitHub import";
    case "paste":
      return "Paste";
    case "sample":
      return "Sample";
    case "upload":
      return "Upload";
    default:
      return sourceKind;
  }
}
