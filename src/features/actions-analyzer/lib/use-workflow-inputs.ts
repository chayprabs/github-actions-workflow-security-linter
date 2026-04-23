"use client";

import { useMemo, useState } from "react";

import {
  workflowSamples,
  type WorkflowSampleId,
} from "@/features/actions-analyzer/fixtures/samples";
import { defaultAnalyzerSettings } from "@/features/actions-analyzer/lib/settings";
import {
  createEmptyPasteFile,
  createWorkflowInputFile,
  DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES,
  DEFAULT_WORKFLOW_VIRTUAL_PATH,
  formatBytes,
  normalizeWorkflowPath,
  validateWorkflowFileSelection,
} from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  AnalyzerSettings,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

interface UseWorkflowInputsOptions {
  confirmReplace?: ((message: string) => boolean) | undefined;
  maxFileSizeBytes?: number | undefined;
}

export function useWorkflowInputs({
  confirmReplace,
  maxFileSizeBytes = DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES,
}: UseWorkflowInputsOptions = {}) {
  const [files, setFiles] = useState<WorkflowInputFile[]>(() => [
    createEmptyPasteFile(),
  ]);
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    return createEmptyPasteFile().id;
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<
    WorkflowSampleId | "manual"
  >("manual");
  const [includeAllYamlFiles, setIncludeAllYamlFiles] = useState(false);
  const [settings, setSettings] = useState<AnalyzerSettings>(
    defaultAnalyzerSettings,
  );
  const [dirtyFileIds, setDirtyFileIds] = useState<string[]>([]);

  const activeFile = useMemo(() => {
    return files.find((file) => file.id === activeFileId) ?? files[0] ?? null;
  }, [activeFileId, files]);

  const selectedSample = workflowSamples.find(
    (sample) => sample.id === selectedSampleId,
  );

  const hasAnyContent = files.some((file) => file.content.trim().length > 0);
  const totalSizeBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const totalSizeLabel = formatBytes(totalSizeBytes);
  const folderUploadSupported = detectFolderUploadSupport();

  function selectSample(sampleId: WorkflowSampleId | "manual") {
    setSelectedSampleId(sampleId);
  }

  function setActiveFile(nextFileId: string) {
    setActiveFileId(nextFileId);

    const nextFile = files.find((file) => file.id === nextFileId);

    if (nextFile?.sourceKind !== "sample") {
      setSelectedSampleId("manual");
    }
  }

  function addPasteFile() {
    const nextFile = createEmptyPasteFile(
      files.map((file) => file.path),
      files.length,
    );
    const nextFiles = shouldReplaceEmptyDraft(files, dirtyFileIds)
      ? [nextFile]
      : [...files, nextFile];

    setFiles(nextFiles);
    setActiveFileId(nextFile.id);
    setSelectedSampleId("manual");
    setErrors([]);
  }

  function updateFileContent(fileId: string, content: string) {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === fileId
          ? {
              ...file,
              content,
              sizeBytes: new TextEncoder().encode(content).byteLength,
            }
          : file,
      ),
    );
    setDirtyFileIds((currentIds) =>
      currentIds.includes(fileId) ? currentIds : [...currentIds, fileId],
    );
    setErrors([]);
  }

  function renameFile(fileId: string, nextPath: string) {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === fileId
          ? {
              ...file,
              path: normalizeWorkflowPath(nextPath),
            }
          : file,
      ),
    );
    setErrors([]);
  }

  async function addUploadedFiles(
    selection: FileList | File[] | null,
    mode: "file" | "folder" = "file",
  ) {
    const filesToProcess = Array.from(selection ?? []);
    const validationResult = validateWorkflowFileSelection(filesToProcess, {
      includeAllYamlFiles,
      maxFileSizeBytes,
      mode,
    });

    if (validationResult.accepted.length === 0) {
      setErrors(validationResult.errors);
      return false;
    }

    try {
      const uploadedFiles = await Promise.all(
        validationResult.accepted.map(async ({ file, path }, index) => {
          const content = await readFileAsText(file);

          return createWorkflowInputFile({
            content,
            index,
            modifiedAt: file.lastModified ?? 0,
            path,
            sizeBytes: file.size,
            sourceKind: "upload",
          });
        }),
      );
      const nextFiles = shouldReplaceEmptyDraft(files, dirtyFileIds)
        ? uploadedFiles
        : mergeWorkflowFiles(files, uploadedFiles);

      setFiles(nextFiles);
      setActiveFileId(uploadedFiles[0]?.id ?? nextFiles[0]?.id ?? null);
      setSelectedSampleId("manual");
      setErrors(validationResult.errors);

      return true;
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "A selected file could not be read in the browser.",
      ]);

      return false;
    }
  }

  function removeFile(fileId: string) {
    const nextFiles = files.filter((file) => file.id !== fileId);
    const workspaceFiles =
      nextFiles.length > 0 ? nextFiles : [createEmptyPasteFile()];
    const nextActiveFile =
      activeFileId === fileId
        ? (workspaceFiles[0] ?? null)
        : (workspaceFiles.find((file) => file.id === activeFileId) ??
          workspaceFiles[0] ??
          null);

    setFiles(workspaceFiles);
    setActiveFileId(nextActiveFile?.id ?? null);
    setDirtyFileIds((currentIds) => currentIds.filter((id) => id !== fileId));
    setErrors([]);

    if (nextActiveFile?.sourceKind !== "sample") {
      setSelectedSampleId("manual");
    }
  }

  function clearActiveInput() {
    if (!activeFile) {
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === activeFile.id
          ? {
              ...file,
              content: "",
              sizeBytes: 0,
            }
          : file,
      ),
    );
    setDirtyFileIds((currentIds) =>
      currentIds.filter((fileId) => fileId !== activeFile.id),
    );
    setErrors([]);
  }

  function clearAll() {
    const nextFile = createEmptyPasteFile();

    setFiles([nextFile]);
    setActiveFileId(nextFile.id);
    setErrors([]);
    setSelectedSampleId("manual");
    setIncludeAllYamlFiles(false);
    setDirtyFileIds([]);
    setSettings(defaultAnalyzerSettings);
  }

  function loadSample(sampleId: WorkflowSampleId) {
    const sample = workflowSamples.find((entry) => entry.id === sampleId);

    if (!sample) {
      return false;
    }

    if (
      activeFile &&
      dirtyFileIds.includes(activeFile.id) &&
      activeFile.content.trim().length > 0
    ) {
      const confirmed =
        confirmReplace?.(
          "Replace the current typed workflow content with the selected sample?",
        ) ?? true;

      if (!confirmed) {
        return false;
      }
    }

    const sampleFile = createWorkflowInputFile({
      content: sample.content,
      path: sample.path,
      sourceKind: "sample",
    });

    setFiles([sampleFile]);
    setActiveFileId(sampleFile.id);
    setSelectedSampleId(sampleId);
    setDirtyFileIds([]);
    setErrors([]);

    return true;
  }

  function resetSettings() {
    setSettings(defaultAnalyzerSettings);
  }

  return {
    activeFile,
    activeFileId,
    addPasteFile,
    addUploadedFiles,
    clearActiveInput,
    clearAll,
    defaultVirtualPath: DEFAULT_WORKFLOW_VIRTUAL_PATH,
    errors,
    fileCount: files.length,
    files,
    folderUploadSupported,
    hasAnyContent,
    includeAllYamlFiles,
    maxFileSizeBytes,
    maxFileSizeLabel: formatBytes(maxFileSizeBytes),
    removeFile,
    renameFile,
    resetSettings,
    selectedSample,
    selectedSampleId,
    selectSample,
    setActiveFileId: setActiveFile,
    setIncludeAllYamlFiles,
    setSettings,
    settings,
    totalSizeBytes,
    totalSizeLabel,
    updateFileContent,
    loadSample,
  };
}

function detectFolderUploadSupport(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const input = document.createElement("input") as HTMLInputElement & {
    mozdirectory?: boolean | undefined;
    webkitdirectory?: boolean | undefined;
  };

  return "webkitdirectory" in input || "mozdirectory" in input;
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error(`Could not read "${file.name}" in the browser.`));
    };

    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };

    reader.readAsText(file);
  });
}

function shouldReplaceEmptyDraft(
  files: WorkflowInputFile[],
  dirtyFileIds: string[],
): boolean {
  if (files.length !== 1) {
    return false;
  }

  const [onlyFile] = files;

  if (!onlyFile) {
    return false;
  }

  return (
    onlyFile.sourceKind === "paste" &&
    onlyFile.path === DEFAULT_WORKFLOW_VIRTUAL_PATH &&
    onlyFile.content.trim().length === 0 &&
    !dirtyFileIds.includes(onlyFile.id)
  );
}

function mergeWorkflowFiles(
  currentFiles: WorkflowInputFile[],
  nextFiles: WorkflowInputFile[],
): WorkflowInputFile[] {
  const nextPaths = new Set(
    nextFiles.map((file) => normalizeWorkflowPath(file.path).toLowerCase()),
  );

  const preservedFiles = currentFiles.filter(
    (file) => !nextPaths.has(normalizeWorkflowPath(file.path).toLowerCase()),
  );

  return [...preservedFiles, ...nextFiles];
}
