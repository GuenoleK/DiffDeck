#!/usr/bin/env node
import { startServer } from "@diffdeck/server";

const command = process.argv[2] ?? "help";

if (command === "start") {
  startServer();
} else if (command === "help" || command === "--help" || command === "-h") {
  console.log(`
DiffDeck CLI

Commands:
  diffdeck start    Start the local DiffDeck API server
  diffdeck help     Show this message
`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
