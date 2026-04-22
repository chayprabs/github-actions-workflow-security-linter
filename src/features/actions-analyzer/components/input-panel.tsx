import { FolderOpen, Upload, WandSparkles, X } from "lucide-react";

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
import {
  workflowSamples,
  type WorkflowSampleId,
} from "@/features/actions-analyzer/fixtures/samples";
import {
  formatBytes,
  getWorkflowFileSourceLabel,
  uploadFileAcceptValue,
} from "@/features/actions-analyzer/lib/workflow-input-utils";
import type { WorkflowInputFile } from "@/features/actions-analyzer/types";

interface InputPanelProps {
  activeFile: WorkflowInputFile | null;
  activeFileId: string | null;
  canAnalyze: boolean;
  defaultVirtualPath: string;
  errors: string[];
  fileCount: number;
  files: WorkflowInputFile[];
  folderUploadSupported: boolean;
  includeAllYamlFiles: boolean;
  inputText: string;
  isAnalyzing: boolean;
  maxFileSizeLabel: string;
  onAddPasteFile: () => void;
  onAnalyze: () => void;
  onClear: () => void;
  onClearActiveInput: () => void;
  onFileUpload: (files: FileList | null) => void;
  onFileUploadFromFolder: (files: FileList | null) => void;
  onInputChange: (value: string) => void;
  onLoadSelectedSample: () => void;
  onRemoveFile: (fileId: string) => void;
  onRenameFile: (path: string) => void;
  onSampleChange: (sampleId: WorkflowSampleId | "manual") => void;
  onSelectFile: (fileId: string) => void;
  onToggleIncludeAllYamlFiles: (checked: boolean) => void;
  selectedSampleId: WorkflowSampleId | "manual";
  totalSizeLabel: string;
}

export function InputPanel({
  activeFile,
  activeFileId,
  canAnalyze,
  defaultVirtualPath,
  errors,
  fileCount,
  files,
  folderUploadSupported,
  includeAllYamlFiles,
  inputText,
  isAnalyzing,
  maxFileSizeLabel,
  onAddPasteFile,
  onAnalyze,
  onClear,
  onClearActiveInput,
  onFileUpload,
  onFileUploadFromFolder,
  onInputChange,
  onLoadSelectedSample,
  onRemoveFile,
  onRenameFile,
  onSampleChange,
  onSelectFile,
  onToggleIncludeAllYamlFiles,
  selectedSampleId,
  totalSizeLabel,
}: InputPanelProps) {
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

        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-background/70 p-2"
          data-testid="workflow-file-list"
        >
          {files.length === 0 ? (
            <EmptyState
              className="w-full px-4 py-6"
              description="Create a paste draft, upload workflow files, or load a sample to populate the workspace."
              title="No workflow files yet"
            />
          ) : (
            files.map((file) => {
              const isActive = file.id === activeFileId;

              return (
                <div
                  key={file.id}
                  className={`flex min-w-[15rem] flex-1 items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2 ${
                    isActive
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card"
                  }`}
                >
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => onSelectFile(file.id)}
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
            })
          )}
        </div>

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
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="workflow-yaml-textarea"
          >
            Workflow YAML
          </label>
          <Textarea
            data-testid="workflow-yaml-textarea"
            id="workflow-yaml-textarea"
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="name: CI&#10;on: [push]&#10;jobs: ..."
            rows={18}
            value={inputText}
          />
        </div>

        <div className="rounded-xl border border-dashed border-border/80 bg-background/60 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-accent/10 p-2 text-accent">
              <WandSparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Editor upgrade placeholder
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                CodeMirror, line diagnostics, and richer workflow comparisons
                will be added in later prompts. This textarea is now backed by a
                real browser-only ingestion layer.
              </p>
            </div>
          </div>
        </div>

        <PrivacyNotice />
      </CardContent>
    </Card>
  );
}
