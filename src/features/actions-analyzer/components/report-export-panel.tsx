"use client";

import { Copy, Download, Share2 } from "lucide-react";

import { ActionToast } from "@/features/actions-analyzer/components/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  copyTextToClipboard,
  createReportDownloadBaseName,
  createSafeDownloadFileName,
  downloadTextFile,
} from "@/features/actions-analyzer/lib/browser-actions";
import {
  buildHtmlReport,
  buildPrCommentMarkdown,
  buildSarifReport,
  serializeReportAsJson,
} from "@/features/actions-analyzer/lib/report-exports";
import {
  buildPrivacySafeShareUrl,
  getPrivacySafeShareableSampleId,
  type ResultsShareState,
} from "@/features/actions-analyzer/lib/report-share";
import { useActionToast } from "@/features/actions-analyzer/lib/use-action-toast";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import type {
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

export function ReportExportPanel({
  files,
  report,
  resultsShareState,
  selectedSampleId,
}: {
  files: WorkflowInputFile[];
  report: WorkflowAnalysisReport;
  resultsShareState: ResultsShareState;
  selectedSampleId: WorkflowSampleId | "manual";
}) {
  const { setToast, toast } = useActionToast();

  async function handleCopyPrComment() {
    try {
      await copyTextToClipboard(buildPrCommentMarkdown(report));
      setToast({
        message: "PR comment copied to the clipboard.",
        tone: "success",
      });
    } catch {
      setToast({
        message: "Authos could not copy the PR comment.",
        tone: "danger",
      });
    }
  }

  async function handleCopyShareLink() {
    try {
      const shareUrl = buildPrivacySafeShareUrl({
        baseUrl:
          typeof window === "undefined"
            ? "https://authos.local/tools/github-actions-workflow-analyzer"
            : `${window.location.origin}${window.location.pathname}`,
        state: {
          results: resultsShareState,
          sampleId: getPrivacySafeShareableSampleId({
            files,
            selectedSampleId,
          }),
          settings: report.settings,
        },
      });

      await copyTextToClipboard(shareUrl);
      setToast({
        message:
          "Privacy-safe share link copied. Workflow content is not included.",
        tone: "success",
      });
    } catch {
      setToast({
        message: "Authos could not copy the share link.",
        tone: "danger",
      });
    }
  }

  function handleDownloadJson() {
    try {
      downloadTextFile({
        content: serializeReportAsJson(report),
        fileName: createSafeDownloadFileName({
          baseName: createReportDownloadBaseName(report),
          extension: "json",
          timestamp: report.generatedAt,
        }),
        mimeType: "application/json",
      });
      setToast({
        message: "JSON report download started.",
        tone: "success",
      });
    } catch {
      setToast({
        message: "Authos could not start the JSON download.",
        tone: "danger",
      });
    }
  }

  function handleDownloadSarif() {
    try {
      downloadTextFile({
        content: JSON.stringify(buildSarifReport(report), null, 2),
        fileName: createSafeDownloadFileName({
          baseName: `${createReportDownloadBaseName(report)}-sarif`,
          extension: "sarif.json",
          timestamp: report.generatedAt,
        }),
        mimeType: "application/sarif+json",
      });
      setToast({
        message: "SARIF download started.",
        tone: "success",
      });
    } catch {
      setToast({
        message: "Authos could not start the SARIF download.",
        tone: "danger",
      });
    }
  }

  function handleDownloadHtml() {
    try {
      downloadTextFile({
        content: buildHtmlReport(report),
        fileName: createSafeDownloadFileName({
          baseName: `${createReportDownloadBaseName(report)}-report`,
          extension: "html",
          timestamp: report.generatedAt,
        }),
        mimeType: "text/html",
      });
      setToast({
        message: "HTML report download started.",
        tone: "success",
      });
    } catch {
      setToast({
        message: "Authos could not start the HTML download.",
        tone: "danger",
      });
    }
  }

  return (
    <>
      <section
        className="rounded-xl border border-border/80 bg-background/70 p-4"
        data-testid="results-report-exports"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">Exports</Badge>
          <Badge tone="success">Ready</Badge>
          <Badge tone="warning">Share links stay privacy-safe</Badge>
        </div>
        <h3 className="mt-3 text-sm font-semibold text-foreground">
          Export and share
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Copy a PR-ready summary or download machine-readable reports. Share
          links include filters and sample identifiers when possible, but this
          version never embeds pasted or uploaded workflow content in the URL.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleCopyPrComment} variant="secondary">
            <Copy className="h-4 w-4" />
            Copy PR comment
          </Button>
          <Button onClick={handleCopyShareLink} variant="secondary">
            <Share2 className="h-4 w-4" />
            Copy share link
          </Button>
          <Button onClick={handleDownloadJson} variant="secondary">
            <Download className="h-4 w-4" />
            Download JSON
          </Button>
          <Button onClick={handleDownloadSarif} variant="secondary">
            <Download className="h-4 w-4" />
            Download SARIF
          </Button>
          <Button onClick={handleDownloadHtml} variant="secondary">
            <Download className="h-4 w-4" />
            Download HTML
          </Button>
        </div>

        <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Privacy note
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            Content-including share links are intentionally deferred. Only
            sample IDs, view state, and safe review filters are shared by URL.
          </p>
        </div>
      </section>

      <ActionToast toast={toast} />
    </>
  );
}
