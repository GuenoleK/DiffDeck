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
cd C:\Users\gkikabou\dev\perso\DiffDeck
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
3. ajouter la configuration MCP dans ton outil IA.

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
C:\Users\gkikabou\dev\perso\DiffDeck\packages\mcp\dist\index.js
```

The MCP server lets an AI agent add structured findings to the active review.

For development:

```bash
npm run dev:mcp
```

For MCP clients, prefer the built entry point so stdout is reserved for MCP protocol messages:

```bash
npm run build
node C:\Users\gkikabou\dev\perso\DiffDeck\packages\mcp\dist\index.js
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
        "C:\\Users\\gkikabou\\dev\\perso\\DiffDeck\\packages\\mcp\\dist\\index.js"
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
- `add_finding`
- `list_findings`
- `mark_ready_for_human_review`

### Stop The App

If you run the commands in terminals, stop them with `Ctrl+C`.

The MVP stores data in memory. If you stop the API server, the active review is lost. JSON export/import will be added before persistent storage.

## Packages

- `@diffdeck/core`: shared review types and validation schemas.
- `@diffdeck/server`: local HTTP API and in-memory review store.
- `@diffdeck/mcp`: MCP tools used by AI agents.
- `@diffdeck/cli`: command-line entry point.
- `@diffdeck/web`: React/Vite UI with SCSS and BEM.

## AI Instructions

All agent-facing instructions are centralized in `.agent/instructions`.
Root files such as `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` only point to that source of truth.
