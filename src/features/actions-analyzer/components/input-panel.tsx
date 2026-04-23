import { lazy, Suspense, type ComponentType } from "react";
import { FolderOpen, Upload, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PrivacyNotice } from "@/features/actions-analyzer/components/privacy-notice";
import { GitHubImportDialog } from "@/features/actions-analyzer/components/github-import-dialog";
import {
  type WorkflowCodeEditorProps,
  type WorkflowEditorJumpTarget,
} from "@/features/actions-analyzer/components/workflow-code-editor";
import {
  workflowSamples,
  type WorkflowSampleId,
} from "@/features/actions-analyzer/fixtures/samples";
import {
  getFindingCountsByFile,
  getFindingsForFile,
  getSeverityTone,
  severityDisplayOrder,
} from "@/features/actions-analyzer/lib/finding-presentation";
import {
  formatBytes,
  getWorkflowFileSourceLabel,
  normalizeWorkflowPath,
  uploadFileAcceptValue,
} from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

const LazyWorkflowCodeEditor = lazy(async () => {
  const editorModule = await import(
    "@/features/actions-analyzer/components/workflow-code-editor"
  );

  return {
    default:
      editorModule.WorkflowCodeEditor as ComponentType<WorkflowCodeEditorProps>,
  };
});

interface InputPanelProps {
  activeFile: WorkflowInputFile | null;
  activeFileId: string | null;
  activeFindingId: string | null;
  canAnalyze: boolean;
  defaultVirtualPath: string;
  editorJumpTarget: WorkflowEditorJumpTarget | null;
  errors: string[];
  fileCount: number;
  files: WorkflowInputFile[];
  folderUploadSupported: boolean;
  includeAllYamlFiles: boolean;
  inputText: string;
  isAnalyzing: boolean;
  maxFileSizeBytes: number;
  maxFileSizeLabel: string;
  onAddPasteFile: () => void;
  onAnalyze: () => void;
  onClear: () => void;
  onClearActiveInput: () => void;
  onFileUpload: (files: FileList | null) => void;
  onFileUploadFromFolder: (files: FileList | null) => void;
  onGitHubImport: (files: WorkflowInputFile[]) => void | Promise<void>;
  onInputChange: (value: string) => void;
  onLoadSelectedSample: () => void;
  onRemoveFile: (fileId: string) => void;
  onRenameFile: (path: string) => void;
  onSampleChange: (sampleId: WorkflowSampleId | "manual") => void;
  onSelectFile: (fileId: string) => void;
  onSoftWrapChange: (checked: boolean) => void;
  onToggleIncludeAllYamlFiles: (checked: boolean) => void;
  report: WorkflowAnalysisReport | null;
  selectedSampleId: WorkflowSampleId | "manual";
  softWrapEnabled: boolean;
  totalSizeLabel: string;
}

export function InputPanel({
  activeFile,
  activeFileId,
  activeFindingId,
  canAnalyze,
  defaultVirtualPath,
  editorJumpTarget,
  errors,
  fileCount,
  files,
  folderUploadSupported,
  includeAllYamlFiles,
  inputText,
  isAnalyzing,
  maxFileSizeBytes,
  maxFileSizeLabel,
  onAddPasteFile,
  onAnalyze,
  onClear,
  onClearActiveInput,
  onFileUpload,
  onFileUploadFromFolder,
  onGitHubImport,
  onInputChange,
  onLoadSelectedSample,
  onRemoveFile,
  onRenameFile,
  onSampleChange,
  onSelectFile,
  onSoftWrapChange,
  onToggleIncludeAllYamlFiles,
  report,
  selectedSampleId,
  softWrapEnabled,
  totalSizeLabel,
}: InputPanelProps) {
  const reportFindings = report?.findings ?? [];
  const findingCountsByFile = getFindingCountsByFile(reportFindings);
  const activeFileFindings = activeFile
    ? getFindingsForFile(reportFindings, activeFile.path)
    : [];
  const activeFinding =
    activeFileFindings.find((finding) => finding.id === activeFindingId) ??
    null;

  return (
    <Card data-testid="input-panel">
      <CardHeader>
        <CardTitle>Input</CardTitle>
        <CardDescription>
          Paste workflow YAML, upload one or more local files, load a sample, or
          scan a folder from your browser without sending content to Authos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/70 p-3"
          data-testid="workspace-input-summary"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {fileCount} {fileCount === 1 ? "file" : "files"} in workspace
            </p>
            <p className="text-sm text-muted-foreground">
              Total size {totalSizeLabel}. Up to {maxFileSizeLabel} per file.
            </p>
          </div>
          <Button onClick={onClear} variant="ghost">
            Clear all files
          </Button>
        </div>

        {errors.length > 0 ? (
          <Alert
            data-testid="workflow-input-errors"
            title="Input errors"
            tone="danger"
          >
            <ul className="space-y-2 text-sm">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {files.length === 0 ? (
          <div
            className="rounded-xl border border-border/80 bg-background/70 p-2"
            data-testid="workflow-file-list"
          >
            <EmptyState
              className="w-full px-4 py-6"
              description="Create a paste draft, upload workflow files, or load a sample to populate the workspace."
              title="No workflow files yet"
            />
          </div>
        ) : (
          <div
            className="overflow-x-auto rounded-xl border border-border/80 bg-background/70 p-2"
            data-testid="workflow-file-list"
          >
            <div className="flex min-w-max gap-2" role="tablist">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                const normalizedPath = normalizeWorkflowPath(
                  file.path,
                ).toLowerCase();
                const severityCounts = findingCountsByFile.get(normalizedPath);
                const totalFindingCount = severityDisplayOrder.reduce(
                  (sum, severity) => sum + (severityCounts?.[severity] ?? 0),
                  0,
                );

                return (
                  <div
                    key={file.id}
                    className={`flex w-[17rem] shrink-0 items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2 ${
                      isActive
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <button
                      aria-current={isActive ? "page" : undefined}
                      aria-selected={isActive}
                      className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => onSelectFile(file.id)}
                      role="tab"
                      type="button"
                    >
                      <span className="truncate text-sm font-medium text-foreground">
                        {file.path}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge tone={isActive ? "info" : "subtle"}>
                          {getWorkflowFileSourceLabel(file.sourceKind)}
                        </Badge>
                        <span>{formatBytes(file.sizeBytes)}</span>
                        {isActive ? <span>Selected</span> : null}
                      </span>
                      {totalFindingCount > 0 ? (
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          {severityDisplayOrder.map((severity) => {
                            const count = severityCounts?.[severity] ?? 0;

                            if (count === 0) {
                              return null;
                            }

                            return (
                              <Badge
                                key={severity}
                                tone={getSeverityTone(severity)}
                              >
                                {count} {severity}
                              </Badge>
                            );
                          })}
                        </span>
                      ) : report ? (
                        <span className="mt-1 text-xs text-muted-foreground">
                          No findings in this file
                        </span>
                      ) : null}
                    </button>
                    <Button
                      aria-label={`Remove ${file.path}`}
                      onClick={() => onRemoveFile(file.id)}
                      className="h-9 w-9 p-0"
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onAddPasteFile} variant="secondary">
              Paste
            </Button>
            <label
              className={buttonVariants({ variant: "secondary" })}
              htmlFor="workflow-file-upload"
            >
              <Upload className="h-4 w-4" />
              Upload file
            </label>
            <input
              accept={uploadFileAcceptValue}
              className="sr-only"
              data-testid="workflow-file-upload"
              id="workflow-file-upload"
              multiple
              onChange={(event) => {
                void onFileUpload(event.target.files);
                event.currentTarget.value = "";
              }}
              type="file"
            />
            <label
              aria-disabled={!folderUploadSupported}
              className={buttonVariants({
                className: !folderUploadSupported
                  ? "cursor-not-allowed opacity-60"
                  : undefined,
                variant: "secondary",
              })}
              htmlFor="workflow-folder-upload"
            >
              <FolderOpen className="h-4 w-4" />
              Upload folder
            </label>
            <input
              accept=".yml,.yaml"
              className="sr-only"
              data-testid="workflow-folder-upload"
              disabled={!folderUploadSupported}
              id="workflow-folder-upload"
              multiple
              onChange={(event) => {
                void onFileUploadFromFolder(event.target.files);
                event.currentTarget.value = "";
              }}
              type="file"
              {...({ webkitdirectory: "" } as Record<string, string>)}
            />
            <GitHubImportDialog
              maxFileSizeBytes={maxFileSizeBytes}
              maxFileSizeLabel={maxFileSizeLabel}
              onImportFiles={onGitHubImport}
            />
            <Button
              disabled={selectedSampleId === "manual"}
              onClick={onLoadSelectedSample}
              variant="secondary"
            >
              Load sample
            </Button>
            <Button onClick={onClearActiveInput} variant="ghost">
              Clear
            </Button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/60 px-3 py-2">
            <Switch
              aria-label="Include all YAML files"
              checked={includeAllYamlFiles}
              data-testid="include-all-yaml-switch"
              disabled={!folderUploadSupported}
              onCheckedChange={onToggleIncludeAllYamlFiles}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Include all YAML files
              </p>
              <p className="text-sm text-muted-foreground">
                {folderUploadSupported
                  ? 'When enabled, folder uploads include YAML files outside ".github/workflows/".'
                  : "Folder upload is not supported in this browser. Use Upload file instead."}
              </p>
            </div>
          </div>

          <Button
            className="sm:hidden"
            disabled={!canAnalyze}
            onClick={onAnalyze}
          >
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="workflow-sample-selector"
          >
            Load sample workflow
          </label>
          <Select
            data-testid="workflow-sample-selector"
            id="workflow-sample-selector"
            onChange={(event) =>
              onSampleChange(event.target.value as WorkflowSampleId | "manual")
            }
            value={selectedSampleId}
          >
            <option value="manual">Manual input</option>
            {workflowSamples.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.label}
              </option>
            ))}
          </Select>
          <p className="text-sm text-muted-foreground">
            Sample loading replaces the current workspace with one realistic
            example. If you have typed content open, Authos asks before
            replacing it.
          </p>
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="workflow-path-input"
          >
            Active file path
          </label>
          <Input
            data-testid="workflow-path-input"
            id="workflow-path-input"
            onBlur={(event) => {
              if (event.currentTarget.value.trim().length === 0) {
                onRenameFile(defaultVirtualPath);
              }
            }}
            onChange={(event) => onRenameFile(event.target.value)}
            placeholder={defaultVirtualPath}
            value={activeFile?.path ?? defaultVirtualPath}
          />
          <p className="text-sm text-muted-foreground">
            Default virtual path: {defaultVirtualPath}
          </p>
        </div>

        <div className="grid gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Workflow YAML</p>
            <p className="text-sm text-muted-foreground">
              The active file stays editable locally, with diagnostics limited
              to the selected file after each analysis run.
            </p>
          </div>
          <div id="workflow-yaml-editor-region">
            <Suspense
              fallback={
                <WorkflowCodeEditorLoading
                  label="Workflow YAML"
                  onChange={onInputChange}
                  softWrapEnabled={softWrapEnabled}
                  value={inputText}
                />
              }
            >
              <LazyWorkflowCodeEditor
                activeFinding={activeFinding}
                diagnostics={activeFileFindings}
                filePath={activeFile?.path ?? defaultVirtualPath}
                jumpTarget={editorJumpTarget}
                label="Workflow YAML"
                onChange={onInputChange}
                onSoftWrapChange={onSoftWrapChange}
                softWrapEnabled={softWrapEnabled}
                value={inputText}
              />
            </Suspense>
          </div>
        </div>

        <PrivacyNotice />
      </CardContent>
    </Card>
  );
}

function WorkflowCodeEditorLoading({
  label,
  onChange,
  softWrapEnabled,
  value,
}: Pick<
  WorkflowCodeEditorProps,
  "label" | "onChange" | "softWrapEnabled" | "value"
>) {
  return (
    <div className="space-y-3" data-testid="workflow-code-editor-loading">
      <Alert title="Loading advanced editor" tone="info">
        Authos keeps a plain local textarea available while the richer editor
        bundle loads.
      </Alert>
      <Textarea
        aria-label={label}
        className="min-h-[24rem] font-mono text-[0.925rem] leading-6"
        data-testid="workflow-yaml-textarea-loading"
        onChange={(event) => onChange(event.target.value)}
        placeholder="name: CI&#10;on: [push]&#10;jobs: ..."
        rows={18}
        spellCheck={false}
        value={value}
        wrap={softWrapEnabled ? "soft" : "off"}
      />
    </div>
  );
}
