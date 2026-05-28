# DiffDeck

DiffDeck is a local, agent-friendly code review dashboard.

The first MVP is intentionally small:

- a local web UI for human review;
- a local API server with in-memory state;
- a MCP server so AI agents can push structured findings;
- a CLI entry point for local usage;
- no database at first;
- JSON export/import later for lightweight persistence.

## Demarrage rapide

Pour utiliser DiffDeck aujourd'hui, tu n'as pas besoin de configurer MCP tout de suite.

Ouvre un terminal dans le dossier du projet :

```bash
cd <DIFFDECK_ROOT>
```

Installe les dependances :

```bash
npm install
```

Lance le serveur local dans ce terminal :

```bash
npm run dev:server
```

Ouvre un deuxieme terminal dans le meme dossier, puis lance l'interface web :

```bash
npm run dev:web
```

Ouvre ensuite :

```text
http://127.0.0.1:5173
```

Tu verras le tableau de bord DiffDeck. Au debut il est vide, c'est normal.

L'API locale tourne sur `http://127.0.0.1:4337`.

## How To Use The MVP

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

### Configure MCP With The Setup Assistant

DiffDeck includes a setup assistant for MCP.

If you only want to see the MCP config without changing any file:

```powershell
npm run setup:mcp:print
```

If you want an interactive setup:

```powershell
npm run setup:mcp
```

The assistant can configure:

- Claude Desktop user config;
- Cursor project config in `.cursor/mcp.json`;
- Codex user config in `~/.codex/config.toml`;
- a custom MCP JSON config path.

It creates a backup before modifying an existing config file.

You can also call the CLI directly after a build:

```powershell
npm run build
node packages\cli\dist\index.js setup-mcp --print
node packages\cli\dist\index.js setup-mcp --target claude-desktop
node packages\cli\dist\index.js setup-mcp --target cursor-project
node packages\cli\dist\index.js setup-mcp --target codex
node packages\cli\dist\index.js setup-mcp --config C:\path\to\mcp.json
```

Use `--yes` to skip the confirmation prompt:

```powershell
node packages\cli\dist\index.js setup-mcp --target cursor-project --yes
```

For Codex specifically:

```powershell
npm run setup:mcp:codex
```

Run this from the DiffDeck repository root, not from the target project being reviewed.

If you are currently in another project, use:

```powershell
npm --prefix <DIFFDECK_ROOT> run setup:mcp:codex
```

After changing MCP configuration, restart the AI tool so it reloads its MCP servers.

### Use DiffDeck Through MCP

MCP est optionnel au debut.

Concretement :

- sans MCP, tu peux lancer l'app et tester l'interface ;
- avec MCP, un agent IA peut ajouter automatiquement des findings dans DiffDeck.

Tu ne lances pas `node ...packages\mcp\dist\index.js` toi-meme dans un terminal classique pour t'en servir directement. Cette commande est surtout donnee a l'outil IA compatible MCP, par exemple Claude Desktop, Claude Code, Cursor, ou un autre client MCP.

Le role de MCP est donc :

```text
IA compatible MCP -> serveur MCP DiffDeck -> API locale DiffDeck -> interface web
```

Avant de configurer MCP dans un outil IA, il faut :

1. lancer l'API locale ;
2. builder le projet pour generer le fichier MCP executable ;
3. ajouter la configuration MCP dans ton outil IA, idealement via `npm run setup:mcp`.

Terminal 1, API locale :

```bash
npm run dev:server
```

Terminal 2, generation du serveur MCP compile :

```bash
npm run build
```

Ensuite, dans la configuration MCP de ton outil IA, ajoute un serveur `diffdeck` qui pointe vers :

```text
<DIFFDECK_ROOT>\packages\mcp\dist\index.js
```

The MCP server lets an AI agent add structured findings to the active review.

For development only:

```bash
npm run dev:mcp
```

For MCP clients, prefer the built entry point so stdout is reserved for MCP protocol messages:

```bash
npm run build
node <DIFFDECK_ROOT>\packages\mcp\dist\index.js
```

The local API must be running before the MCP server can add findings:

```bash
npm run dev:server
```

Example MCP server configuration:

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

Available MCP tools:

- `create_review`
- `reset_review`
- `set_review_context`
- `add_finding`
- `list_findings`
- `list_approved_findings`
- `mark_ready_for_human_review`

### Stop The App

If you run the commands in terminals, stop them with `Ctrl+C`.

The MVP stores data in memory. Before stopping the API server, use the `Session` panel in the UI to copy a `diffdeck.session.v1` resume pack. Paste that pack back into the same panel later to restore the review and let DiffDeck format it back into cards.

### Resume A Session

Use the `Session` button in the review header when you want to hand off or resume a review:

1. Click `Session`.
2. Click `Copy current` to copy the current review, context summary, findings, comments, and statuses.
3. Keep the copied `diffdeck.session.v1` text wherever you need to resume from.
4. Later, paste the text into the same panel and click `Restore`.

This is a copy/paste safety net for the in-memory MVP. It is not a secret store, so do not put tokens, passwords, API keys, or sensitive environment values in findings or context summaries.

### Reset A Session

Use `Reset` in the review header to explicitly clear the current analysis session. The UI asks for `RESET` before deleting findings, approvals, edited comments, and context.

AI agents can also reset the active analysis through the `reset_review` MCP tool, but only when the user explicitly asks to reset or clear the DiffDeck session.

### Share Approved Feedback

Use `Share report` in the publication queue when GitLab is not available or when you need a clean manual handoff.

DiffDeck can:

- copy the approved feedback as Markdown;
- export a `.md` file;
- export a styled standalone `.html` file;
- include precise file and line references such as `backend/src/main/java/fr/irsn/dositl/controllers/validationdosesdetail/ValidationDosesDetailControllerImpl.java:99`.

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

## Skills To Install In Target Projects

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

Typical prompt:

```text
Analyse la MR dositl-337.
```

If the target project has installed the DiffDeck skills, the user does not need to explicitly mention DiffDeck. The agent should prefer DiffDeck for code review requests, or explain that MCP is not configured and offer setup help.

`diffdeck-browser-prefill`

Use this after a DiffDeck review exists, when the user wants the AI agent to open GitLab, GitHub, Bitbucket, or another browser review UI and prefill approved comments.
The agent should read the publication queue through `list_approved_findings`, use the edited `suggestion` as the final comment body, and stop before submitting anything.

Supported publication modes:

- A - True session mode: pilot the user's default Chrome/Edge browser through Chrome DevTools MCP (`--autoConnect` preferred, `--browser-url` for a manually debuggable browser) or a browser-extension MCP.
- B - Fallback mode: use the AI tool's integrated browser with a separate session, only if the user accepts it.
- C - Manual mode: provide approved comments ready to paste.

If the user asks for prefill without specifying a mode, the agent should ask for A/B/C before opening or controlling a browser.
For mode A with Chrome DevTools MCP, guide the user to use Chrome 144+, open `chrome://inspect/#remote-debugging`, enable remote debugging, accept the DevTools MCP access prompt, then retry with `--autoConnect`.
For GitLab, the agent should also ask for the action level when it is not explicit: 1 = fill only the opened inline form, 2 = create draft review comments without publishing, 3 = publish/submit after explicit confirmation. For multiple comments, level 2 is recommended because unsaved inline textareas can disappear across file navigation, scrolling, lazy loading, or collapsed/unloaded files. In level 2, use `Start a review` for the first comment and `Add to review` for subsequent comments, but never `Add comment now`, `Submit review`, `Publish`, or `Merge` unless level 3 was explicitly requested.

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
- Pour une revue IA, une analyse de MR/PR, branche ou diff, utiliser le skill `.agent/skills/diffdeck-code-review` par defaut, meme si l'utilisateur ne mentionne pas explicitement DiffDeck.
- Pour preremplir des commentaires approuves dans GitLab/GitHub via navigateur, utiliser le skill `.agent/skills/diffdeck-browser-prefill`; l'agent doit recuperer la queue via `list_approved_findings` et utiliser le champ `suggestion` comme commentaire final edite par l'humain.
- Si DiffDeck MCP n'est pas disponible, s'arreter avant l'analyse, proposer la configuration MCP comme prochaine etape principale, puis mentionner la revue chat seulement en fallback.
- Si la configuration MCP impose de redemarrer l'outil IA, donner une phrase de reprise claire a completer avec la branche cible et le contexte, par exemple : "Analyse la MR <SOURCE> avec DiffDeck. Branche cible de la MR: <TARGET>. Contexte feature/corrections: <ticket, criteres d'acceptation, description metier ou connaissances utiles>."
```

If the project does not have agent entry files yet, you can use the examples in:

```text
<DIFFDECK_ROOT>\distributed\snippets\
```

Keep these files short. Project-specific rules should stay in the target project. DiffDeck skills only teach the AI how to use DiffDeck.

### Configure MCP In The AI Tool

The target project needs the AI tool to know about the DiffDeck MCP server.

The easiest way is to use the setup assistant from the DiffDeck repository:

```powershell
cd <DIFFDECK_ROOT>
npm run setup:mcp
```

To only print the config:

```powershell
cd <DIFFDECK_ROOT>
npm run setup:mcp:print
```

You can still configure the AI tool manually with the example from:

```text
<DIFFDECK_ROOT>\distributed\snippets\mcp-config.example.json
```

The important part is:

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

The DiffDeck API must be running when the agent uses MCP:

```powershell
cd <DIFFDECK_ROOT>
npm run dev:server
```

The DiffDeck UI should also be running if you want to see findings appear live:

```powershell
cd <DIFFDECK_ROOT>
npm run dev:web
```

Open:

```text
http://127.0.0.1:5173
```

### Expected User Flow In A Target Project

1. Start DiffDeck API and UI.
2. Open the target project in an AI tool that has the DiffDeck MCP server configured.
3. Ask the AI to prepare a DiffDeck review.
4. The AI reads the target project instructions and analyzes the diff.
5. The AI pushes structured findings to DiffDeck.
6. The human edits final comments, toggles findings as approved, rejected, or resolved, and uses approved findings as the publication queue.
7. Optionally, ask the AI to prefill approved comments in GitLab/GitHub using `diffdeck-browser-prefill`.
