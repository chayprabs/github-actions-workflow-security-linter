import {
  DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES,
  formatBytes,
  getFileSizeBytes,
  normalizeWorkflowPath,
} from "@/features/actions-analyzer/lib/workflow-input-utils";

export const githubImportModes = ["blob-file", "raw-file", "repo"] as const;

export type GitHubImportMode = (typeof githubImportModes)[number];

export interface GitHubFileTarget {
  owner: string;
  path: string;
  ref: string;
  repo: string;
}

export interface ParsedGitHubBlobFileUrl extends GitHubFileTarget {
  mode: "blob-file";
  rawUrl: string;
  url: string;
}

export interface ParsedGitHubRawFileUrl extends GitHubFileTarget {
  mode: "raw-file";
  rawUrl: string;
  url: string;
}

export interface ParsedGitHubRepoUrl {
  mode: "repo";
  owner: string;
  ref?: string | undefined;
  repo: string;
  treePath?: string | undefined;
  url: string;
}

export type ParsedGitHubUrl =
  | ParsedGitHubBlobFileUrl
  | ParsedGitHubRawFileUrl
  | ParsedGitHubRepoUrl;

export const githubImportErrorCodes = [
  "invalid-url",
  "repo-not-found",
  "file-not-found",
  "no-workflows-found",
  "rate-limit",
  "network",
  "file-too-large",
  "unsupported-response",
] as const;

export type GitHubImportErrorCode = (typeof githubImportErrorCodes)[number];

export class GitHubImportError extends Error {
  code: GitHubImportErrorCode;
  status?: number | undefined;

  constructor({
    code,
    message,
    status,
  }: {
    code: GitHubImportErrorCode;
    message: string;
    status?: number | undefined;
  }) {
    super(message);
    this.code = code;
    this.name = "GitHubImportError";
    this.status = status;
  }
}

export interface PublicGitHubFile extends GitHubFileTarget {
  content: string;
  htmlUrl: string;
  rawUrl: string;
  sizeBytes: number;
  workspacePath: string;
}

export interface PublicGitHubWorkflowDirectoryEntry extends GitHubFileTarget {
  htmlUrl: string;
  rawUrl: string;
  sizeBytes: number;
  tooLarge: boolean;
  workspacePath: string;
}

export interface PublicGitHubWorkflowDirectoryResult {
  files: PublicGitHubWorkflowDirectoryEntry[];
  refUsed: string;
  fallbackMessage?: string | undefined;
}

interface FetchPublicGitHubFileOptions extends GitHubFileTarget {
  fetchImpl?: typeof fetch | undefined;
  htmlUrl?: string | undefined;
  maxFileSizeBytes?: number | undefined;
  rawUrl?: string | undefined;
  signal?: AbortSignal | undefined;
  workspacePath?: string | undefined;
}

interface FetchPublicGitHubWorkflowDirectoryOptions {
  directoryPath?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
  maxFileSizeBytes?: number | undefined;
  owner: string;
  ref?: string | undefined;
  repo: string;
  signal?: AbortSignal | undefined;
}

const workflowExtensions = [".yml", ".yaml"];
const workflowDirectoryPath = ".github/workflows";

export function parseGitHubUrl(input: string): ParsedGitHubUrl {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    throw new GitHubImportError({
      code: "invalid-url",
      message:
        "Enter a public GitHub workflow or repository URL from github.com.",
    });
  }

  let url: URL;

  try {
    url = new URL(trimmedInput);
  } catch {
    throw new GitHubImportError({
      code: "invalid-url",
      message:
        "Enter a valid public GitHub workflow or repository URL from github.com.",
    });
  }

  if (url.protocol !== "https:") {
    throw new GitHubImportError({
      code: "invalid-url",
      message: "Use an HTTPS GitHub URL for public browser imports.",
    });
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "raw.githubusercontent.com") {
    return parseRawGitHubUrl(url);
  }

  if (hostname === "github.com" || hostname === "www.github.com") {
    return parseGitHubDotComUrl(url);
  }

  throw new GitHubImportError({
    code: "invalid-url",
    message:
      "Only public github.com and raw.githubusercontent.com URLs are supported.",
  });
}

export function githubBlobToRawUrl({
  owner,
  path,
  ref,
  repo,
}: GitHubFileTarget): string {
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${encodeGitHubPath(path)}`;
}

export function isLikelyWorkflowPath(path: string): boolean {
  const normalizedPath = `/${normalizeWorkflowPath(path).toLowerCase()}`;
  const isWorkflowDirectory =
    normalizedPath === `/${workflowDirectoryPath}` ||
    normalizedPath.includes(`/${workflowDirectoryPath}/`);

  return (
    isWorkflowDirectory &&
    workflowExtensions.some((extension) => normalizedPath.endsWith(extension))
  );
}

export async function fetchPublicGitHubFile({
  fetchImpl = fetch,
  htmlUrl,
  maxFileSizeBytes = DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES,
  owner,
  path,
  rawUrl,
  ref,
  repo,
  signal,
  workspacePath,
}: FetchPublicGitHubFileOptions): Promise<PublicGitHubFile> {
  const normalizedPath = normalizeWorkflowPath(path);

  if (!isLikelyWorkflowPath(normalizedPath)) {
    throw new GitHubImportError({
      code: "invalid-url",
      message:
        "That URL does not point to a GitHub Actions workflow file under .github/workflows.",
    });
  }

  let response: Response;

  try {
    response = await fetchImpl(
      rawUrl ?? githubBlobToRawUrl({ owner, path, ref, repo }),
      createFetchInit({ signal }),
    );
  } catch {
    throw new GitHubImportError({
      code: "network",
      message:
        "The browser could not reach GitHub. Check your connection or try again in a moment.",
    });
  }

  if (!response.ok) {
    throw await mapGitHubResponseError({
      response,
      missingCode: "file-not-found",
      missingMessage:
        "GitHub could not find that public workflow file. Check the URL and branch/ref.",
    });
  }

  const contentLengthHeader = response.headers.get("content-length");

  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);

    if (!Number.isNaN(contentLength) && contentLength > maxFileSizeBytes) {
      throw new GitHubImportError({
        code: "file-too-large",
        message: `That workflow file is larger than the ${formatBytes(maxFileSizeBytes)} browser import limit.`,
      });
    }
  }

  const content = await response.text();
  const sizeBytes = getFileSizeBytes(content);

  if (sizeBytes > maxFileSizeBytes) {
    throw new GitHubImportError({
      code: "file-too-large",
      message: `That workflow file is larger than the ${formatBytes(maxFileSizeBytes)} browser import limit.`,
    });
  }

  return {
    content,
    htmlUrl:
      htmlUrl ??
      buildGitHubBlobUrl({
        owner,
        path: normalizedPath,
        ref,
        repo,
      }),
    owner,
    path: normalizedPath,
    rawUrl:
      rawUrl ??
      githubBlobToRawUrl({
        owner,
        path: normalizedPath,
        ref,
        repo,
      }),
    ref,
    repo,
    sizeBytes,
    workspacePath:
      workspacePath ??
      buildGitHubWorkspacePath({
        owner,
        path: normalizedPath,
        repo,
      }),
  };
}

export async function fetchPublicGitHubWorkflowDirectory({
  directoryPath = workflowDirectoryPath,
  fetchImpl = fetch,
  maxFileSizeBytes = DEFAULT_MAX_WORKFLOW_FILE_SIZE_BYTES,
  owner,
  ref,
  repo,
  signal,
}: FetchPublicGitHubWorkflowDirectoryOptions): Promise<PublicGitHubWorkflowDirectoryResult> {
  const normalizedDirectoryPath = normalizeWorkflowPath(directoryPath);
  const requestedRef = ref?.trim() || "main";
  const shouldTryMasterFallback = ref === undefined || ref.trim().length === 0;
  const refsToTry = shouldTryMasterFallback
    ? [requestedRef, "master"].filter(
        (candidateRef, index, refs) => refs.indexOf(candidateRef) === index,
      )
    : [requestedRef];

  for (const currentRef of refsToTry) {
    let response: Response;

    try {
      response = await fetchImpl(
        buildGitHubContentsApiUrl({
          owner,
          path: normalizedDirectoryPath,
          ref: currentRef,
          repo,
        }),
        createFetchInit({
          headers: {
            Accept: "application/vnd.github+json",
          },
          signal,
        }),
      );
    } catch {
      throw new GitHubImportError({
        code: "network",
        message:
          "The browser could not reach GitHub. Check your connection or try again in a moment.",
      });
    }

    if (response.status === 404) {
      continue;
    }

    if (!response.ok) {
      throw await mapGitHubResponseError({
        response,
        missingCode: "no-workflows-found",
        missingMessage:
          "No workflow files were found under .github/workflows in that public repository.",
      });
    }

    const payload = await response.json();

    if (!Array.isArray(payload)) {
      throw new GitHubImportError({
        code: "unsupported-response",
        message:
          "GitHub returned an unexpected directory response. Please try again.",
      });
    }

    const files = payload
      .filter((entry): entry is GitHubApiContentEntry => {
        return (
          isGitHubApiContentEntry(entry) &&
          entry.type === "file" &&
          isLikelyWorkflowPath(entry.path)
        );
      })
      .map((entry) => {
        const normalizedPath = normalizeWorkflowPath(entry.path);

        return {
          htmlUrl:
            entry.html_url ??
            buildGitHubBlobUrl({
              owner,
              path: normalizedPath,
              ref: currentRef,
              repo,
            }),
          owner,
          path: normalizedPath,
          rawUrl:
            entry.download_url ??
            githubBlobToRawUrl({
              owner,
              path: normalizedPath,
              ref: currentRef,
              repo,
            }),
          ref: currentRef,
          repo,
          sizeBytes: entry.size,
          tooLarge: entry.size > maxFileSizeBytes,
          workspacePath: buildGitHubWorkspacePath({
            owner,
            path: normalizedPath,
            repo,
          }),
        };
      });

    if (files.length === 0) {
      throw new GitHubImportError({
        code: "no-workflows-found",
        message:
          "No workflow files were found under .github/workflows in that public repository.",
      });
    }

    if (!files.some((file) => !file.tooLarge)) {
      throw new GitHubImportError({
        code: "file-too-large",
        message: `Workflow files were found, but each one exceeds the ${formatBytes(maxFileSizeBytes)} browser import limit.`,
      });
    }

    return {
      fallbackMessage:
        currentRef !== requestedRef
          ? `Could not find workflows on "${requestedRef}", so Authos fetched "${currentRef}" instead.`
          : undefined,
      files,
      refUsed: currentRef,
    };
  }

  const repoExists = await checkPublicGitHubRepoExists({
    fetchImpl,
    owner,
    repo,
    signal,
  });

  if (!repoExists) {
    throw new GitHubImportError({
      code: "repo-not-found",
      message:
        "GitHub could not find that public repository. Check the owner/repo and make sure it is public.",
    });
  }

  if (shouldTryMasterFallback) {
    throw new GitHubImportError({
      code: "no-workflows-found",
      message:
        'No workflow files were found under ".github/workflows" on "main" or "master".',
    });
  }

  throw new GitHubImportError({
    code: "no-workflows-found",
    message: `No workflow files were found under ".github/workflows" on "${requestedRef}".`,
  });
}

export function getGitHubImportErrorMessage(error: unknown): string {
  if (error instanceof GitHubImportError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "GitHub import failed. Please try again.";
}

function parseGitHubDotComUrl(url: URL): ParsedGitHubUrl {
  const pathSegments = getDecodedPathSegments(url.pathname);
  const owner = pathSegments[0];
  const repo = normalizeRepositoryName(pathSegments[1]);

  if (!owner || !repo) {
    throw new GitHubImportError({
      code: "invalid-url",
      message:
        "Enter a public GitHub repository URL like https://github.com/owner/repo.",
    });
  }

  const route = pathSegments[2];

  if (!route) {
    return {
      mode: "repo",
      owner,
      repo,
      url: url.toString(),
    };
  }

  if (route === "blob") {
    const splitResult = splitGitHubRefAndPath(pathSegments.slice(3));

    if (!splitResult || !isLikelyWorkflowPath(splitResult.path)) {
      throw new GitHubImportError({
        code: "invalid-url",
        message:
          "GitHub file imports must point to a .yml or .yaml file under .github/workflows.",
      });
    }

    return {
      mode: "blob-file",
      owner,
      path: splitResult.path,
      rawUrl: githubBlobToRawUrl({
        owner,
        path: splitResult.path,
        ref: splitResult.ref,
        repo,
      }),
      ref: splitResult.ref,
      repo,
      url: url.toString(),
    };
  }

  if (route === "tree") {
    const splitResult = splitGitHubTreeRefAndPath(pathSegments.slice(3));

    return {
      mode: "repo",
      owner,
      ref: splitResult?.ref,
      repo,
      treePath: splitResult?.path,
      url: url.toString(),
    };
  }

  throw new GitHubImportError({
    code: "invalid-url",
    message:
      "Use a public GitHub repository URL, workflow file URL, or raw workflow file URL.",
  });
}

function parseRawGitHubUrl(url: URL): ParsedGitHubRawFileUrl {
  const pathSegments = getDecodedPathSegments(url.pathname);
  const owner = pathSegments[0];
  const repo = normalizeRepositoryName(pathSegments[1]);
  const splitResult = splitGitHubRefAndPath(pathSegments.slice(2));

  if (
    !owner ||
    !repo ||
    !splitResult ||
    !isLikelyWorkflowPath(splitResult.path)
  ) {
    throw new GitHubImportError({
      code: "invalid-url",
      message:
        "Raw GitHub imports must point to a .yml or .yaml file under .github/workflows.",
    });
  }

  return {
    mode: "raw-file",
    owner,
    path: splitResult.path,
    rawUrl: url.toString(),
    ref: splitResult.ref,
    repo,
    url: url.toString(),
  };
}

function getDecodedPathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

function normalizeRepositoryName(repo: string | undefined) {
  if (!repo) {
    return repo;
  }

  return repo.endsWith(".git") ? repo.slice(0, -4) : repo;
}

function splitGitHubRefAndPath(
  pathSegments: string[],
): GitHubFileTarget | null {
  if (pathSegments.length < 2) {
    return null;
  }

  const workflowStartIndex = findWorkflowPathStartIndex(pathSegments);

  if (workflowStartIndex > 0) {
    return {
      owner: "",
      path: pathSegments.slice(workflowStartIndex).join("/"),
      ref: pathSegments.slice(0, workflowStartIndex).join("/"),
      repo: "",
    };
  }

  return {
    owner: "",
    path: pathSegments.slice(1).join("/"),
    ref: pathSegments[0] ?? "",
    repo: "",
  };
}

function splitGitHubTreeRefAndPath(pathSegments: string[]) {
  if (pathSegments.length === 0) {
    return null;
  }

  const workflowStartIndex = findWorkflowPathStartIndex(pathSegments);

  if (workflowStartIndex > 0) {
    return {
      path: pathSegments.slice(workflowStartIndex).join("/"),
      ref: pathSegments.slice(0, workflowStartIndex).join("/"),
    };
  }

  if (pathSegments.length === 1) {
    return {
      path: undefined,
      ref: pathSegments[0],
    };
  }

  return {
    path: pathSegments.slice(1).join("/"),
    ref: pathSegments[0],
  };
}

function findWorkflowPathStartIndex(pathSegments: string[]) {
  return pathSegments.findIndex((segment, index) => {
    return segment === ".github" && pathSegments[index + 1] === "workflows";
  });
}

function encodeGitHubPath(path: string) {
  return normalizeWorkflowPath(path)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildGitHubContentsApiUrl({
  owner,
  path,
  ref,
  repo,
}: GitHubFileTarget) {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(ref)}`;
}

function buildGitHubBlobUrl({ owner, path, ref, repo }: GitHubFileTarget) {
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/${encodeURIComponent(ref)}/${encodeGitHubPath(path)}`;
}

function buildGitHubWorkspacePath({
  owner,
  path,
  repo,
}: Pick<GitHubFileTarget, "owner" | "path" | "repo">) {
  return normalizeWorkflowPath(
    `${owner}/${repo}/${normalizeWorkflowPath(path)}`,
  );
}

function createFetchInit({
  headers,
  signal,
}: {
  headers?: HeadersInit | undefined;
  signal?: AbortSignal | undefined;
}) {
  const init: RequestInit = {};

  if (headers) {
    init.headers = headers;
  }

  if (signal) {
    init.signal = signal;
  }

  return init;
}

async function checkPublicGitHubRepoExists({
  fetchImpl,
  owner,
  repo,
  signal,
}: {
  fetchImpl: typeof fetch;
  owner: string;
  repo: string;
  signal?: AbortSignal | undefined;
}) {
  let response: Response;

  try {
    response = await fetchImpl(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      createFetchInit({
        headers: {
          Accept: "application/vnd.github+json",
        },
        signal,
      }),
    );
  } catch {
    throw new GitHubImportError({
      code: "network",
      message:
        "The browser could not reach GitHub. Check your connection or try again in a moment.",
    });
  }

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw await mapGitHubResponseError({
      response,
      missingCode: "repo-not-found",
      missingMessage:
        "GitHub could not find that public repository. Check the owner/repo and make sure it is public.",
    });
  }

  return true;
}

async function mapGitHubResponseError({
  missingCode,
  missingMessage,
  response,
}: {
  missingCode: GitHubImportErrorCode;
  missingMessage: string;
  response: Response;
}) {
  const responseText = await response.text();
  const looksRateLimited =
    response.status === 429 ||
    response.headers.get("x-ratelimit-remaining") === "0" ||
    responseText.toLowerCase().includes("rate limit");

  if (looksRateLimited) {
    return new GitHubImportError({
      code: "rate-limit",
      message:
        "GitHub's unauthenticated public API rate limit was reached. Please wait a little and try again.",
      status: response.status,
    });
  }

  if (response.status === 404) {
    return new GitHubImportError({
      code: missingCode,
      message: missingMessage,
      status: response.status,
    });
  }

  return new GitHubImportError({
    code: "unsupported-response",
    message:
      "GitHub returned an unexpected response. Please try again in a moment.",
    status: response.status,
  });
}

interface GitHubApiContentEntry {
  download_url?: string | null | undefined;
  html_url?: string | null | undefined;
  path: string;
  size: number;
  type: string;
}

function isGitHubApiContentEntry(
  value: unknown,
): value is GitHubApiContentEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GitHubApiContentEntry>;

  return (
    typeof candidate.path === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.type === "string"
  );
}
