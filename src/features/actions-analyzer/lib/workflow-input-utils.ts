import type {
  WorkflowInputFile,
  WorkflowInputSourceKind,
  WorkflowInputSourceMetadata,
} from "@/features/actions-analyzer/types";

export const DEFAULT_WORKFLOW_VIRTUAL_PATH = ".github/workflows/workflow.yml";
export const DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES = 1024 * 1024;
export const uploadFileAcceptValue = ".yml,.yaml,.txt";
export const folderUploadAcceptValue = ".yml,.yaml";

const textEncoder = new TextEncoder();
const yamlExtensions = [".yml", ".yaml"];
const uploadExtensions = [...yamlExtensions, ".txt"];

export interface WorkflowFileLike {
  lastModified?: number | undefined;
  name: string;
  size: number;
  type?: string | undefined;
  webkitRelativePath?: string | undefined;
}

export interface WorkflowFileCandidate<T extends WorkflowFileLike> {
  file: T;
  path: string;
}

export interface WorkflowFileSelectionOptions {
  includeAllYamlFiles?: boolean | undefined;
  maxFileSizeBytes?: number | undefined;
  mode?: "file" | "folder" | undefined;
}

export interface WorkflowFileSelectionResult<T extends WorkflowFileLike> {
  accepted: WorkflowFileCandidate<T>[];
  errors: string[];
}

interface CreateWorkflowInputFileOptions {
  content: string;
  index?: number | undefined;
  modifiedAt?: number | undefined;
  path: string;
  sizeBytes?: number | undefined;
  sourceKind: WorkflowInputSourceKind;
  sourceMetadata?: WorkflowInputSourceMetadata | undefined;
}

export function normalizeWorkflowPath(path: string): string {
  return path.replace(/\\/gu, "/").replace(/^\/+/u, "");
}

export function getFileSizeBytes(content: string): number {
  return textEncoder.encode(content).byteLength;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${stripTrailingZeros((bytes / 1024).toFixed(1))} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${stripTrailingZeros((bytes / (1024 * 1024)).toFixed(1))} MB`;
  }

  return `${stripTrailingZeros((bytes / (1024 * 1024 * 1024)).toFixed(1))} GB`;
}

export function isYamlFilePath(path: string): boolean {
  const normalizedPath = normalizeWorkflowPath(path).toLowerCase();

  return yamlExtensions.some((extension) => normalizedPath.endsWith(extension));
}

export function isSupportedUploadFilePath(path: string): boolean {
  const normalizedPath = normalizeWorkflowPath(path).toLowerCase();

  return uploadExtensions.some((extension) =>
    normalizedPath.endsWith(extension),
  );
}

export function isWorkflowDirectoryPath(path: string): boolean {
  const normalizedPath = `/${normalizeWorkflowPath(path).toLowerCase()}`;

  return normalizedPath.includes("/.github/workflows/");
}

export function shouldIncludeFolderPath(
  path: string,
  includeAllYamlFiles: boolean,
): boolean {
  if (!isYamlFilePath(path)) {
    return false;
  }

  return includeAllYamlFiles || isWorkflowDirectoryPath(path);
}

export function getWorkflowFileSourceLabel(
  sourceKind: WorkflowInputSourceKind,
): string {
  switch (sourceKind) {
    case "paste":
      return "Paste";
    case "upload":
      return "Upload";
    case "sample":
      return "Sample";
    case "github":
      return "GitHub";
    default:
      return "Input";
  }
}

export function getSelectedFilePath(file: WorkflowFileLike): string {
  const relativePath =
    file.webkitRelativePath && file.webkitRelativePath.trim().length > 0
      ? file.webkitRelativePath
      : file.name;

  return normalizeWorkflowPath(relativePath || DEFAULT_WORKFLOW_VIRTUAL_PATH);
}

export function createWorkflowInputId(
  sourceKind: WorkflowInputSourceKind,
  path: string,
  sizeBytes: number,
  modifiedAt: number,
  index: number,
): string {
  const normalizedPath = normalizeWorkflowPath(path)
    .toLowerCase()
    .replace(/\s+/gu, "-")
    .replace(/[^a-z0-9/_-]/gu, "");

  return `${sourceKind}:${normalizedPath || "workflow"}:${sizeBytes}:${modifiedAt}:${index}`;
}

export function createWorkflowInputFile({
  content,
  index = 0,
  modifiedAt = 0,
  path,
  sizeBytes,
  sourceKind,
  sourceMetadata,
}: CreateWorkflowInputFileOptions): WorkflowInputFile {
  const normalizedPath = normalizeWorkflowPath(path);
  const computedSizeBytes = sizeBytes ?? getFileSizeBytes(content);

  return {
    id: createWorkflowInputId(
      sourceKind,
      normalizedPath,
      computedSizeBytes,
      modifiedAt,
      index,
    ),
    path: normalizedPath,
    content,
    sizeBytes: computedSizeBytes,
    sourceKind,
    sourceMetadata,
  };
}

export function createNextPastePath(existingPaths: string[]): string {
  const normalizedPaths = new Set(
    existingPaths.map((path) => normalizeWorkflowPath(path).toLowerCase()),
  );

  if (!normalizedPaths.has(DEFAULT_WORKFLOW_VIRTUAL_PATH.toLowerCase())) {
    return DEFAULT_WORKFLOW_VIRTUAL_PATH;
  }

  let suffix = 2;

  while (
    normalizedPaths.has(
      `.github/workflows/workflow-${suffix}.yml`.toLowerCase(),
    )
  ) {
    suffix += 1;
  }

  return `.github/workflows/workflow-${suffix}.yml`;
}

export function createEmptyPasteFile(
  existingPaths: string[] = [],
  index = 0,
): WorkflowInputFile {
  return createWorkflowInputFile({
    content: "",
    index,
    path: createNextPastePath(existingPaths),
    sourceKind: "paste",
  });
}

export function validateWorkflowFileSelection<T extends WorkflowFileLike>(
  files: readonly T[],
  options: WorkflowFileSelectionOptions = {},
): WorkflowFileSelectionResult<T> {
  const {
    includeAllYamlFiles = false,
    maxFileSizeBytes = DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES,
    mode = "file",
  } = options;

  const accepted: WorkflowFileCandidate<T>[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const selectedPath = getSelectedFilePath(file);

    if (mode === "folder") {
      if (!shouldIncludeFolderPath(selectedPath, includeAllYamlFiles)) {
        continue;
      }
    } else if (!isSupportedUploadFilePath(selectedPath)) {
      errors.push(
        `Unsupported file type for "${selectedPath}". Supported uploads are .yml, .yaml, and .txt.`,
      );
      continue;
    }

    if (file.size > maxFileSizeBytes) {
      errors.push(
        `File "${selectedPath}" is ${formatBytes(file.size)}, which exceeds the ${formatBytes(maxFileSizeBytes)} per-file limit.`,
      );
      continue;
    }

    accepted.push({
      file,
      path: selectedPath,
    });
  }

  if (mode === "folder" && files.length > 0 && accepted.length === 0) {
    const hasYamlFiles = files.some((file) =>
      isYamlFilePath(getSelectedFilePath(file)),
    );

    if (hasYamlFiles && !includeAllYamlFiles) {
      errors.push(
        'No workflow YAML files were found under ".github/workflows/". Enable "Include all YAML files" to scan the full folder.',
      );
    } else {
      errors.push(
        "No supported YAML workflow files were found in the selected folder.",
      );
    }
  }

  return {
    accepted,
    errors,
  };
}

function stripTrailingZeros(value: string): string {
  return value.replace(/\.0$/u, "");
}
