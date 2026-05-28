# Reviewing DiffDeck With DiffDeck

Use this file when an AI agent reviews a DiffDeck pull request, merge request, branch, diff, or local changes.

This is intentionally separate from development instructions. Development instructions explain how to change DiffDeck. This file explains how to review DiffDeck changes using DiffDeck itself.

DiffDeck reviews do not require a platform PR/MR. A source branch can be reviewed against an explicit target branch before the PR/MR exists.

## Default Review Flow

For any DiffDeck review request:

1. Read `.agent/instructions/00-index.md`.
2. Read this file.
3. Prefer the internal skill `.agent/skills/diffdeck-self-review`.
4. Use DiffDeck MCP when available:
   - create or reset the active review only when the user asks;
   - set review context when ticket or product intent is available;
   - push structured findings;
   - mark the review ready for human review.
5. End with a concise chat summary of the biggest risks and any verification gaps.

When no PR/MR exists yet, identify the source branch and target branch, then review the local git diff between them. If the target branch is missing or ambiguous, ask for it before analyzing.

If DiffDeck MCP is not available, stop before doing the full review and explain how to configure or restart MCP. Continue with chat-only review only if the user explicitly accepts that fallback.

## Review Priorities

Focus on risks specific to DiffDeck:

- Human-in-the-loop safety: no accidental publishing, submitting, merging, or destructive browser actions.
- Platform agnosticism: avoid GitLab-only coupling in core flows.
- MCP contract safety: tools should be explicit, stable, and safe to call from different agents.
- Browser automation UX: distinguish true session mode, fallback mode, and manual mode.
- Session resilience: preserve or export in-memory state when needed.
- Public distribution safety: no personal paths, private URLs, secrets, API keys, tokens, or machine-specific values in docs/snippets.
- UI ergonomics: no layout shift, no hidden destructive action, clear copy/export/reset affordances.
- Export quality: final shared reports should keep line breaks and precise `file:line` references.

## Finding Rules

Only report issues introduced or worsened by the reviewed change unless the user asks for a broader audit.

Each finding should include:

- severity: `critical`, `important`, `suggestion`, `question`, or `praise`;
- precise file path and line when possible;
- a short snippet when useful;
- why the issue matters for DiffDeck;
- a final review comment suitable for the human to edit in the UI.

Use precise references such as:

```text
packages/web/src/features/review-workspace/components/ReviewSharePanel/ReviewSharePanel.tsx:42
```

## Verification Expectations

When relevant, check:

- `npm run typecheck`;
- `npm run build`;
- skill validation for changed skills;
- targeted local API checks for new endpoints;
- docs scans for personal paths or sensitive values.

If a verification step cannot be run, say so in the chat summary and in the DiffDeck finding if it creates review risk.
