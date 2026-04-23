"use client";

import { useId, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OverlayPanel } from "@/components/ui/overlay-panel";
import { usePushActionToast } from "@/features/actions-analyzer/components/action-toast-provider";
import {
  fetchPublicGitHubFile,
  fetchPublicGitHubWorkflowDirectory,
  getGitHubImportErrorMessage,
  parseGitHubUrl,
  type ParsedGitHubRepoUrl,
  type ParsedGitHubUrl,
  type PublicGitHubWorkflowDirectoryResult,
} from "@/features/actions-analyzer/lib/github-import";
import {
  createWorkflowInputFile,
  formatBytes,
  normalizeWorkflowPath,
} from "@/features/actions-analyzer/lib/workflow-input-utils";
import type { WorkflowInputFile } from "@/features/actions-analyzer/types";

interface GitHubImportDialogProps {
  maxFileSizeBytes: number;
  maxFileSizeLabel: string;
  onImportFiles: (files: WorkflowInputFile[]) => void | Promise<void>;
}

export function GitHubImportDialog({
  maxFileSizeBytes,
  maxFileSizeLabel,
  onImportFiles,
}: GitHubImportDialogProps) {
  const branchInputId = useId();
  const urlInputId = useId();
  const pushToast = usePushActionToast();
  const [branchRef, setBranchRef] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] =
    useState<PublicGitHubWorkflowDirectoryResult | null>(null);
  const [selectedWorkspacePaths, setSelectedWorkspacePaths] = useState<
    string[]
  >([]);
  const [urlInput, setUrlInput] = useState("");

  const parsedUrl = safelyParseGitHubUrl(urlInput);
  const selectedPreviewFiles =
    preview?.files.filter((file) => {
      return (
        !file.tooLarge && selectedWorkspacePaths.includes(file.workspacePath)
      );
    }) ?? [];
  const selectedPreviewCount = selectedPreviewFiles.length;

  function openDialog() {
    setIsOpen(true);
  }

  function resetDialog() {
    setBranchRef("");
    setErrorMessage(null);
    setIsLoading(false);
    setIsOpen(false);
    setPreview(null);
    setSelectedWorkspacePaths([]);
    setUrlInput("");
  }

  async function handleSubmit() {
    if (!parsedUrl) {
      setErrorMessage(
        "Enter a public GitHub workflow or repository URL from github.com.",
      );
      return;
    }

    if (parsedUrl.mode === "repo") {
      if (!preview) {
        await handleFetchDirectoryPreview(parsedUrl);
        return;
      }

      await handleImportPreviewFiles();
      return;
    }

    await handleImportDirectFile(parsedUrl);
  }

  async function handleFetchDirectoryPreview(
    parsedRepoUrl: ParsedGitHubRepoUrl,
  ) {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const directoryPreview = await fetchPublicGitHubWorkflowDirectory({
        directoryPath: getWorkflowDirectoryPath(parsedRepoUrl),
        maxFileSizeBytes,
        owner: parsedRepoUrl.owner,
        ref: getImportRef(parsedRepoUrl, branchRef),
        repo: parsedRepoUrl.repo,
      });

      setPreview(directoryPreview);
      setSelectedWorkspacePaths(
        directoryPreview.files
          .filter((file) => !file.tooLarge)
          .map((file) => file.workspacePath),
      );
    } catch (error) {
      setErrorMessage(getGitHubImportErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImportDirectFile(
    parsedFileUrl: Exclude<ParsedGitHubUrl, ParsedGitHubRepoUrl>,
  ) {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const importedFile = await fetchPublicGitHubFile({
        maxFileSizeBytes,
        owner: parsedFileUrl.owner,
        path: parsedFileUrl.path,
        rawUrl:
          parsedFileUrl.mode === "raw-file" &&
          getImportRef(parsedFileUrl, branchRef) === parsedFileUrl.ref
            ? parsedFileUrl.rawUrl
            : undefined,
        ref: getImportRef(parsedFileUrl, branchRef) ?? parsedFileUrl.ref,
        repo: parsedFileUrl.repo,
      });

      await onImportFiles([
        toWorkflowInputFile(importedFile, 0, {
          githubImportUrl: urlInput.trim(),
          githubPath: importedFile.path,
          githubRef: importedFile.ref,
        }),
      ]);
      pushToast({
        message: `Imported ${importedFile.path} from public GitHub.`,
        tone: "success",
      });
      resetDialog();
    } catch (error) {
      setErrorMessage(getGitHubImportErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImportPreviewFiles() {
    if (!preview) {
      return;
    }

    if (selectedPreviewCount === 0) {
      setErrorMessage("Select at least one workflow file to import.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const importedFiles = await Promise.all(
        selectedPreviewFiles.map((file) =>
          fetchPublicGitHubFile({
            htmlUrl: file.htmlUrl,
            maxFileSizeBytes,
            owner: file.owner,
            path: file.path,
            rawUrl: file.rawUrl,
            ref: file.ref,
            repo: file.repo,
            workspacePath: file.workspacePath,
          }),
        ),
      );

      await onImportFiles(
        importedFiles.map((file, index) =>
          toWorkflowInputFile(file, index, {
            githubImportUrl: urlInput.trim(),
            githubPath: file.path,
            githubRef: file.ref,
          }),
        ),
      );
      pushToast({
        message: `Imported ${importedFiles.length} workflow${importedFiles.length === 1 ? "" : "s"} from public GitHub.`,
        tone: "success",
      });
      resetDialog();
    } catch (error) {
      setErrorMessage(getGitHubImportErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function togglePreviewSelection(workspacePath: string, checked: boolean) {
    setSelectedWorkspacePaths((currentPaths) => {
      if (checked) {
        return currentPaths.includes(workspacePath)
          ? currentPaths
          : [...currentPaths, workspacePath];
      }

      return currentPaths.filter((path) => path !== workspacePath);
    });
  }

  function clearPreviewState() {
    setErrorMessage(null);
    setPreview(null);
    setSelectedWorkspacePaths([]);
  }

  return (
    <>
      <Button onClick={openDialog} variant="secondary">
        <Download className="h-4 w-4" />
        Import from GitHub
      </Button>

      <OverlayPanel
        description="Authos fetches public workflow content directly from GitHub in your browser. No login, OAuth flow, backend proxy, or private repository access is involved."
        onClose={resetDialog}
        open={isOpen}
        size="lg"
        title="Import from GitHub"
      >
        <Card className="border-border/0 bg-transparent shadow-none">
          <CardHeader className="space-y-4 px-0 pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Public GitHub only</Badge>
              <Badge tone="subtle">
                Mode: {getGitHubImportModeLabel(parsedUrl?.mode)}
              </Badge>
            </div>
            <CardTitle className="text-lg">
              Browser-only GitHub import
            </CardTitle>
            <CardDescription>
              Public imports are fetched by your browser straight from GitHub.
              No credentials are requested and nothing is proxied through
              Authos.
            </CardDescription>
            <div className="grid gap-3">
              <Alert title="No credentials requested" tone="info">
                Public imports are fetched straight from GitHub by your browser.
                Authos does not ask for tokens and does not proxy repository
                content through a backend.
              </Alert>
              <Alert title="GitHub public API limits apply" tone="warning">
                Repository imports use GitHub&apos;s unauthenticated public API,
                so you can hit rate limits during heavy use.
              </Alert>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-0 pb-0">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="grid gap-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor={urlInputId}
                >
                  GitHub URL
                </label>
                <Input
                  autoFocus
                  id={urlInputId}
                  onChange={(event) => {
                    clearPreviewState();
                    setUrlInput(event.target.value);
                  }}
                  placeholder="https://github.com/owner/repo or a workflow file URL"
                  value={urlInput}
                />
                <p className="text-sm text-muted-foreground">
                  Supported formats: repository URLs, workflow blob URLs, raw
                  workflow URLs, and tree URLs.
                </p>
              </div>

              <div className="grid gap-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor={branchInputId}
                >
                  Branch/ref
                </label>
                <Input
                  id={branchInputId}
                  onChange={(event) => {
                    clearPreviewState();
                    setBranchRef(event.target.value);
                  }}
                  placeholder={getBranchPlaceholder(parsedUrl)}
                  value={branchRef}
                />
                <p className="text-sm text-muted-foreground">
                  Leave blank to use the detected ref or default to{" "}
                  <span className="font-medium text-foreground">main</span>.
                </p>
              </div>
            </div>

            {parsedUrl ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-background/70 px-3 py-2">
                <Badge tone="subtle">{parsedUrl.owner}</Badge>
                <Badge tone="subtle">{parsedUrl.repo}</Badge>
                {getDisplayedRef(parsedUrl, branchRef) ? (
                  <Badge tone="info">
                    Ref: {getDisplayedRef(parsedUrl, branchRef)}
                  </Badge>
                ) : null}
                {"path" in parsedUrl ? (
                  <Badge tone="subtle">
                    {normalizeWorkflowPath(parsedUrl.path)}
                  </Badge>
                ) : null}
              </div>
            ) : null}

            {errorMessage ? (
              <Alert title="Import problem" tone="danger">
                {errorMessage}
              </Alert>
            ) : null}

            {preview ? (
              <div className="space-y-3 rounded-xl border border-border/80 bg-background/75 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {preview.files.length} workflow
                      {preview.files.length === 1 ? "" : "s"} found on{" "}
                      {preview.refUsed}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Review the file list before importing it into the local
                      workspace.
                    </p>
                  </div>
                  <Badge tone="info">{selectedPreviewCount} selected</Badge>
                </div>

                {preview.fallbackMessage ? (
                  <Alert title="Fallback branch used" tone="warning">
                    {preview.fallbackMessage}
                  </Alert>
                ) : null}

                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {preview.files.map((file) => {
                    const isChecked = selectedWorkspacePaths.includes(
                      file.workspacePath,
                    );

                    return (
                      <label
                        className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
                          file.tooLarge
                            ? "border-warning/35 bg-warning/8"
                            : "border-border/80 bg-card/70"
                        }`}
                        key={file.workspacePath}
                      >
                        <input
                          checked={isChecked}
                          className="mt-1 h-4 w-4 rounded border border-input accent-[color:var(--color-accent)]"
                          disabled={file.tooLarge}
                          onChange={(event) =>
                            togglePreviewSelection(
                              file.workspacePath,
                              event.target.checked,
                            )
                          }
                          type="checkbox"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="break-all text-sm font-medium text-foreground">
                              {file.path}
                            </span>
                            <Badge tone="subtle">
                              {formatBytes(file.sizeBytes)}
                            </Badge>
                            {file.tooLarge ? (
                              <Badge tone="warning">
                                Over {maxFileSizeLabel}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Imported path: {file.workspacePath}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={resetDialog} variant="ghost">
                Cancel
              </Button>
              <Button disabled={isLoading} onClick={() => void handleSubmit()}>
                {isLoading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Working...
                  </>
                ) : (
                  getSubmitLabel({
                    preview,
                    selectedPreviewCount,
                    url: parsedUrl,
                  })
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </OverlayPanel>
    </>
  );
}

function safelyParseGitHubUrl(input: string) {
  if (input.trim().length === 0) {
    return null;
  }

  try {
    return parseGitHubUrl(input);
  } catch {
    return null;
  }
}

function getImportRef(url: ParsedGitHubUrl, branchRef: string) {
  const trimmedBranch = branchRef.trim();

  if (trimmedBranch.length > 0) {
    return trimmedBranch;
  }

  return url.ref;
}

function getDisplayedRef(url: ParsedGitHubUrl, branchRef: string) {
  const importedRef = getImportRef(url, branchRef);

  return importedRef ?? (url.mode === "repo" ? "main" : importedRef);
}

function getSubmitLabel({
  preview,
  selectedPreviewCount,
  url,
}: {
  preview: PublicGitHubWorkflowDirectoryResult | null;
  selectedPreviewCount: number;
  url: ParsedGitHubUrl | null;
}) {
  if (!url) {
    return "Import from GitHub";
  }

  if (url.mode === "repo") {
    return preview
      ? `Import ${selectedPreviewCount} workflow${selectedPreviewCount === 1 ? "" : "s"}`
      : "Fetch workflow list";
  }

  return "Import workflow file";
}

function getGitHubImportModeLabel(mode: ParsedGitHubUrl["mode"] | undefined) {
  switch (mode) {
    case "blob-file":
      return "Workflow file URL";
    case "raw-file":
      return "Raw workflow URL";
    case "repo":
      return "Public repo";
    default:
      return "Auto-detect";
  }
}

function getBranchPlaceholder(parsedUrl: ParsedGitHubUrl | null) {
  if (!parsedUrl) {
    return "main";
  }

  if (parsedUrl.mode === "repo") {
    return parsedUrl.ref ?? "main";
  }

  return parsedUrl.ref;
}

function getWorkflowDirectoryPath(parsedRepoUrl: ParsedGitHubRepoUrl) {
  const normalizedTreePath = normalizeWorkflowPath(
    parsedRepoUrl.treePath ?? "",
  );

  if (
    normalizedTreePath === ".github/workflows" ||
    normalizedTreePath.startsWith(".github/workflows/")
  ) {
    return normalizedTreePath;
  }

  return ".github/workflows";
}

function toWorkflowInputFile(
  file: Awaited<ReturnType<typeof fetchPublicGitHubFile>>,
  index: number,
  sourceMetadata: WorkflowInputFile["sourceMetadata"],
) {
  return createWorkflowInputFile({
    content: file.content,
    index,
    path: file.workspacePath,
    sizeBytes: file.sizeBytes,
    sourceKind: "github",
    sourceMetadata,
  });
}
