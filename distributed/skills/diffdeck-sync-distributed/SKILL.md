---
name: diffdeck-sync-distributed
description: Install or update DiffDeck distributed skills and agent instruction snippets in a target project. Use when a user wants a project to retrieve DiffDeck distributed assets, synchronize updates from a local DiffDeck repository, refresh installed DiffDeck skills, or keep AGENTS/CLAUDE/GEMINI snippets aligned without manually copying files.
---

# DiffDeck Distributed Sync

## Purpose

Synchronize DiffDeck distributed assets from a local DiffDeck repository into a target project.

This skill installs or updates:

- `.agent/skills/diffdeck-code-review`
- `.agent/skills/diffdeck-browser-prefill`
- `.agent/skills/diffdeck-sync-distributed`
- `.agent/diffdeck/snippets/*`

It does not edit the target project's root `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` automatically. Those files are project-owned; update them manually after reviewing the snippets.

## Workflow

1. Identify the local DiffDeck repository root.
2. Identify the target project root.
3. Run a dry-run sync first.
4. Review conflicts or planned updates.
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
- Use `--force` only when the user explicitly wants DiffDeck distributed assets to overwrite local edits.

If conflicts exist, inspect them before using `--force`. Project-specific instructions should usually stay in project files, not inside copied DiffDeck skills.

## Updating Agent Entry Points

After syncing snippets, compare:

```text
<TARGET_PROJECT_ROOT>/.agent/diffdeck/snippets/
```

with the target project's actual entry files, such as:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- shared `.agent/instructions/*`

Add or refresh only the short DiffDeck note. Do not replace an existing project instruction file wholesale unless the user explicitly asks.

## MCP Reminder

This skill only syncs distributed assets into a target project. It does not configure MCP.

For MCP setup, run from the DiffDeck repository:

```bash
npm run setup:mcp
```

For Codex:

```bash
npm run setup:mcp:codex
```

After MCP setup changes, restart the AI tool so it reloads MCP servers.
