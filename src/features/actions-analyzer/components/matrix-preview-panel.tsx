"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  MatrixCombination,
  MatrixJobSummary,
  MatrixSummary,
} from "@/features/actions-analyzer/types";

interface MatrixPreviewPanelProps {
  maxCombinationsBeforeWarning?: number | undefined;
  matrixSummary: MatrixSummary;
}

export function MatrixPreviewPanel({
  maxCombinationsBeforeWarning = 16,
  matrixSummary,
}: MatrixPreviewPanelProps) {
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

  return (
    <article
      className="rounded-xl border border-border/80 bg-background/70 p-4"
      data-testid="matrix-preview-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">
          {matrixSummary.totalJobs}{" "}
          {matrixSummary.totalJobs === 1 ? "matrix job" : "matrix jobs"}
        </Badge>
        <Badge
          tone={
            matrixSummary.maxCombinations > maxCombinationsBeforeWarning
              ? "warning"
              : "subtle"
          }
        >
          {matrixSummary.maxCombinations} max combinations
        </Badge>
        <Badge tone={matrixSummary.warningCount > 0 ? "warning" : "success"}>
          {matrixSummary.warningCount} review{" "}
          {matrixSummary.warningCount === 1 ? "warning" : "warnings"}
        </Badge>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">Matrix preview</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Static matrices are expanded here so reviewers can inspect real job
        fan-out, include and exclude effects, and scheduling settings without
        mentally calculating the Cartesian product.
      </p>

      {matrixSummary.jobs.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            data-testid="matrix-preview-empty-state"
            description="This analysis run did not include any jobs with `strategy.matrix`."
            title="No matrix jobs detected"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {matrixSummary.jobs.map((job) => {
            const jobKey = `${job.filePath}:${job.jobId}`;
            const isExpanded = expandedJobs[jobKey] ?? false;

            return (
              <MatrixJobCard
                isExpanded={isExpanded}
                job={job}
                key={jobKey}
                maxCombinationsBeforeWarning={maxCombinationsBeforeWarning}
                onToggleExpanded={() => {
                  setExpandedJobs((current) => ({
                    ...current,
                    [jobKey]: !isExpanded,
                  }));
                }}
              />
            );
          })}
        </div>
      )}
    </article>
  );
}

function MatrixJobCard({
  isExpanded,
  job,
  maxCombinationsBeforeWarning,
  onToggleExpanded,
}: {
  isExpanded: boolean;
  job: MatrixJobSummary;
  maxCombinationsBeforeWarning: number;
  onToggleExpanded: () => void;
}) {
  const visibleCombinations = isExpanded
    ? job.finalCombinations
    : job.sampleCombinations;
  const copyValue =
    job.finalCombinations.length > 0
      ? JSON.stringify(
          job.finalCombinations.map((combination) => combination.values),
          null,
          2,
        )
      : "";
  const unmatchedEntryCount =
    job.excludeEntries.filter((entry) => entry.matchedBaseCombinations === 0)
      .length +
    job.includeEntries.filter((entry) => entry.matchedBaseCombinations === 0)
      .length;
  const reviewWarningCount =
    unmatchedEntryCount +
    (job.isUnresolved ? 1 : 0) +
    (job.finalCombinationCount === 0 && !job.isUnresolved ? 1 : 0);

  return (
    <section className="rounded-xl border border-border/80 bg-background/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Matrix</Badge>
            <Badge tone={getMatrixCountTone(job, maxCombinationsBeforeWarning)}>
              {formatCombinationCount(job.finalCombinationCount)}
            </Badge>
            {job.isUnresolved ? <Badge tone="warning">Unresolved</Badge> : null}
            {reviewWarningCount > 0 ? (
              <Badge tone="warning">
                {reviewWarningCount} review{" "}
                {reviewWarningCount === 1 ? "warning" : "warnings"}
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            {job.jobName && job.jobName !== job.jobId ? job.jobName : job.jobId}
          </h3>
          <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
            {job.filePath}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Job id:{" "}
            <span className="font-medium text-foreground">{job.jobId}</span>
          </p>
        </div>
        <CopyButton
          copiedLabel="Copied combinations"
          label="Copy combinations as JSON"
          value={copyValue}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MatrixMetaCard
          label="Axes"
          value={job.axisNames.length > 0 ? job.axisNames.join(", ") : "none"}
        />
        <MatrixMetaCard
          label="Base combinations"
          value={formatCombinationCount(job.baseCombinationCount)}
        />
        <MatrixMetaCard
          label="Excluded"
          value={formatCombinationCount(job.excludedCombinationCount)}
        />
        <MatrixMetaCard
          label="Include-only"
          value={formatCombinationCount(job.includeOnlyCombinationCount)}
        />
        <MatrixMetaCard
          label="Fail-fast"
          value={formatNullableBoolean(job.failFast)}
        />
        <MatrixMetaCard
          label="Max parallel"
          value={
            typeof job.maxParallel === "number"
              ? String(job.maxParallel)
              : "auto"
          }
        />
      </div>

      {job.isUnresolved ? (
        <Alert
          className="mt-4"
          title="Static preview unavailable"
          tone="warning"
        >
          <div className="space-y-1">
            {job.unresolvedReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </Alert>
      ) : visibleCombinations.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            data-testid={`matrix-preview-empty-${job.jobId}`}
            description="This job resolves to zero static combinations after include and exclude entries are applied."
            title="No combinations to preview"
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-sm">
            <caption className="sr-only">
              Matrix combinations for job {job.jobId}
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-3 py-2 font-medium" scope="col">
                  #
                </th>
                {job.combinationKeys.map((key) => (
                  <th className="px-3 py-2 font-medium" key={key} scope="col">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleCombinations.map((combination, index) => (
                <MatrixCombinationRow
                  combination={combination}
                  combinationIndex={index}
                  combinationKeys={job.combinationKeys}
                  key={`${JSON.stringify(combination.values)}:${index}`}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {job.hasMoreCombinations ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-muted-foreground">
            {isExpanded
              ? `Showing all ${job.finalCombinationCount} combinations. Large matrices can get noisy, so the preview defaults to the first ${job.sampleLimit}.`
              : `Showing the first ${job.sampleLimit} of ${job.finalCombinationCount} combinations. Expand carefully if you want the full matrix preview.`}
          </p>
          <Button onClick={onToggleExpanded} size="sm" variant="secondary">
            {isExpanded ? `Show first ${job.sampleLimit}` : "Show all"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function MatrixCombinationRow({
  combination,
  combinationIndex,
  combinationKeys,
}: {
  combination: MatrixCombination;
  combinationIndex: number;
  combinationKeys: string[];
}) {
  return (
    <tr className="rounded-xl border border-border/80 bg-background/70 align-top">
      <td className="rounded-l-xl px-3 py-3 font-medium text-foreground">
        {combinationIndex + 1}
      </td>
      {combinationKeys.map((key, index) => (
        <td
          className={
            index === combinationKeys.length - 1
              ? "rounded-r-xl px-3 py-3"
              : "px-3 py-3"
          }
          key={key}
        >
          <code className="break-all rounded bg-background/70 px-1.5 py-1 text-xs text-foreground">
            {formatMatrixValue(combination.values[key])}
          </code>
        </td>
      ))}
    </tr>
  );
}

function MatrixMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatCombinationCount(value: number | null) {
  return typeof value === "number" ? String(value) : "Unresolved";
}

function formatMatrixValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "undefined") {
    return "undefined";
  }

  return JSON.stringify(value);
}

function formatNullableBoolean(value: boolean | null) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "default";
}

function getMatrixCountTone(
  job: MatrixJobSummary,
  maxCombinationsBeforeWarning: number,
) {
  if (job.isUnresolved) {
    return "warning" as const;
  }

  if (job.finalCombinationCount === 0) {
    return "danger" as const;
  }

  if (
    typeof job.finalCombinationCount === "number" &&
    job.finalCombinationCount > maxCombinationsBeforeWarning
  ) {
    return "warning" as const;
  }

  return "success" as const;
}
