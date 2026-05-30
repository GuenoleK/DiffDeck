---
name: diffdeck-sync-distributed
description: Install or update DiffDeck distributed skills and the managed DiffDeck instruction block in a target project. Use when a user wants a project to retrieve DiffDeck distributed assets, synchronize updates from a local DiffDeck repository, refresh installed DiffDeck skills, or keep AGENTS/CLAUDE/GEMINI instructions aligned without manually copying example snippets.
---

# DiffDeck Distributed Sync

## Purpose

Synchronize DiffDeck distributed assets from a local DiffDeck repository into a target project.

This skill installs or updates:

- `.agent/skills/diffdeck-code-review`
- `.agent/skills/diffdeck-browser-prefill`
- `.agent/skills/diffdeck-sync-distributed`

It also updates a bounded DiffDeck-managed block in the target project's existing `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` files. If none exists, it creates `AGENTS.md`. It does not copy `distributed/snippets` or `mcp-config.example.json` into the target project; those files stay in DiffDeck as reference examples.

## Workflow

1. Identify the local DiffDeck repository root.
2. Identify the target project root.
3. Run a dry-run sync first.
4. Review skill conflicts, instruction-block updates, or unmanaged existing DiffDeck instructions.
5. Run the real sync.
6. If MCP config changed separately, remind the user to restart the AI tool.

Use the bundled script:

```bash
node <SKILL_DIR>/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --target-root <TARGET_PROJECT_ROOT> --dry-run
```

Then apply:

```bash
node <SKILL_DIR>/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --target-root <TARGET_PROJECT_ROOT>
```

When running from the target project, `--target-root` can be omitted:

```bash
node <SKILL_DIR>/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT>
```

## Conflict Policy

The script writes `.agent/diffdeck/sync-manifest.json` in the target project.

- Missing files are copied.
- Files unchanged since the previous sync are updated.
- Files changed locally since the previous sync are skipped and reported as conflicts.
- Instruction files are edited only inside the DiffDeck-managed block. If an instruction file already mentions DiffDeck without the managed markers, the script reports a conflict instead of silently duplicating guidance.
- Use `--force` only when the user explicitly wants DiffDeck distributed skill files or managed instruction content to overwrite local edits.

If conflicts exist, inspect them before using `--force`. Project-specific instructions should usually stay in project files, not inside copied DiffDeck skills.

## Updating Agent Entry Points

By default, the script targets existing files among:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
```

If none of those files exist, it creates `AGENTS.md`. To target another project-owned instruction file, pass:

```bash
node <SKILL_DIR>/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --target-root <TARGET_PROJECT_ROOT> --instructions-file .agent/instructions/00-index.md
```

Use `--skip-instructions` when the user wants to sync skills only. Do not replace an existing project instruction file wholesale unless the user explicitly asks.

## MCP Reminder

This skill only syncs distributed skills and the managed instruction block into a target project. It does not configure MCP.

For MCP setup, run from the DiffDeck repository:

```bash
npm run setup:mcp
```

For Codex:

```bash
npm run setup:mcp:codex
```

After MCP setup changes, restart the AI tool so it reloads MCP servers.
