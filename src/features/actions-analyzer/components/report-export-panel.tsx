"use client";

import { useState } from "react";
import { Copy, Download, Link2, Share2 } from "lucide-react";

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
  buildContentIncludingShareUrl,
  type WorkflowSharePayload,
} from "@/features/actions-analyzer/lib/report-share-payload";
import {
  buildPrivacySafeShareUrl,
  getPrivacySafeShareableSampleId,
  type ResultsShareState,
} from "@/features/actions-analyzer/lib/report-share";
import { usePushActionToast } from "@/features/actions-analyzer/components/action-toast-provider";
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
  const pushToast = usePushActionToast();
  const [showContentShareConfirm, setShowContentShareConfirm] = useState(false);

  function getShareBaseUrl() {
    return typeof window === "undefined"
      ? "https://authos.local/tools/github-actions-workflow-analyzer"
      : `${window.location.origin}${window.location.pathname}`;
  }

  function buildShareState() {
    return {
      disabledRuleIds: report.settings.disabledRuleIds,
      results: resultsShareState,
      sampleId: getPrivacySafeShareableSampleId({
        files,
        selectedSampleId,
      }),
      settings: report.settings,
    };
  }

  async function handleCopyPrComment() {
    try {
      await copyTextToClipboard(buildPrCommentMarkdown(report));
      pushToast({
        message: "PR comment copied to the clipboard.",
        tone: "success",
      });
    } catch {
      pushToast({
        message: "Authos could not copy the PR comment.",
        tone: "danger",
      });
    }
  }

  async function handleCopyShareLink() {
    try {
      const shareUrl = buildPrivacySafeShareUrl({
        baseUrl: getShareBaseUrl(),
        state: buildShareState(),
      });

      await copyTextToClipboard(shareUrl);
      pushToast({
        message:
          "Privacy-safe share link copied. Workflow content is not included.",
        tone: "success",
      });
    } catch {
      pushToast({
        message: "Authos could not copy the share link.",
        tone: "danger",
      });
    }
  }

  async function handleCopyContentShareLink() {
    const payload: WorkflowSharePayload = {
      files: files.map((file) => ({
        content: file.content,
        path: file.path,
        sourceKind: file.sourceKind,
      })),
      shareState: buildShareState(),
    };
    const encoded = buildContentIncludingShareUrl({
      baseUrl: getShareBaseUrl(),
      payload,
    });

    if (!encoded.ok) {
      pushToast({
        message: encoded.reason,
        tone: "danger",
      });
      return;
    }

    try {
      await copyTextToClipboard(encoded.url);
      setShowContentShareConfirm(false);
      pushToast({
        message:
          "Content-including share link copied. Anyone with the URL can read the embedded workflow YAML.",
        tone: "success",
      });
    } catch {
      pushToast({
        message: "Authos could not copy the content share link.",
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
      pushToast({
        message: "JSON report download started.",
        tone: "success",
      });
    } catch {
      pushToast({
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
      pushToast({
        message: "SARIF download started.",
        tone: "success",
      });
    } catch {
      pushToast({
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
      pushToast({
        message: "HTML report download started.",
        tone: "success",
      });
    } catch {
      pushToast({
        message: "Authos could not start the HTML download.",
        tone: "danger",
      });
    }
  }

  return (
    <section
      className="rounded-xl border border-border/80 bg-background/70 p-4"
      data-testid="results-report-exports"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">Exports</Badge>
        <Badge tone="success">Ready</Badge>
        <Badge tone="warning">Share links stay privacy-safe by default</Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">
        Export and share
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Copy a PR-ready summary or download machine-readable reports. The
        default share link restores filters, disabled rules, and sample IDs only.
        Opt in to a content-including link when you need to restore pasted YAML.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleCopyPrComment} variant="secondary">
          <Copy className="h-4 w-4" />
          Copy PR comment
        </Button>
        <Button onClick={handleCopyShareLink} variant="secondary">
          <Share2 className="h-4 w-4" />
          Copy privacy-safe link
        </Button>
        <Button
          onClick={() => {
            setShowContentShareConfirm(true);
          }}
          variant="secondary"
        >
          <Link2 className="h-4 w-4" />
          Copy link with workflow
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

      {showContentShareConfirm ? (
        <div
          className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
          data-testid="content-share-confirm"
        >
          <p className="text-sm font-semibold text-foreground">
            Share workflow content in the URL?
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This link embeds compressed YAML in the query string. Anyone with the
            URL can read your workflow files. Authos still does not upload them to
            a server.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={handleCopyContentShareLink} size="sm">
              Copy content link
            </Button>
            <Button
              onClick={() => {
                setShowContentShareConfirm(false);
              }}
              size="sm"
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Privacy note
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">
          Privacy-safe links never include pasted or uploaded workflow content.
          Content-including links are opt-in, size-limited, and intended for
          trusted reviewers only.
        </p>
      </div>
    </section>
  );
}
