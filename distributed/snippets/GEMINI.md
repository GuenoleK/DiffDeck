# Gemini Instructions

This project can use DiffDeck for AI-assisted code review.

Use the installed `diffdeck-code-review` skill when the user asks Gemini to analyze or review a MR, PR, branch, diff, ticket, or local changes. The user does not need to explicitly mention DiffDeck.

Use the installed `diffdeck-browser-prefill` skill only when the user explicitly asks Gemini to prefill comments in a browser review UI.

If DiffDeck MCP is not configured, help the user run `npm run setup:mcp` from the DiffDeck repository before doing the review. If Gemini must be restarted, give the user a clear phrase to resume the same review afterward.

DiffDeck findings are drafts. The human user decides what gets published.
