# DiffDeck Distributed Assets

These files are meant to be copied into projects that want to use DiffDeck.

- `skills/`: skills that teach AI agents how to push code review findings to DiffDeck.
- `snippets/`: reference examples for target project agent files. The sync script does not copy them automatically.

These files are not for developing DiffDeck itself. Internal DiffDeck development instructions live in `.agent/`.

## Install In A Target Project

In the project that will use DiffDeck, copy these folders:

```text
DiffDeck\distributed\skills\diffdeck-code-review
DiffDeck\distributed\skills\diffdeck-browser-prefill
DiffDeck\distributed\skills\diffdeck-sync-distributed
```

Paste them into:

```text
target-project\.agent\skills\
```

The target project should then contain:

```text
target-project/
  .agent/
    skills/
      diffdeck-code-review/
        SKILL.md
      diffdeck-browser-prefill/
        SKILL.md
      diffdeck-sync-distributed/
        SKILL.md
```

Then add this note to the target project's shared agent/development instructions:

```md
DiffDeck:
- For AI code review, MR/PR analysis, branch analysis, or diff analysis, use `.agent/skills/diffdeck-code-review` by default, even if the user does not explicitly mention DiffDeck.
- For browser prefill of approved comments in GitLab/GitHub, use `.agent/skills/diffdeck-browser-prefill`; retrieve the queue with `list_approved_findings` and use `suggestion` as the final human-edited comment.
- For installing or updating DiffDeck distributed skills and this project's DiffDeck instruction block, use `.agent/skills/diffdeck-sync-distributed`; run a dry-run first and do not overwrite local edits unless explicitly requested.
- For questions asked from the DiffDeck UI conversation, use `.agent/skills/diffdeck-code-review` and the MCP conversation tools. For one-shot replies, use `list_pending_conversation` then `add_conversation_reply`. For live chat, loop on `wait_for_conversation_message`, answer with the current agent's project context, then send the reply back to DiffDeck with `add_conversation_reply`.
- Call `record_usage` near the end of the review. Use exact provider counters when the current AI tool exposes them; otherwise mark provider totals `unavailable` so DiffDeck can add observed local estimates. Mark total provider usage and DiffDeck/project/host attribution as `exact`, `estimated`, `observed`, or `unavailable`.
- If DiffDeck MCP is unavailable, stop before the review, propose MCP configuration as the main next step, then mention chat-only review only as fallback.
- If MCP configuration requires restarting the AI tool, give a clear resume phrase with the source, target branch, and context, for example: "Analyze <SOURCE> with DiffDeck. Target branch: <TARGET>. Feature/fix context: <ticket, acceptance criteria, business description, or useful knowledge>."
```

For MCP setup, run this from the DiffDeck repository:

```bash
npm run setup:mcp
```

For Codex specifically:

```bash
npm run setup:mcp:codex
```

These commands must be run from the DiffDeck repository root, not from the target project being reviewed.

From another folder, use:

```bash
npm --prefix <DIFFDECK_ROOT> run setup:mcp:codex
```

To only print the config:

```bash
npm run setup:mcp:print
```

Set `DIFFDECK_LOG_LEVEL` to tune server and MCP logs: `silent`, `error`, `info`, or `debug`. The default is `info`; repeated conversation polling logs only appear in `debug`.

## Sync Updates Later

After the first manual copy, use `diffdeck-sync-distributed` from the target project to refresh DiffDeck distributed skills and the short DiffDeck instruction block.

Dry-run:

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --dry-run
```

Apply non-conflicting updates:

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT>
```

The script writes `.agent/diffdeck/sync-manifest.json` and skips files that changed locally since the previous sync. Use `--force` only when overwriting local edits is intentional.

The script does not copy `distributed/snippets` or `mcp-config.example.json` into the target project. Those files stay in DiffDeck as examples. By default, the script updates a managed DiffDeck block in existing `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` files. If none exists, it creates `AGENTS.md`. Use `--instructions-file <PATH>` to target another project-owned instruction file, or `--skip-instructions` to sync skills only.

## DiffDeck UI Conversation

DiffDeck's chat is a local inbox for MCP-connected agents. The UI stores human questions, but it does not call an AI provider directly or wake an agent by itself.

Use these MCP tools for conversation follow-up:

- `list_conversation`: read the full conversation history.
- `list_pending_conversation`: read human UI messages that do not have an agent reply yet.
- `wait_for_conversation_message`: watch for the next pending human UI message.
- `add_conversation_reply`: send the agent reply back into the UI.
- `record_usage`: store token usage for the active review, including unavailable provider totals and observed local estimates.

For one-shot answers, ask the agent to read pending messages and reply:

```text
Read pending DiffDeck UI messages with list_pending_conversation, answer the latest one, then send the answer with add_conversation_reply.
```

For live chat, ask the agent to watch:

```text
Start watching DiffDeck chat with wait_for_conversation_message. When a pending human message arrives, answer it with project context and send the reply with add_conversation_reply. Repeat until I ask you to stop.
```

DiffDeck can also be used before a platform MR/PR exists. Ask the agent to review a source branch against a target branch, for example:

```text
Review branch feature/dose-validation against dev with DiffDeck. Context: implements ticket DOSITL-337.
```

If the target branch is missing, the agent should ask for it before analyzing.

For MR/PR and branch reviews, findings should stay scoped to files present in the reviewed diff. Agents may read files outside the diff for context, but should not publish out-of-diff findings unless the user explicitly asks for a broader audit.
