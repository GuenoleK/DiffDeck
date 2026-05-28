#!/usr/bin/env node
import { startServer } from "@diffdeck/server";
import { setupMcp } from "./setup-mcp.js";

const [command = "help", ...args] = process.argv.slice(2);

if (command === "start") {
  startServer();
} else if (command === "setup-mcp") {
  await setupMcp(args);
} else if (command === "help" || command === "--help" || command === "-h") {
  console.log(`
DiffDeck CLI

Commands:
  diffdeck start                 Start the local DiffDeck API server
  diffdeck setup-mcp --print     Print MCP configuration for DiffDeck
  diffdeck setup-mcp             Interactively add DiffDeck to an MCP config
  diffdeck help                  Show this message

Setup options:
  --target claude-desktop        Write Claude Desktop MCP config
  --target cursor-project        Write .cursor/mcp.json in the current folder
  --target codex                 Write Codex MCP config in ~/.codex/config.toml
  --config <path>                Write a custom MCP JSON config file
  --yes                          Skip confirmation prompts
`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
