import { execFile } from "node:child_process";
import { extname } from "node:path";
import { promisify } from "node:util";
import type { ReviewFileDiffDraftInput } from "@diffdeck/core";
import type { DiffDeckClient } from "./diffdeck-client.js";

const execFileAsync = promisify(execFile);

type GitFileStatus = ReviewFileDiffDraftInput["status"];

export type SyncGitFileDiffsInput = {
  repositoryPath: string;
  baseRef: string;
  compareMode?: "direct" | "merge-base";
  agentName?: string;
};

export type SyncGitFileDiffsResult = {
  baseRef: string;
  compareMode: "direct" | "merge-base";
  effectiveBaseRef: string;
  repositoryPath: string;
  fileCount: number;
  files: Array<{
    filePath: string;
    status: GitFileStatus;
    additions?: number;
    deletions?: number;
  }>;
};

type GitFileEntry = {
  filePath: string;
  oldFilePath?: string;
  status: GitFileStatus;
};

type GitNumstatEntry = {
  additions?: number;
  deletions?: number;
};

async function git(repositoryPath: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", repositoryPath, ...args], {
    maxBuffer: 1024 * 1024 * 64,
  });

  return stdout;
}

function parseStatus(statusCode: string): GitFileStatus {
  switch (statusCode[0]) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    case "M":
      return "modified";
    default:
      return "modified";
  }
}

function parseNameStatus(output: string): GitFileEntry[] {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const status = parseStatus(parts[0]);

      if (status === "renamed" || status === "copied") {
        return {
          status,
          oldFilePath: parts[1],
          filePath: parts[2],
        };
      }

      return {
        status,
        filePath: parts[1],
      };
    })
    .filter((entry) => Boolean(entry.filePath));
}

function parseNumstat(output: string): Map<string, GitNumstatEntry> {
  const entries = new Map<string, GitNumstatEntry>();

  output
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => {
      const [additionsValue, deletionsValue, ...pathParts] = line.split("\t");
      const filePath = pathParts.at(-1);

      if (!filePath) {
        return;
      }

      entries.set(filePath, {
        additions: /^\d+$/.test(additionsValue) ? Number(additionsValue) : undefined,
        deletions: /^\d+$/.test(deletionsValue) ? Number(deletionsValue) : undefined,
      });
    });

  return entries;
}

function languageFromPath(filePath: string): string | undefined {
  const extension = extname(filePath).replace(/^\./, "");
  return extension || undefined;
}

async function resolveEffectiveBaseRef(input: SyncGitFileDiffsInput): Promise<string> {
  if (input.compareMode !== "merge-base") {
    return input.baseRef;
  }

  return (await git(input.repositoryPath, ["merge-base", input.baseRef, "HEAD"])).trim();
}

export async function syncGitFileDiffs(
  client: DiffDeckClient,
  input: SyncGitFileDiffsInput,
): Promise<SyncGitFileDiffsResult> {
  const compareMode = input.compareMode ?? "direct";
  const effectiveBaseRef = await resolveEffectiveBaseRef(input);
  const statusEntries = parseNameStatus(await git(input.repositoryPath, ["diff", "--name-status", effectiveBaseRef]));
  const numstatEntries = parseNumstat(await git(input.repositoryPath, ["diff", "--numstat", effectiveBaseRef]));
  const fileDiffDrafts: ReviewFileDiffDraftInput[] = [];

  for (const entry of statusEntries) {
    const unifiedDiff = await git(input.repositoryPath, ["diff", effectiveBaseRef, "--", entry.filePath]);

    if (!unifiedDiff.trim()) {
      continue;
    }

    const numstat = numstatEntries.get(entry.filePath);
    fileDiffDrafts.push({
      filePath: entry.filePath,
      oldFilePath: entry.oldFilePath,
      status: entry.status,
      language: languageFromPath(entry.filePath),
      unifiedDiff,
      additions: numstat?.additions,
      deletions: numstat?.deletions,
      agentName: input.agentName,
    });
  }

  const syncedFileDiffs = await client.replaceFileDiffs(fileDiffDrafts);
  const syncedFiles = syncedFileDiffs.map((fileDiff) => ({
    filePath: fileDiff.filePath,
    status: fileDiff.status,
    additions: fileDiff.additions,
    deletions: fileDiff.deletions,
  }));

  return {
    baseRef: input.baseRef,
    compareMode,
    effectiveBaseRef,
    repositoryPath: input.repositoryPath,
    fileCount: syncedFiles.length,
    files: syncedFiles,
  };
}
