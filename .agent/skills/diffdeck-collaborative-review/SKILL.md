---
name: diffdeck-collaborative-review
description: Use this skill when an AI agent must prepare a collaborative code review in DiffDeck by analyzing a diff, branch, pull request, or merge request, then pushing structured draft findings to the local DiffDeck MCP dashboard for human review.
---

# DiffDeck Collaborative Review

## Before Starting

Read `.agent/instructions/00-index.md`.

## Goal

Act as a careful code-review partner. Analyze the provided diff, branch, ticket, or merge request context, then create structured draft findings in DiffDeck. The human user keeps final control.

## Workflow

1. Gather context from the user request, ticket, diff, and changed files.
2. Distinguish findings introduced by the change from preexisting issues.
3. Classify each finding with one severity: `critical`, `important`, `suggestion`, `question`, or `praise`.
4. Push findings to DiffDeck through MCP instead of only writing Markdown in chat.
5. Use precise file and line locations whenever available.
6. Mark the review ready for human review.
7. End with a concise chat summary of the most important risks and open questions.

## Finding Quality

Each finding should include:

- a short title;
- severity;
- file path and line;
- exact code snippet when possible;
- technical explanation;
- suggested review comment;
- relation to the change when known: `introduced`, `new_surface`, `worsened`, or `preexisting_context`.

## Human Control

Never publish comments to GitLab, GitHub, Bitbucket, or another platform without explicit user approval. Preparing or pre-filling draft comments is allowed when the user asks for it.

## Conversation Follow-Up

When the user asks to answer or continue a DiffDeck UI conversation, use MCP conversation tools instead of answering only in chat:

- Use `list_pending_conversation` for one-shot unanswered UI questions.
- Use `wait_for_conversation_message` when the user asks to watch the UI chat.
- Reply with `add_conversation_reply`, preserving review attachment and setting `relatedMessageId` when answering a specific human message.
