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
        "DIFFDECK_API_URL": "http://127.0.0.1:4337/api"
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

Available MCP tools:

- `create_review`
- `reset_review`
- `set_review_context`
- `add_finding`
- `list_findings`
- `list_approved_findings`
- `mark_ready_for_human_review`

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

## Session Handoff

The MVP stores data in memory. Before stopping the API server, use the `Session` panel in the UI to copy a `diffdeck.session.v1` resume pack. Paste that pack back into the same panel later to restore the review and let DiffDeck format it back into cards.

Use the `Session` button in the review header when you want to hand off or resume a review:

1. Click `Session`.
2. Click `Copy current` to copy the current review, context summary, findings, comments, and statuses.
3. Keep the copied `diffdeck.session.v1` text wherever you need to resume from.
4. Later, paste the text into the same panel and click `Restore`.

This is a copy/paste safety net for the in-memory MVP. It is not a secret store, so do not put tokens, passwords, API keys, or sensitive environment values in findings or context summaries.

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

After a human approves findings in DiffDeck, an agent can use the approved queue to prefill review comments in a browser.

Supported modes:

- A - True session mode: pilot the user's default Chrome/Edge browser through Chrome DevTools MCP (`--autoConnect` preferred, `--browser-url` for a manually debuggable browser) or a browser-extension MCP.
- B - Fallback mode: use the AI tool's integrated browser with a separate session, only if the user accepts it.
- C - Manual mode: provide approved comments ready to paste.

For mode A with Chrome DevTools MCP, use Chrome 144 or newer, open `chrome://inspect/#remote-debugging`, enable remote debugging, accept the DevTools MCP access prompt, then retry with `--autoConnect`.

For GitLab, the agent should ask for the action level when it is not explicit:

- level 1: fill only the opened inline form;
- level 2: create draft review comments without publishing;
- level 3: publish or submit after explicit confirmation.

For multiple GitLab comments, level 2 is recommended because unsaved inline textareas can disappear across file navigation, scrolling, lazy loading, or collapsed files. In level 2, use `Start a review` for the first comment and `Add to review` for subsequent comments, but never `Add comment now`, `Submit review`, `Publish`, or `Merge` unless level 3 was explicitly requested.

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

### Install The Skills In A Target Project

In the target project, create a `.agent/skills` folder if it does not exist.

Then copy these two folders from DiffDeck:

```text
<DIFFDECK_ROOT>\distributed\skills\diffdeck-code-review
<DIFFDECK_ROOT>\distributed\skills\diffdeck-browser-prefill
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
```

### Add A Short Agent Entry Point In The Target Project

If the target project already has `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or a shared development instruction file, add a short note pointing to the DiffDeck skills.

For example:

```md
DiffDeck:
- For AI code review, MR/PR analysis, branch analysis, or diff analysis, use `.agent/skills/diffdeck-code-review` by default, even if the user does not explicitly mention DiffDeck.
- For browser prefill of approved comments in GitLab/GitHub, use `.agent/skills/diffdeck-browser-prefill`; retrieve the queue with `list_approved_findings` and use `suggestion` as the final human-edited comment.
- If DiffDeck MCP is unavailable, stop before the review, propose MCP configuration as the main next step, then mention chat-only review only as fallback.
- If MCP configuration requires restarting the AI tool, give a clear resume phrase with the source, target branch, and context, for example: "Analyze <SOURCE> with DiffDeck. Target branch: <TARGET>. Feature/fix context: <ticket, acceptance criteria, business description, or useful knowledge>."
```

If the project does not have agent entry files yet, use the examples in:

```text
<DIFFDECK_ROOT>\distributed\snippets\
```

Keep these files short. Project-specific rules should stay in the target project. DiffDeck skills only teach the AI how to use DiffDeck.

## Expected User Flow In A Target Project

1. Start DiffDeck API and UI.
2. Open the target project in an AI tool that has the DiffDeck MCP server configured.
3. Ask the AI to prepare a DiffDeck review for a MR/PR, branch, diff, or local changes.
4. The AI reads the target project instructions and analyzes the requested scope against the target branch or baseline.
5. The AI pushes structured findings to DiffDeck.
6. The human edits final comments, toggles findings as approved, rejected, or resolved, and uses approved findings as the publication queue.
7. Optionally, ask the AI to prefill approved comments in GitLab/GitHub using `diffdeck-browser-prefill`.

## Stop The App

If you run the commands in terminals, stop them with `Ctrl+C`.
