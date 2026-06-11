# DiffDeck

DiffDeck is a local, agent-friendly code review dashboard.

The first MVP is intentionally small:

- a local web UI for human review;
- a local API server with in-memory state;
- a MCP server so AI agents can push structured findings;
- a CLI setup assistant for MCP configuration;
- no database at first;
- copy/paste session handoff for lightweight persistence.

French documentation is available in [`docs/fr/README.md`](docs/fr/README.md).
Browser prefill modes are detailed in [`docs/browser-prefill-modes.md`](docs/browser-prefill-modes.md).

## Quick Start

You do not need to configure MCP before opening the dashboard.

Open a terminal in the DiffDeck repository:

```bash
cd <DIFFDECK_ROOT>
npm install
npm run dev:server
```

Open a second terminal in the same repository:

```bash
npm run dev:web
```

Open:

```text
http://127.0.0.1:5173
```

The dashboard starts empty. Findings appear when an AI agent pushes them through MCP or when you call the local API.

The local API runs on `http://127.0.0.1:4337`.

## Use The MVP

DiffDeck currently runs as a local two-part app:

- the API server stores the active review in memory;
- the web UI displays and edits the active review.

Start the API in a first terminal:

```bash
npm run dev:server
```

Start the UI in a second terminal:

```bash
npm run dev:web
```

Open the dashboard:

```text
http://127.0.0.1:5173
```

At first, the dashboard shows an empty review. Findings appear when an AI agent pushes them through MCP or when you call the local API.

### Add A Finding Manually

You can test the local API with PowerShell:

```powershell
$body = @{
  title = "Example finding"
  severity = "suggestion"
  location = @{
    filePath = "README.md"
    line = 1
  }
  explanation = "This is a test finding pushed through the local API."
  suggestion = "Keep this only as a smoke test."
  relationToChange = "introduced"
  confidence = "high"
  agentName = "manual"
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:4337/api/reviews/active/findings `
  -ContentType "application/json" `
  -Body $body
```

Refresh the UI or wait a few seconds; the card should appear.

Findings can be filtered by severity in the review deck. With no severity selected, DiffDeck shows every non-archived finding. Select one or more severities to narrow the deck, and use `Archive` on a finding to hide it from the main review without deleting it from the session data.

## Configure MCP

DiffDeck includes a setup assistant for MCP.

Print the MCP configuration without changing any file:

```powershell
npm run setup:mcp:print
```

Run the interactive setup:

```powershell
npm run setup:mcp
```

Configure Codex specifically:

```powershell
npm run setup:mcp:codex
```

Run these commands from the DiffDeck repository root, not from the target project being reviewed.

If you are currently in another project, use:

```powershell
npm --prefix <DIFFDECK_ROOT> run setup:mcp:codex
```

The assistant can configure:

- Claude Desktop user config;
- Cursor project config in `.cursor/mcp.json`;
- Codex user config in `~/.codex/config.toml`;
- a custom MCP JSON config path.

It creates a backup before modifying an existing config file.

After changing MCP configuration, restart the AI tool so it reloads its MCP servers.

### Manual MCP Configuration

Before configuring MCP in an AI tool:

1. start the local API;
2. build the project so the MCP entry point exists;
3. add the MCP configuration to your AI tool, preferably through `npm run setup:mcp`.

Terminal 1, local API:

```bash
npm run dev:server
```

Terminal 2, build the MCP server:

```bash
npm run build
```

Then add a `diffdeck` MCP server to your AI tool configuration:

```json
{
  "mcpServers": {
    "diffdeck": {
      "command": "node",
      "args": [
        "<DIFFDECK_ROOT>\\packages\\mcp\\dist\\index.js"
      ],
      "env": {
        "DIFFDECK_API_URL": "http://127.0.0.1:4337/api",
        "DIFFDECK_LOG_LEVEL": "info"
      }
    }
  }
}
```

For MCP clients, prefer the built entry point so stdout is reserved for MCP protocol messages:

```bash
npm run build
node <DIFFDECK_ROOT>\packages\mcp\dist\index.js
```

For development only:

```bash
npm run dev:mcp
```

### Logging

Set `DIFFDECK_LOG_LEVEL` to control DiffDeck server and MCP logs:

- `silent`: no DiffDeck logs;
- `error`: errors only;
- `info`: startup and meaningful conversation events;
- `debug`: verbose polling and diagnostic logs.

The default is `info`. Conversation polling logs, such as repeated `pending` checks, are only emitted at `debug`.

For the local API server, set it before starting the server, for example:

```powershell
$env:DIFFDECK_LOG_LEVEL = "error"
npm run dev:server
```

Available MCP tools:

- `create_review`
- `reset_review`
- `set_review_context`
- `add_finding`
- `list_findings`
- `list_approved_findings`
- `record_usage`
- `list_conversation`
- `list_pending_conversation`
- `wait_for_conversation_message`
- `add_conversation_reply`
- `mark_ready_for_human_review`

Conversation tools:

- `list_conversation`: read the full local conversation history.
- `list_pending_conversation`: read human UI messages that do not have an agent reply yet.
- `wait_for_conversation_message`: poll DiffDeck for a pending human UI message and return when one arrives.
- `add_conversation_reply`: send the agent's answer back into the UI conversation.

Usage tools:

- `record_usage`: store token usage for the active review. Provider totals may be exact when the AI tool exposes them; otherwise mark them `unavailable` and DiffDeck will add observed local estimates from stored review payloads. DiffDeck/project/host attribution should be marked as `exact`, `estimated`, `observed`, or `unavailable`.

## Review A Branch Before A PR Or MR Exists

DiffDeck does not require a GitLab merge request, GitHub pull request, or Bitbucket review link.

An AI agent can review a local branch against a target branch before the platform review exists:

```text
Review branch feature/dose-validation against dev with DiffDeck.
Context: this implements the validation flow from ticket DOSITL-337.
```

Expected agent behavior:

- identify the source branch;
- identify the target branch;
- ask for the target branch if it is missing or ambiguous;
- ask whether ticket, acceptance criteria, or business context should be added;
- inspect the local git diff between source and target;
- create a DiffDeck review title such as `Review feature/dose-validation -> dev`;
- push structured findings with local file paths and precise line numbers.

This same workflow also works for local changes or a standalone diff file. The important part is that the review scope and target baseline are explicit.

For MR/PR and branch reviews, findings should stay scoped to files present in the reviewed diff. Agents may read files outside the diff for context, but should not publish out-of-diff findings unless the user explicitly asks for a broader audit.

## Session Handoff

The MVP stores data in memory. Before stopping the API server, use the `Session` panel in the UI to copy a `diffdeck.session.v1` resume pack. Paste that pack back into the same panel later to restore the review and let DiffDeck format it back into cards.

Use the `Session` button in the review header when you want to hand off or resume a review:

1. Click `Session`.
2. Click `Copy current` to copy the current review, context summary, findings, conversation, comments, and statuses.
3. Keep the copied `diffdeck.session.v1` text wherever you need to resume from.
4. Later, paste the text into the same panel and click `Restore`.

This is a copy/paste safety net for the in-memory MVP. It is not a secret store, so do not put tokens, passwords, API keys, or sensitive environment values in findings or context summaries.

## Ask The Agent From The UI

Use the conversation block in the main workspace to chat with the agent from DiffDeck. Each message stays local and can be attached to the active review, scoped to a specific finding, or detached when the conversation is not about the current review.

An AI tool that has the DiffDeck MCP server configured can then call `list_conversation`, answer with its own model subscription and project context, and push the reply back with `add_conversation_reply`. Replies should preserve `isReviewAttached` when they answer an attached review question. DiffDeck does not call an AI provider directly.

Agents should call `record_usage` near the end of a review so the workspace shows total usage plus DiffDeck, project, and host attribution. Treat attribution as a transparency aid, not a billing guarantee: provider totals may be exact when the AI tool exposes them, but DiffDeck fills missing local counts only from observed review payloads.

The chat is therefore a local inbox for connected agents, not an automatic hosted chatbot. To get answers:

1. Start the DiffDeck API.
2. Configure the AI tool with DiffDeck MCP, for example `npm run setup:mcp:codex`.
3. Restart the AI tool if the MCP configuration changed.
4. Ask that agent to watch the DiffDeck conversation, for example: `Start watching DiffDeck chat: call wait_for_conversation_message, answer the pending human question, then add the reply with add_conversation_reply. Repeat until I ask you to stop.`

When the agent answers, the reply is added to the same UI conversation through `add_conversation_reply`.

For a one-shot reply, ask the agent to use `list_pending_conversation` and then `add_conversation_reply`.
For a live session, ask the agent to loop on `wait_for_conversation_message`, answer the returned message, and then call `add_conversation_reply`.

## Reset A Session

Use `Reset` in the review header to explicitly clear the current analysis session. The UI asks for `RESET` before deleting findings, approvals, edited comments, and context.

AI agents can also reset the active analysis through the `reset_review` MCP tool, but only when the user explicitly asks to reset or clear the DiffDeck session.

## Share Approved Feedback

Use `Share report` in the publication queue when GitLab, GitHub, or another review platform is not available, or when you need a clean manual handoff.

DiffDeck can:

- copy the approved feedback as Markdown;
- export a `.md` file;
- export a styled standalone `.html` file;
- include precise file and line references such as `backend/src/main/java/fr/irsn/dositl/controllers/validationdosesdetail/ValidationDosesDetailControllerImpl.java:99`.

## Browser Prefill Modes

After a human approves findings in DiffDeck, an agent can use the approved queue to prefill review comments in a browser. DiffDeck's recommended mode is Playwright MCP with the Playwright Chrome Extension because it can control a user-selected Chrome/Edge/Chromium tab that is already authenticated.

Recommended priority:

1. Playwright MCP + Chrome Extension: default mode for a real authenticated browser tab.
2. Playwright MCP with persistent profile: dedicated Playwright browser that keeps login state.
3. Playwright MCP via CDP / remote debugging: advanced real-browser mode with explicit security handling.
4. Chrome DevTools MCP: diagnostic or limited fallback mode, especially for auth, console, network, and page checks.
5. Integrated or isolated browser: separate session, only if the user accepts re-authentication.
6. Manual mode: provide approved comments ready to paste.

Recommended Playwright extension MCP configuration:

```json
{
  "mcpServers": {
    "playwright-extension": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--extension"]
    }
  }
}
```

See [`docs/browser-prefill-modes.md`](docs/browser-prefill-modes.md) for installation examples, security notes, and the full decision matrix.

For GitLab, the agent should ask for the action level when it is not explicit:

- level 1: fill only the opened inline form;
- level 2: create draft review comments without publishing;
- level 3: publish or submit after explicit confirmation.

For multiple GitLab comments, level 2 is recommended because unsaved inline textareas can disappear across file navigation, scrolling, lazy loading, or collapsed files. In level 2, use `Start a review` for the first comment and `Add to review` for subsequent comments, but never `Add comment now`, `Submit review`, `Publish`, or `Merge` unless level 3 was explicitly requested.

If GitLab files or lines are collapsed or lazy-loaded, agents should use visible expand controls such as `Expand all files`, `Show file`, or equivalent per-file buttons before placing inline comments.

Chrome DevTools MCP is useful for diagnostics and constrained fallback work, but it is not DiffDeck's primary GitLab inline-comment engine. On large or virtualized GitLab diffs, accessible snapshots can become huge, target lines can be recycled, and inline buttons may appear only after hover. When using Chrome DevTools MCP, agents should avoid JavaScript injection, DOM mutation scripts, and generic `evaluate_script` calls during GitLab prefill.

## Packages

- `@diffdeck/core`: shared review types and validation schemas.
- `@diffdeck/server`: local HTTP API and in-memory review store.
- `@diffdeck/mcp`: MCP tools used by AI agents.
- `@diffdeck/cli`: command-line entry point.
- `@diffdeck/web`: React/Vite UI with SCSS and BEM.

## AI Instructions

All agent-facing instructions are centralized in `.agent/instructions`.
Root files such as `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` only point to that source of truth.

For reviewing DiffDeck changes with DiffDeck itself, agents should read `.agent/instructions/reviewing-diffdeck.md` and use `.agent/skills/diffdeck-self-review`.

## Distributed Skills For Target Projects

DiffDeck provides reusable skills that are meant to be copied into projects that want to use DiffDeck.

These are not internal DiffDeck development skills. They are distributed assets for target repositories.

```text
distributed/
  skills/
    diffdeck-code-review/
      SKILL.md
    diffdeck-browser-prefill/
      SKILL.md
    diffdeck-sync-distributed/
      SKILL.md
  snippets/
    AGENTS.md
    CLAUDE.md
    GEMINI.md
    mcp-config.example.json
```

### Available Distributed Skills

`diffdeck-code-review`

Use this when an AI agent should analyze a diff, branch, pull request, merge request, ticket, or local changes, then push structured draft findings to DiffDeck through MCP.
When ticket information or functional rules are provided, the agent should also push a concise summary with `set_review_context`; the UI exposes it in a side panel.

Typical prompts:

```text
Analyze the MR dositl-337 with DiffDeck. Target branch: dev.
Review branch feature/dose-validation against dev with DiffDeck. Context: implements ticket DOSITL-337.
```

If the target project has installed the DiffDeck skills, the user does not need to explicitly mention DiffDeck. The agent should prefer DiffDeck for code review requests, or explain that MCP is not configured and offer setup help.

`diffdeck-browser-prefill`

Use this after a DiffDeck review exists, when the user wants the AI agent to open GitLab, GitHub, Bitbucket, or another browser review UI and prefill approved comments.
The agent should read the publication queue through `list_approved_findings`, use the edited `suggestion` as the final comment body, and stop before submitting anything.

Typical prompt:

```text
Prefill the approved DiffDeck comments on this GitLab merge request, but do not publish them.
```

`diffdeck-sync-distributed`

Use this when a target project should install or update DiffDeck distributed skills from a local DiffDeck repository. The bundled sync script copies skills into `.agent/skills`, maintains a bounded DiffDeck block in the target project's agent instructions, and keeps a manifest so local skill edits are not overwritten silently. It does not copy example snippets into the target project.

Typical prompt:

```text
Sync the DiffDeck distributed skills into this project from C:\path\to\DiffDeck.
```

### Install The Skills In A Target Project

In the target project, create a `.agent/skills` folder if it does not exist.

Then copy these folders from DiffDeck:

```text
<DIFFDECK_ROOT>\distributed\skills\diffdeck-code-review
<DIFFDECK_ROOT>\distributed\skills\diffdeck-browser-prefill
<DIFFDECK_ROOT>\distributed\skills\diffdeck-sync-distributed
```

Paste them into the target project here:

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

### Add A Short Agent Entry Point In The Target Project

If the target project already has `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or a shared development instruction file, add a short note pointing to the DiffDeck skills.

For example:

```md
DiffDeck:
- For AI code review, MR/PR analysis, branch analysis, or diff analysis, use `.agent/skills/diffdeck-code-review` by default, even if the user does not explicitly mention DiffDeck.
- For browser prefill of approved comments in GitLab/GitHub, use `.agent/skills/diffdeck-browser-prefill`; retrieve the queue with `list_approved_findings` and use `suggestion` as the final human-edited comment.
- For installing or updating DiffDeck distributed skills and this project's DiffDeck instruction block, use `.agent/skills/diffdeck-sync-distributed`; run a dry-run first and do not overwrite local edits unless explicitly requested.
- For questions asked from the DiffDeck UI conversation, use `.agent/skills/diffdeck-code-review` and the MCP conversation tools. For one-shot replies, use `list_pending_conversation` then `add_conversation_reply`. For live chat, loop on `wait_for_conversation_message`, answer with the current agent's project context, then send the reply back to DiffDeck with `add_conversation_reply`.
- If DiffDeck MCP is unavailable, stop before the review, propose MCP configuration as the main next step, then mention chat-only review only as fallback.
- If MCP configuration requires restarting the AI tool, give a clear resume phrase with the source, target branch, and context, for example: "Analyze <SOURCE> with DiffDeck. Target branch: <TARGET>. Feature/fix context: <ticket, acceptance criteria, business description, or useful knowledge>."
```

The sync script writes the same guidance inside a managed block. By default it updates existing `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` files. If none exists, it creates `AGENTS.md`. To target another instruction file, pass `--instructions-file <PATH>`. To sync skills only, pass `--skip-instructions`.

The files in this folder are examples only and are not copied by the sync script:

```text
<DIFFDECK_ROOT>\distributed\snippets\
```

Keep these files short. Project-specific rules should stay in the target project. DiffDeck skills only teach the AI how to use DiffDeck.

### Sync Distributed Updates Later

After the first manual copy, use `diffdeck-sync-distributed` from the target project to refresh DiffDeck distributed skills and the managed instruction block.

Dry-run:

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --dry-run
```

Apply non-conflicting updates:

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT>
```

The script writes `.agent/diffdeck/sync-manifest.json` and skips files changed locally since the previous sync. Use `--force` only when overwriting local edits is intentional.

If the target project stores shared instructions somewhere else, choose the file explicitly:

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --instructions-file .agent/instructions/00-index.md
```

## Expected User Flow In A Target Project

1. Start DiffDeck API and UI.
2. Open the target project in an AI tool that has the DiffDeck MCP server configured.
3. Ask the AI to prepare a DiffDeck review for a MR/PR, branch, diff, or local changes.
4. The AI reads the target project instructions and analyzes the requested scope against the target branch or baseline.
5. The AI pushes structured findings to DiffDeck.
6. The human edits final comments, filters by severity, toggles findings as approved, rejected, resolved, or archived, and uses approved findings as the publication queue.
7. Optionally, ask the AI to prefill approved comments in GitLab/GitHub using `diffdeck-browser-prefill`.

## Stop The App

If you run the commands in terminals, stop them with `Ctrl+C`.
