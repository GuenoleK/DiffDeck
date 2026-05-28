# DiffDeck Instructions Index

Read these files before changing the application:

1. `product-vision.md`
2. `architecture.md`
3. `coding-standards.md`
4. `frontend.md`
5. `mcp-workflow.md`

For reviewing a DiffDeck PR/MR/branch/diff with DiffDeck, also read:

- `reviewing-diffdeck.md`

## Non-Negotiables

- DiffDeck is agent-agnostic: Codex, Claude, Gemini, and other tools should be able to use it.
- The AI prepares review findings; the human edits, approves, rejects, exports, or publishes.
- The MVP uses in-memory state, not a database.
- Keep the app local-first and offline-friendly.
- Use React, TypeScript, Vite, SCSS, and BEM.
- Do not introduce Tailwind.
- Prefer small, focused components and helpers over large files.
- Keep durable instructions here instead of duplicating them in agent-specific files.
- Do not publish personal local paths, secrets, tokens, private URLs, or sensitive environment values in docs, snippets, or examples.
