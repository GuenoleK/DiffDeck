#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const skillNames = ["diffdeck-code-review", "diffdeck-browser-prefill", "diffdeck-sync-distributed"];
const snippetNames = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", "mcp-config.example.json"];

function parseArgs(argv) {
  const args = {
    diffdeckRoot: undefined,
    targetRoot: process.cwd(),
    dryRun: false,
    force: false,
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

  return {
    ...args,
    diffdeckRoot: resolve(args.diffdeckRoot),
    targetRoot: resolve(args.targetRoot),
  };
}

function printHelp() {
  console.log(`Usage:
  node sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> [--target-root <TARGET_PROJECT_ROOT>] [--dry-run] [--force]

Copies DiffDeck distributed skills to:
  <TARGET_PROJECT_ROOT>/.agent/skills/

Copies DiffDeck instruction snippets to:
  <TARGET_PROJECT_ROOT>/.agent/diffdeck/snippets/
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

  for (const snippetName of snippetNames) {
    plan.push({
      sourcePath: join(diffdeckRoot, "distributed", "snippets", snippetName),
      targetPath: join(targetRoot, ".agent", "diffdeck", "snippets", snippetName),
      manifestKey: `.agent/diffdeck/snippets/${snippetName}`,
    });
  }

  return plan;
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
    return { action: "conflict", item };
  }

  if (!options.dryRun) {
    await mkdir(dirname(item.targetPath), { recursive: true });
    await writeFile(item.targetPath, await readFile(item.sourcePath));
  }

  nextManifest.files[item.manifestKey] = { sourceHash, targetHash: sourceHash };
  return { action: existingTarget ? "updated" : "created", item };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await assertValidRoots(options.diffdeckRoot, options.targetRoot);

  const manifestPath = join(options.targetRoot, ".agent", "diffdeck", "sync-manifest.json");
  const manifest = await readManifest(manifestPath);
  const nextManifest = { syncedAt: new Date().toISOString(), files: { ...manifest.files } };
  const plan = await collectCopyPlan(options.diffdeckRoot, options.targetRoot);
  const results = [];

  for (const item of plan) {
    results.push(await syncFile(item, manifest, nextManifest, options));
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
    console.error("\nConflicts were skipped because target files changed locally. Re-run with --force only if overwriting them is intended.");
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
