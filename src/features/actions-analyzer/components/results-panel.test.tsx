import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  emptyAnalysisReport,
  sampleAnalysisReport,
} from "@/features/actions-analyzer/fixtures/reports";
import { ResultsPanel } from "@/features/actions-analyzer/components/results-panel";

describe("ResultsPanel", () => {
  it("calls onFindingSelect when a finding card is clicked", () => {
    const handleFindingSelect = vi.fn();

    render(
      <ResultsPanel
        activeFileName=".github/workflows/release-risky.yml"
        activeFindingId={null}
        analysisError={null}
        hasInput
        isAnalyzing={false}
        onFindingSelect={handleFindingSelect}
        report={sampleAnalysisReport}
        selectedSampleId="risky-pull-request-target"
        selectedSampleLabel="Sample"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /First-party reference uses a mutable tag/i,
      }),
    );

    expect(handleFindingSelect).toHaveBeenCalledTimes(1);
    expect(handleFindingSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: "GHA201",
      }),
    );
  });

  it("marks the active finding as selected", () => {
    const [activeFinding] = sampleAnalysisReport.findings;

    expect(activeFinding).toBeDefined();

    render(
      <ResultsPanel
        activeFileName=".github/workflows/release-risky.yml"
        activeFindingId={activeFinding!.id}
        analysisError={null}
        hasInput
        isAnalyzing={false}
        onFindingSelect={vi.fn()}
        report={sampleAnalysisReport}
        selectedSampleId="risky-pull-request-target"
        selectedSampleLabel="Sample"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /First-party reference uses a mutable tag/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("renders score and inventory summary data", () => {
    render(
      <ResultsPanel
        activeFileName=".github/workflows/release-risky.yml"
        activeFindingId={null}
        analysisError={null}
        hasInput
        isAnalyzing={false}
        lastAnalyzedAt={Date.parse("2026-04-23T12:30:00.000Z")}
        onFindingSelect={vi.fn()}
        report={sampleAnalysisReport}
        selectedSampleId="risky-pull-request-target"
        selectedSampleLabel="Sample"
      />,
    );

    const scoreCard = screen.getByTestId("results-score");

    expect(scoreCard).toBeInTheDocument();
    expect(
      screen.getByTestId("results-permission-minimizer"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("results-attack-paths")).toBeInTheDocument();
    expect(screen.getByTestId("results-action-inventory")).toBeInTheDocument();
    expect(screen.getByTestId("results-report-exports")).toBeInTheDocument();
    expect(within(scoreCard).getByText(/^Jobs$/i)).toBeVisible();
    expect(
      screen.getByText(/Copy recommended permissions YAML/i),
    ).toBeVisible();
    expect(
      screen.getByText(/PR head code could run with repository write access/i),
    ).toBeVisible();
    expect(screen.getByText(/Copy PR comment/i)).toBeVisible();
    expect(screen.getByText(/Download SARIF/i)).toBeVisible();
  });

  it("filters findings by search and shows the hidden-by-filters empty state", () => {
    render(
      <ResultsPanel
        activeFileName=".github/workflows/release-risky.yml"
        activeFindingId={null}
        analysisError={null}
        hasInput
        isAnalyzing={false}
        onFindingSelect={vi.fn()}
        report={sampleAnalysisReport}
        selectedSampleId="risky-pull-request-target"
        selectedSampleLabel="Sample"
      />,
    );

    fireEvent.change(screen.getByTestId("results-filter-search"), {
      target: { value: "top-level permissions" },
    });

    expect(
      screen.getByText(/Top-level permissions are not declared explicitly/i),
    ).toBeVisible();

    fireEvent.change(screen.getByTestId("results-filter-search"), {
      target: { value: "no-such-finding" },
    });

    expect(
      screen.getByText(/All matching findings are hidden by filters\./i),
    ).toBeVisible();
  });

  it("shows the clean success state when a valid report has no findings", () => {
    render(
      <ResultsPanel
        activeFileName=".github/workflows/clean.yml"
        activeFindingId={null}
        analysisError={null}
        hasInput
        isAnalyzing={false}
        onFindingSelect={vi.fn()}
        report={{
          ...emptyAnalysisReport,
          generatedAt: "2026-04-23T12:30:00.000Z",
          summary: {
            ...emptyAnalysisReport.summary,
            analyzedFileCount: 1,
            workflowCount: 1,
            jobCount: 1,
          },
        }}
        selectedSampleId="manual"
        selectedSampleLabel="Upload"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /No findings for enabled rules\./i,
      }),
    ).toBeVisible();
  });

  it("renders finding detail actions and the ignored section", () => {
    const report = {
      ...sampleAnalysisReport,
      files: [
        {
          id: "fixable-file",
          path: ".github/workflows/release-risky.yml",
          content:
            "name: Release\non: push\njobs:\n  release:\n    runs-on: ubuntu-latest\n",
          sizeBytes: 66,
          sourceKind: "sample" as const,
        },
      ],
      findings: [
        {
          ...sampleAnalysisReport.findings[1]!,
          fix: {
            description: "Insert an explicit read-only baseline.",
            filePath: ".github/workflows/release-risky.yml",
            kind: "insert" as const,
            label: "Add permissions: contents: read",
            range: {
              start: {
                filePath: ".github/workflows/release-risky.yml",
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 1,
              },
              end: {
                filePath: ".github/workflows/release-risky.yml",
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 1,
              },
            },
            replacement: "permissions:\n  contents: read\n",
            safety: "safe" as const,
          },
        },
      ],
      ignoredFindings: [
        {
          comment: "# authos-ignore GHA201: accepted in this sample",
          finding: sampleAnalysisReport.findings[0]!,
          line: 7,
          reason: "accepted in this sample",
        },
      ],
    };

    render(
      <ResultsPanel
        activeFileName=".github/workflows/release-risky.yml"
        activeFindingId={report.findings[0]!.id}
        analysisError={null}
        files={report.files}
        hasInput
        isAnalyzing={false}
        onApplyFix={vi.fn(() => true)}
        onFindingSelect={vi.fn()}
        report={report}
        selectedSampleId="risky-pull-request-target"
        selectedSampleLabel="Sample"
      />,
    );

    expect(screen.getByText(/Copy finding as Markdown/i)).toBeVisible();
    expect(screen.getByText(/Copy ignore comment/i)).toBeVisible();
    expect(screen.getByText(/Apply fix/i)).toBeVisible();
    expect(screen.getByTestId("results-ignored-findings")).toBeInTheDocument();
  });
});
