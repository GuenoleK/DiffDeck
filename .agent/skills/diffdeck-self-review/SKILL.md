---
name: diffdeck-self-review
description: Use this skill when an AI agent reviews a DiffDeck pull request, merge request, branch, diff, or local changes and should prepare the review in DiffDeck itself rather than only writing chat Markdown.
---

# DiffDeck Self Review

## Before Starting

Read:

- `.agent/instructions/00-index.md`
- `.agent/instructions/reviewing-diffdeck.md`

## Goal

Review DiffDeck changes with the same human-in-the-loop workflow that DiffDeck provides to target projects.

## Workflow

1. Identify source and target branch or diff scope.
2. If no PR/MR exists yet, treat the task as a branch-to-branch review and compare the source branch against the explicit target branch.
3. Ask for ticket/product context if it is not already provided.
4. Use DiffDeck MCP when available.
5. Set a concise review context via `set_review_context` when context exists.
6. Push one structured finding per actionable review comment.
7. Use exact file and line locations.
8. Mark the review ready for human review.
9. Summarize key risks, verification performed, and remaining uncertainty in chat.

If DiffDeck MCP is unavailable, stop before the full review and explain that this repository is configured to review DiffDeck changes in DiffDeck. Offer MCP setup/restart first, then chat-only review as fallback.

## DiffDeck-Specific Checklist

Prioritize:

- accidental publication or unsafe browser automation behavior;
- ambiguous GitLab/GitHub action levels;
- MCP tool contract changes;
- session reset/export/import safety;
- UI layout shift or confusing destructive controls;
- public docs leaking personal paths, private URLs, tokens, or sensitive values;
- final report quality, including line breaks and `file:line` references;
- consistency with React, TypeScript, Vite, SCSS, and BEM structure.

## Reset Rule

Use `reset_review` only if the user explicitly asks to reset or restart the active DiffDeck review session. Do not reset automatically before reviewing.
