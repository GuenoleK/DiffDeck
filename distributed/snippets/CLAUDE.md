# Claude Instructions

This project can use DiffDeck for AI-assisted code review.

Use the installed `diffdeck-code-review` skill when the user asks Claude to analyze or review a MR, PR, branch, diff, ticket, or local changes. The user does not need to explicitly mention DiffDeck.

Use the installed `diffdeck-browser-prefill` skill only when the user explicitly asks Claude to prefill comments in a browser review UI.

Use the installed `diffdeck-sync-distributed` skill when the user asks Claude to install, update, refresh, or synchronize DiffDeck distributed skills or agent snippets in this project. Run a dry-run first and do not overwrite local edits unless explicitly requested.

If the user asks Claude to answer, watch, or continue a DiffDeck UI conversation, use the installed `diffdeck-code-review` skill and the DiffDeck MCP conversation tools. For one-shot replies, use `list_pending_conversation` then `add_conversation_reply`. For live chat, loop on `wait_for_conversation_message`, answer with Claude's project context, then send the reply back to DiffDeck with `add_conversation_reply`.

If DiffDeck MCP is not configured, help the user run `npm run setup:mcp` from the DiffDeck repository before doing the review. If Claude must be restarted, give the user a clear phrase to resume the same review afterward.

DiffDeck findings are drafts. The human user decides what gets published.
