import { describe, expect, it, vi } from "vitest";

import {
  fetchPublicGitHubFile,
  fetchPublicGitHubWorkflowDirectory,
  getGitHubImportErrorMessage,
  githubBlobToRawUrl,
  isLikelyWorkflowPath,
  parseGitHubUrl,
} from "@/features/actions-analyzer/lib/github-import";

describe("parseGitHubUrl", () => {
  it("parses blob workflow URLs", () => {
    expect(
      parseGitHubUrl(
        "https://github.com/octo-org/example-repo/blob/main/.github/workflows/ci.yml",
      ),
    ).toMatchObject({
      mode: "blob-file",
      owner: "octo-org",
      path: ".github/workflows/ci.yml",
      ref: "main",
      repo: "example-repo",
    });
  });

  it("parses raw workflow URLs", () => {
    expect(
      parseGitHubUrl(
        "https://raw.githubusercontent.com/octo-org/example-repo/main/.github/workflows/release.yaml",
      ),
    ).toMatchObject({
      mode: "raw-file",
      owner: "octo-org",
      path: ".github/workflows/release.yaml",
      ref: "main",
      repo: "example-repo",
    });
  });

  it("parses public repository URLs", () => {
    expect(
      parseGitHubUrl("https://github.com/octo-org/example-repo"),
    ).toMatchObject({
      mode: "repo",
      owner: "octo-org",
      repo: "example-repo",
    });
  });

  it("parses tree URLs with a branch and workflows path", () => {
    expect(
      parseGitHubUrl(
        "https://github.com/octo-org/example-repo/tree/release/.github/workflows",
      ),
    ).toMatchObject({
      mode: "repo",
      owner: "octo-org",
      ref: "release",
      repo: "example-repo",
      treePath: ".github/workflows",
    });
  });
});

describe("GitHub workflow helpers", () => {
  it("recognizes likely workflow paths", () => {
    expect(isLikelyWorkflowPath(".github/workflows/ci.yml")).toBe(true);
    expect(
      isLikelyWorkflowPath("octo/example/.github/workflows/release.yaml"),
    ).toBe(true);
    expect(isLikelyWorkflowPath("docs/workflow.yml")).toBe(false);
  });

  it("converts blob URLs to raw URLs", () => {
    expect(
      githubBlobToRawUrl({
        owner: "octo-org",
        path: ".github/workflows/ci.yml",
        ref: "main",
        repo: "example-repo",
      }),
    ).toBe(
      "https://raw.githubusercontent.com/octo-org/example-repo/main/.github/workflows/ci.yml",
    );
  });
});

describe("fetchPublicGitHubWorkflowDirectory", () => {
  it("maps workflow directory responses and filters non-workflow files", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      createJsonResponse([
        {
          download_url:
            "https://raw.githubusercontent.com/octo-org/example-repo/main/.github/workflows/ci.yml",
          html_url:
            "https://github.com/octo-org/example-repo/blob/main/.github/workflows/ci.yml",
          path: ".github/workflows/ci.yml",
          size: 120,
          type: "file",
        },
        {
          download_url:
            "https://raw.githubusercontent.com/octo-org/example-repo/main/.github/workflows/release.yaml",
          html_url:
            "https://github.com/octo-org/example-repo/blob/main/.github/workflows/release.yaml",
          path: ".github/workflows/release.yaml",
          size: 180,
          type: "file",
        },
        {
          path: ".github/workflows/notes.txt",
          size: 64,
          type: "file",
        },
        {
          path: ".github/workflows/archive",
          size: 0,
          type: "dir",
        },
      ]),
    );

    const result = await fetchPublicGitHubWorkflowDirectory({
      fetchImpl,
      owner: "octo-org",
      ref: "main",
      repo: "example-repo",
    });

    expect(result.refUsed).toBe("main");
    expect(result.fallbackMessage).toBeUndefined();
    expect(result.files).toMatchObject([
      {
        path: ".github/workflows/ci.yml",
        sizeBytes: 120,
        tooLarge: false,
        workspacePath: "octo-org/example-repo/.github/workflows/ci.yml",
      },
      {
        path: ".github/workflows/release.yaml",
        sizeBytes: 180,
        tooLarge: false,
        workspacePath: "octo-org/example-repo/.github/workflows/release.yaml",
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back to "master" when "main" is missing and no ref was provided', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(
        createJsonResponse([
          {
            download_url:
              "https://raw.githubusercontent.com/octo-org/example-repo/master/.github/workflows/ci.yml",
            html_url:
              "https://github.com/octo-org/example-repo/blob/master/.github/workflows/ci.yml",
            path: ".github/workflows/ci.yml",
            size: 120,
            type: "file",
          },
        ]),
      );

    const result = await fetchPublicGitHubWorkflowDirectory({
      fetchImpl,
      owner: "octo-org",
      repo: "example-repo",
    });

    expect(result.refUsed).toBe("master");
    expect(result.fallbackMessage).toContain('"main"');
    expect(result.fallbackMessage).toContain('"master"');
  });

  it("reports repo-not-found when the public repository cannot be reached", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    await expect(
      fetchPublicGitHubWorkflowDirectory({
        fetchImpl,
        owner: "missing",
        repo: "repo",
      }),
    ).rejects.toMatchObject({
      code: "repo-not-found",
    });
  });

  it("maps GitHub API rate limits to a clear error", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("API rate limit exceeded", {
        headers: {
          "x-ratelimit-remaining": "0",
        },
        status: 403,
      }),
    );

    await expect(
      fetchPublicGitHubWorkflowDirectory({
        fetchImpl,
        owner: "octo-org",
        repo: "example-repo",
      }),
    ).rejects.toMatchObject({
      code: "rate-limit",
    });
  });
});

describe("fetchPublicGitHubFile", () => {
  it("fetches public workflow file content", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("name: CI\non: push\n", {
        headers: {
          "content-length": "18",
        },
        status: 200,
      }),
    );

    const result = await fetchPublicGitHubFile({
      fetchImpl,
      owner: "octo-org",
      path: ".github/workflows/ci.yml",
      ref: "main",
      repo: "example-repo",
    });

    expect(result).toMatchObject({
      content: "name: CI\non: push\n",
      path: ".github/workflows/ci.yml",
      workspacePath: "octo-org/example-repo/.github/workflows/ci.yml",
    });
  });

  it("maps oversized workflow files to a clear error", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("name: CI\n", {
        headers: {
          "content-length": "2097152",
        },
        status: 200,
      }),
    );

    await expect(
      fetchPublicGitHubFile({
        fetchImpl,
        maxFileSizeBytes: 1024,
        owner: "octo-org",
        path: ".github/workflows/ci.yml",
        ref: "main",
        repo: "example-repo",
      }),
    ).rejects.toMatchObject({
      code: "file-too-large",
    });
  });

  it("maps network failures to a browser-friendly error", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      fetchPublicGitHubFile({
        fetchImpl,
        owner: "octo-org",
        path: ".github/workflows/ci.yml",
        ref: "main",
        repo: "example-repo",
      }),
    ).rejects.toMatchObject({
      code: "network",
    });
  });
});

describe("getGitHubImportErrorMessage", () => {
  it("returns a user-friendly message from known import errors", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      fetchPublicGitHubFile({
        fetchImpl,
        owner: "octo-org",
        path: ".github/workflows/ci.yml",
        ref: "main",
        repo: "example-repo",
      }).catch((error) => {
        expect(getGitHubImportErrorMessage(error)).toContain("GitHub");
        throw error;
      }),
    ).rejects.toBeTruthy();
  });
});

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status: 200,
    ...init,
  });
}
