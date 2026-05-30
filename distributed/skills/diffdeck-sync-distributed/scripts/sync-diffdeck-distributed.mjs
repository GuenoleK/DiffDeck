#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const skillNames = ["diffdeck-code-review", "diffdeck-browser-prefill", "diffdeck-sync-distributed"];
const defaultInstructionFiles = ["AGENTS.md", "CLAUDE.md", "GEMINI.md"];
const instructionStartMarker = "<!-- BEGIN DIFFDECK MANAGED BLOCK -->";
const instructionEndMarker = "<!-- END DIFFDECK MANAGED BLOCK -->";

function parseArgs(argv) {
  const args = {
    diffdeckRoot: undefined,
    targetRoot: process.cwd(),
    dryRun: false,
    force: false,
    skipInstructions: false,
    instructionFiles: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--diffdeck-root") {
      args.diffdeckRoot = argv[++index];
    } else if (arg === "--target-root") {
      args.targetRoot = argv[++index];
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--skip-instructions") {
      args.skipInstructions = true;
    } else if (arg === "--instructions-file") {
      args.instructionFiles.push(argv[++index]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.diffdeckRoot) {
    throw new Error("Missing required --diffdeck-root <DIFFDECK_ROOT>");
  }
  if (!args.targetRoot || args.diffdeckRoot.startsWith("--") || args.targetRoot.startsWith("--") || args.instructionFiles.some((file) => !file || file.startsWith("--"))) {
    throw new Error("Missing value for an argument that expects a path.");
  }

  return {
    ...args,
    diffdeckRoot: resolve(args.diffdeckRoot),
    targetRoot: resolve(args.targetRoot),
  };
}

function printHelp() {
  console.log(`Usage:
  node sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> [--target-root <TARGET_PROJECT_ROOT>] [--dry-run] [--force] [--skip-instructions] [--instructions-file <PATH>]

Copies DiffDeck distributed skills to:
  <TARGET_PROJECT_ROOT>/.agent/skills/

Updates a managed DiffDeck instruction block in existing agent entry files:
  AGENTS.md, CLAUDE.md, GEMINI.md

If none of those files exist, AGENTS.md is created. Pass --instructions-file
one or more times to choose specific project instruction files instead.
`);
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

async function sha256(path) {
  const buffer = await readFile(path);
  return createHash("sha256").update(buffer).digest("hex");
}

async function readManifest(path) {
  if (!existsSync(path)) {
    return { files: {} };
  }

  return JSON.parse(await readFile(path, "utf8"));
}

async function writeManifest(path, manifest, dryRun) {
  if (dryRun) {
    return;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function assertInsideTarget(targetRoot, path) {
  const relativePath = relative(targetRoot, path);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Instruction file must stay inside target root: ${path}`);
  }
}

async function assertValidRoots(diffdeckRoot, targetRoot) {
  const distributedRoot = join(diffdeckRoot, "distributed");
  const packageJsonPath = join(diffdeckRoot, "package.json");

  if (!existsSync(distributedRoot) || !existsSync(packageJsonPath)) {
    throw new Error(`Not a DiffDeck repository root: ${diffdeckRoot}`);
  }

  const sourceReal = await realpath(diffdeckRoot);
  const targetReal = existsSync(targetRoot) ? await realpath(targetRoot) : targetRoot;
  if (sourceReal === targetReal) {
    throw new Error("Refusing to sync DiffDeck distributed assets into the DiffDeck repository itself.");
  }
}

async function collectCopyPlan(diffdeckRoot, targetRoot) {
  const plan = [];

  for (const skillName of skillNames) {
    const sourceRoot = join(diffdeckRoot, "distributed", "skills", skillName);
    const targetRootForSkill = join(targetRoot, ".agent", "skills", skillName);
    const sourceFiles = await listFiles(sourceRoot);

    for (const sourcePath of sourceFiles) {
      const relativePath = relative(sourceRoot, sourcePath);
      plan.push({
        sourcePath,
        targetPath: join(targetRootForSkill, relativePath),
        manifestKey: `.agent/skills/${skillName}/${relativePath.replaceAll("\\", "/")}`,
      });
    }
  }

  return plan;
}

function instructionBlock(eol) {
  return [
    instructionStartMarker,
    "## DiffDeck",
    "",
    "- For AI code review, MR/PR analysis, branch analysis, diff analysis, ticket review, or local changes, use `.agent/skills/diffdeck-code-review` by default, even if the user does not explicitly mention DiffDeck.",
    "- For browser prefill of approved comments in GitLab, GitHub, Bitbucket, or another browser review UI, use `.agent/skills/diffdeck-browser-prefill`; retrieve the queue with `list_approved_findings` and use `suggestion` as the final human-edited comment.",
    "- For installing, updating, refreshing, or synchronizing DiffDeck distributed skills in this project, use `.agent/skills/diffdeck-sync-distributed`; run a dry-run first and do not overwrite local edits unless explicitly requested.",
    "- For questions asked from the DiffDeck UI conversation, use `.agent/skills/diffdeck-code-review` and the MCP conversation tools. For one-shot replies, use `list_pending_conversation` then `add_conversation_reply`. For live chat, loop on `wait_for_conversation_message`, answer with the current agent's project context, then send the reply back to DiffDeck with `add_conversation_reply`.",
    "- If DiffDeck MCP is unavailable, stop before the review, propose MCP configuration as the main next step, then mention chat-only review only as fallback.",
    "- If MCP configuration requires restarting the AI tool, give a clear resume phrase with the source, target branch, and context, for example: \"Analyze <SOURCE> with DiffDeck. Target branch: <TARGET>. Feature/fix context: <ticket, acceptance criteria, business description, or useful knowledge>.\"",
    instructionEndMarker,
  ].join(eol);
}

function chooseEol(content) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function hasUnmanagedDiffDeckInstructions(content) {
  return (
    content.includes("diffdeck-code-review") ||
    content.includes("diffdeck-browser-prefill") ||
    content.includes("diffdeck-sync-distributed")
  );
}

async function collectInstructionPlan(targetRoot, instructionFiles) {
  if (instructionFiles.length > 0) {
    return instructionFiles.map((instructionFile) => {
      const targetPath = resolve(targetRoot, instructionFile);
      assertInsideTarget(targetRoot, targetPath);
      return {
        targetPath,
        manifestKey: relative(targetRoot, targetPath).replaceAll("\\", "/"),
      };
    });
  }

  const existingInstructionFiles = defaultInstructionFiles
    .map((instructionFile) => join(targetRoot, instructionFile))
    .filter((targetPath) => existsSync(targetPath));

  const targetPaths = existingInstructionFiles.length > 0 ? existingInstructionFiles : [join(targetRoot, "AGENTS.md")];

  return targetPaths.map((targetPath) => ({
    targetPath,
    manifestKey: relative(targetRoot, targetPath).replaceAll("\\", "/"),
  }));
}

async function syncFile(item, manifest, nextManifest, options) {
  const sourceHash = await sha256(item.sourcePath);
  const existingTarget = existsSync(item.targetPath);
  const targetHash = existingTarget ? await sha256(item.targetPath) : undefined;
  const previous = manifest.files[item.manifestKey];
  const sameAsSource = existingTarget && targetHash === sourceHash;
  const locallyModified =
    existingTarget &&
    ((previous?.targetHash && targetHash !== previous.targetHash) || (!previous && !sameAsSource));

  if (sameAsSource) {
    nextManifest.files[item.manifestKey] = { sourceHash, targetHash: sourceHash };
    return { action: "unchanged", item };
  }

  if (locallyModified && !options.force) {
    if (previous) {
      nextManifest.files[item.manifestKey] = previous;
    }
    return { action: "conflict", item };
  }

  if (!options.dryRun) {
    await mkdir(dirname(item.targetPath), { recursive: true });
    await writeFile(item.targetPath, await readFile(item.sourcePath));
  }

  nextManifest.files[item.manifestKey] = { sourceHash, targetHash: sourceHash };
  return { action: existingTarget ? "updated" : "created", item };
}

async function syncInstructions(item, options) {
  const exists = existsSync(item.targetPath);
  const content = exists ? await readFile(item.targetPath, "utf8") : "";
  const eol = exists ? chooseEol(content) : "\n";
  const block = instructionBlock(eol);

  let nextContent;
  if (!exists) {
    nextContent = [`# Project Agent Instructions`, "", block, ""].join(eol);
  } else {
    const start = content.indexOf(instructionStartMarker);
    const end = content.indexOf(instructionEndMarker);

    if ((start === -1) !== (end === -1) || end < start) {
      return { action: "conflict", item };
    }

    if (start !== -1) {
      nextContent = `${content.slice(0, start)}${block}${content.slice(end + instructionEndMarker.length)}`;
    } else if (hasUnmanagedDiffDeckInstructions(content) && !options.force) {
      return { action: "conflict", item };
    } else {
      const trimmedEnd = content.replace(/\s*$/, "");
      nextContent = `${trimmedEnd}${eol}${eol}${block}${eol}`;
    }
  }

  if (nextContent === content) {
    return { action: "unchanged", item };
  }

  if (!options.dryRun) {
    await mkdir(dirname(item.targetPath), { recursive: true });
    await writeFile(item.targetPath, nextContent, "utf8");
  }

  return { action: exists ? "updated" : "created", item };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await assertValidRoots(options.diffdeckRoot, options.targetRoot);

  const manifestPath = join(options.targetRoot, ".agent", "diffdeck", "sync-manifest.json");
  const manifest = await readManifest(manifestPath);
  const nextManifest = { syncedAt: new Date().toISOString(), files: {} };
  const plan = await collectCopyPlan(options.diffdeckRoot, options.targetRoot);
  const results = [];

  for (const item of plan) {
    results.push(await syncFile(item, manifest, nextManifest, options));
  }

  if (!options.skipInstructions) {
    const instructionPlan = await collectInstructionPlan(options.targetRoot, options.instructionFiles);
    for (const item of instructionPlan) {
      results.push(await syncInstructions(item, options));
    }
  }

  await writeManifest(manifestPath, nextManifest, options.dryRun);

  const groups = results.reduce((accumulator, result) => {
    accumulator[result.action] ??= [];
    accumulator[result.action].push(result);
    return accumulator;
  }, {});
  for (const action of ["created", "updated", "unchanged", "conflict"]) {
    for (const result of groups[action] ?? []) {
      console.log(`${action.padEnd(9)} ${result.item.manifestKey}`);
    }
  }

  if (groups.conflict?.length) {
    console.error("\nConflicts were skipped because target files changed locally or contain unmanaged DiffDeck instructions. Re-run with --force only when applying the DiffDeck-managed content is intentional.");
    process.exitCode = 2;
  }

  if (options.dryRun) {
    console.log("\nDry run only. Re-run without --dry-run to apply non-conflicting changes.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
