# Project Agent Instructions

This project can use DiffDeck for AI-assisted code review.

If the user asks to analyze or review a MR, PR, branch, diff, ticket, or local changes, prefer the installed `diffdeck-code-review` skill even if the user does not explicitly mention DiffDeck. If DiffDeck MCP is unavailable, stop before analyzing, propose MCP setup as the primary next step, mention chat-only review only as a fallback, and provide a clear resume phrase if the AI tool must be restarted.

If the user asks to prefill approved DiffDeck comments in GitLab, GitHub, Bitbucket, or another browser review UI, use the installed `diffdeck-browser-prefill` skill.

If DiffDeck MCP is not configured, help the user run the DiffDeck setup assistant from the DiffDeck repository:

```bash
npm run setup:mcp
```

Before reviewing code, always read this project's own instructions and conventions.
