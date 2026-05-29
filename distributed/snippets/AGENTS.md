# Project Agent Instructions

This project can use DiffDeck for AI-assisted code review.

If the user asks to analyze or review a MR, PR, branch, diff, ticket, or local changes, prefer the installed `diffdeck-code-review` skill even if the user does not explicitly mention DiffDeck. If DiffDeck MCP is unavailable, stop before analyzing, propose MCP setup as the primary next step, mention chat-only review only as a fallback, and provide a clear resume phrase if the AI tool must be restarted.

If the user asks to prefill approved DiffDeck comments in GitLab, GitHub, Bitbucket, or another browser review UI, use the installed `diffdeck-browser-prefill` skill.

If the user asks to install, update, refresh, or synchronize DiffDeck distributed skills or agent snippets in this project, use the installed `diffdeck-sync-distributed` skill. Run a dry-run first and do not overwrite local edits unless explicitly requested.

If the user asks to answer, watch, or continue a DiffDeck UI conversation, use the installed `diffdeck-code-review` skill and the DiffDeck MCP conversation tools. For one-shot replies, use `list_pending_conversation` then `add_conversation_reply`. For live chat, loop on `wait_for_conversation_message`, answer with the current agent's project context, then send the reply back to DiffDeck with `add_conversation_reply`.

If DiffDeck MCP is not configured, help the user run the DiffDeck setup assistant from the DiffDeck repository:

```bash
npm run setup:mcp
```

Before reviewing code, always read this project's own instructions and conventions.
