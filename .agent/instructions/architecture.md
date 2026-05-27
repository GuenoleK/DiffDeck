# Architecture

DiffDeck is a TypeScript monorepo.

```text
packages/
  core/    shared types, schemas, constants
  server/  local HTTP API and in-memory review store
  mcp/     MCP tools for AI agents
  cli/     local command-line entry point
  web/     React/Vite dashboard
```

## MVP Runtime

```text
AI agent -> DiffDeck MCP -> local server memory store -> web UI
                                     |
                                     +-> export JSON/Markdown later

Browser MCP / Playwright -> opens MR and pre-fills approved comments later
```

## Storage Policy

The MVP uses an in-memory store. Do not add SQLite, PostgreSQL, or another database until persistence is a confirmed product need.

Allowed early persistence:

- manual JSON export;
- manual JSON import;
- optional `.diffdeck` folder later.

## API Policy

The local API should expose simple review operations:

- create or get active review;
- add finding;
- update finding;
- delete finding;
- list findings.

Keep API contracts in `@diffdeck/core`.
