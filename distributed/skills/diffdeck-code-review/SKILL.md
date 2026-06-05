---
name: diffdeck-code-review
description: Use this skill when the user asks an AI agent to analyze or review a diff, branch, pull request, merge request, ticket, or local changes in a project that has installed DiffDeck skills. The user does not need to explicitly say "with DiffDeck"; if the project instructions mention DiffDeck, prefer preparing the review in DiffDeck or ask whether to do so when MCP is unavailable.
---

# DiffDeck Code Review

## Purpose

Prepare an AI-assisted code review in DiffDeck.

DiffDeck is a human-in-the-loop dashboard. The AI agent prepares draft findings. The human user edits, approves, rejects, exports, or publishes them.

## Trigger Behavior

When this skill is installed in a target project, treat common review requests as DiffDeck review requests, even if the user does not explicitly mention DiffDeck.

Examples:

- "analyze MR dositl-337"
- "review this PR"
- "can you review this branch?"
- "analyze the diff"
- "prepare a review for these changes"

If DiffDeck MCP is configured and available, use it.

If DiffDeck MCP is not available, pause before doing the full review. Tell the user clearly that the project is configured for DiffDeck but the current AI tool cannot see the DiffDeck MCP tools. Offer to help configure/start DiffDeck first, and only continue with a chat-only review if the user explicitly chooses that fallback.

## Preconditions

Before using this skill:

1. The DiffDeck local API should be running.
2. The DiffDeck MCP server should be configured in the current AI tool.
3. The target project should expose its own local instructions when available.

Before starting the review, check what you can:

- If MCP tools are visible, use them.
- If shell or HTTP access is available, check whether the local API is running at `http://127.0.0.1:4337/api/health`.
- If MCP tools are not visible, explain that the AI tool is not connected to DiffDeck MCP yet.
- If the API is not running, explain that DiffDeck must be started with `npm run dev:server` and `npm run dev:web` from the DiffDeck repository.

If DiffDeck MCP tools are unavailable, explain that DiffDeck is not connected and help the user configure it.

Recommended setup from the DiffDeck repository:

```bash
npm run setup:mcp:print
```

For interactive setup:

```bash
npm run setup:mcp
```

For Codex specifically:

```bash
npm run setup:mcp:codex
```

These `npm run setup:*` commands must be run from the DiffDeck repository root, not from the target project being reviewed.

If the user is currently in the target project, tell them to either:

```bash
cd <DIFFDECK_ROOT>
npm run setup:mcp:codex
```

or run from anywhere:

```bash
npm --prefix <DIFFDECK_ROOT> run setup:mcp:codex
```

An AI agent may run the print command to show the configuration. It may run the interactive or write command only when the user explicitly asks for MCP configuration and the command is appropriate for the current environment.

After MCP configuration changes, tell the user to restart the AI tool so it reloads MCP servers.

DiffDeck server and MCP logs can be tuned with `DIFFDECK_LOG_LEVEL`: `silent`, `error`, `info`, or `debug`. The default is `info`; repeated conversation polling logs only appear in `debug`.

Do not pretend that findings were pushed if MCP is unavailable.

## Missing MCP Behavior

When the user asks for a review and DiffDeck MCP is not available, do this before analyzing the MR/PR/branch/diff:

1. Explain that this project is configured to use DiffDeck for AI-assisted reviews.
2. Explain that the current AI session cannot see the DiffDeck MCP tools, so findings cannot be pushed to the dashboard yet.
3. Propose MCP setup as the primary next step, not as an afterthought:
   - `npm run setup:mcp:print` to display the config;
   - `npm run setup:mcp` for guided setup;
   - `npm run setup:mcp:codex` for Codex.
4. Explain that after MCP setup the AI tool usually needs to be restarted.
5. Give the exact phrase the user can send after restart to resume the same task.
6. Ask whether the user wants you to help configure/start DiffDeck now.
7. Mention chat-only review only as a secondary fallback, after the setup option.

Mandatory response shape:

```text
This project is configured to use DiffDeck for AI-assisted reviews, but this session cannot see the DiffDeck MCP tools. I cannot push findings to the dashboard yet.

I can help configure DiffDeck now. For Codex, run this from the DiffDeck repository:
`cd <DIFFDECK_ROOT>` then `npm run setup:mcp:codex`

If you are currently in the project to review, you can also run:
`npm --prefix <DIFFDECK_ROOT> run setup:mcp:codex`

After configuration, restart Codex so it reloads MCP tools, then resume with:
"Analyze <SOURCE> with DiffDeck. Target branch: <TARGET>. Feature/fix context: <ticket, acceptance criteria, business description, or useful knowledge>."

Do you want to configure MCP now? If you prefer, I can also continue with a chat-only review, but findings will not be sent to DiffDeck.
```

Fill `<TARGET>` and the context when they are already known. If they are not known, leave explicit placeholders for the user to complete before restarting, instead of asking the future agent to ask again.

If the target branch is not known yet, use:

```text
"Analyze <SOURCE> with DiffDeck. Target branch: <TARGET_BRANCH_TO_FILL>. Feature/fix context: <CONTEXT_TO_FILL>."
```

If the DiffDeck repository path is unknown, ask for it before giving commands that require `cd`.

Do not ask the user to run `npm run setup:mcp:codex` from the target project unless that project is the DiffDeck repository.

If the current tool is Codex and shell access is available, the agent may offer:

```text
I can run the Codex setup from the DiffDeck repository if you confirm its location, then you will restart Codex.
```

## Workflow

1. Read the user request carefully.
2. Read project instructions first:
   - `AGENTS.md`
   - `CLAUDE.md`
   - `GEMINI.md`
   - `.agent/instructions/**`
   - `.github/instructions/**`
   - any repository-specific review rules
3. Identify the source under review: MR/PR URL, source branch, diff file, or local changes.
4. Identify the target branch:
   - If a MR/PR URL is provided and the target can be read, tell the user which target branch was detected.
   - If only a source branch is provided and the target cannot be inferred safely, ask the user for the target branch before analyzing.
   - If no MR/PR exists yet, review the local source branch against the explicit target branch.
   - If a project convention or explicit user context gives a target branch, state it before analyzing.
5. Ask whether the user wants to provide ticket or business context before the review. If they provide it, use it and prepare a short functional summary for DiffDeck. If they decline or ask to proceed, continue without it and mention that the review is code-context-only.
6. Inspect the diff, branch, pull request, merge request, or local changes.
7. Read surrounding files only when needed to confirm a concrete risk.
8. Do not run builds, compilation, or tests automatically during the review. Propose relevant verification commands in the final summary. Run them only when the user explicitly asks, or when a compilation/runtime doubt is central to confirming a finding; in that case, say what you are going to run and why before running it.
9. Create or reuse a DiffDeck review.
10. If ticket information, acceptance criteria, business rules, or functional context were provided, call `set_review_context` with a concise summary for the UI side panel.
11. For local Git reviews, call `sync_git_file_diffs` with the target/base ref so the UI file-diff page is filled automatically. If `sync_git_file_diffs` is unavailable but unified diff content is available, call `add_file_diff` once per processed file.
12. Push one structured finding per actionable review comment.
13. Call `record_usage` near the end of the review. Use exact provider totals when the current AI tool exposes them; otherwise mark provider totals `unavailable` so DiffDeck can add observed local estimates. Mark DiffDeck, project, and other/host attribution as `exact`, `estimated`, `observed`, or `unavailable`.
14. Mark the review ready for human review.
15. End with a concise chat summary of the most important risks, uncertainties, verification commands not run, and next steps.

## Conversation Follow-Up

If the user asks you to answer a question from DiffDeck, continue a DiffDeck conversation, or respond in the UI:

1. Prefer `list_pending_conversation` to find human UI messages that do not have an agent reply yet.
2. If the user refers to a specific older message, use `list_conversation` to read the full conversation history.
3. Identify the latest unanswered human question, or the specific question the user named.
4. Use the active project context and your own available tools to answer.
5. Call `add_conversation_reply` with a concise answer. Preserve `isReviewAttached` when answering an attached review question. Set `relatedMessageId` to the human message id and preserve `relatedFindingId`, `relatedFilePath`, `relatedFilePaths`, `relatedLine`, and `relatedLineSide` when the answer is about a specific finding, file, or selected diff line.
6. Summarize briefly in chat that the answer was sent to DiffDeck.

If the user asks you to watch the DiffDeck chat, stay connected, or answer UI messages as they arrive:

1. Call `wait_for_conversation_message`.
2. If it returns a pending human message, answer it using project context.
3. Call `add_conversation_reply` with `relatedMessageId` set to that human message id.
4. Repeat `wait_for_conversation_message` until the user asks you to stop or the tool times out repeatedly.
5. If the watcher times out, say that no pending DiffDeck UI message arrived during the watch window and ask whether to continue watching.

The watcher is explicit: DiffDeck stores UI messages locally, but it does not wake an AI provider by itself. A connected agent must be running and using the MCP conversation tools.

Do not call an AI provider from DiffDeck directly; the current AI tool is responsible for reasoning with its configured model and subscriptions.

Store usage with `record_usage`. Do not invent exact provider totals; use `unavailable` when the tool does not expose a value. DiffDeck can add observed local estimates from stored review payloads, and attribution derived from visible prompts, files, MCP payloads, or conversation content should be marked `estimated` or `observed` rather than `exact`.

## Resetting A DiffDeck Session

If the user explicitly asks to reset, clear, or restart the DiffDeck analysis session, use `reset_review` when available. Do not reset a session automatically before a normal review; ask first if the user's intent is ambiguous.

## Branch And Ticket Context

Always keep the user oriented:

- State the source branch, MR, PR, diff file, or local-change scope being reviewed.
- State the target branch or target baseline before reviewing.
- If the target branch is unknown, ask for it.
- Ask whether the user wants to provide ticket information, acceptance criteria, or business context.

Do not invent the target branch from a branch name alone. A branch named `feature-x` or `dositl-337` does not by itself prove the target branch.

If the user gives a MR/PR link, use the link or available platform data to determine the target branch when possible.

If no MR/PR link exists yet, treat the review as a branch-to-branch review. Use local git to compare the source branch against the target branch, and create a DiffDeck review title such as `Review <SOURCE> -> <TARGET>`.

When ticket, acceptance criteria, business rules, or feature/correction context are available, summarize them in DiffDeck via `set_review_context`. Keep the summary useful for a human reviewer: expected behavior, important rules, assumptions, and out-of-scope points. Do not copy long ticket text verbatim.

## Setup Help Mode

If the user asks how to install or configure DiffDeck MCP in a target project:

1. Ask whether they want to print the config or write it into an MCP config file.
2. Prefer `npm run setup:mcp:print` for a safe first step.
3. Use `npm run setup:mcp` for guided setup from the DiffDeck repository.
4. Use `npm run setup:mcp:codex` when the current AI tool is Codex and the user wants Codex configured.
5. Explain that DiffDeck API and UI should be running when they want to use the review dashboard.
6. Explain that the AI tool usually needs to restart after MCP configuration changes.
7. Do not edit unrelated AI tool config files manually if the setup assistant can handle it.

If the user says something like "analyze MR X" or "review this branch" but MCP is not available:

1. Say that this project is configured to use DiffDeck for AI reviews.
2. Say whether you can see DiffDeck MCP tools.
3. If possible, check whether the local DiffDeck API is running.
4. Propose configuring MCP before the review, including the exact setup command for the current AI tool when known.
5. Offer chat-only review only as a fallback.
6. If the user wants setup help, guide them through `npm run setup:mcp` from the DiffDeck repository.
7. If configuration requires restarting the AI tool, stop before review and give a resume phrase for after restart.

## Finding Rules

Each DiffDeck finding should include:

- `title`: short and concrete.
- `severity`: one of `critical`, `important`, `suggestion`, `question`, `praise`.
- `filePath`: precise path in the target project.
- `line`: precise line when known.
- `codeSnippet`: exact relevant line or short block when available.
- `explanation`: why this matters.
- `suggestion`: review comment wording ready for the human to edit.
- `relationToChange`: one of `introduced`, `new_surface`, `worsened`, `preexisting_context`.
- `confidence`: `low`, `medium`, or `high`.
- `agentName`: the current AI tool name when known.

Use the full severity range when it helps the human reviewer prioritize:

- `critical`: blocking bug, security issue, data loss, or major regression.
- `important`: major maintainability, correctness, or architecture concern.
- `suggestion`: optional refactoring, readability, simplification, or small quality improvement.
- `question`: missing business, product, or technical context that should be clarified before approving.
- `praise`: genuinely useful positive feedback on robust code, a good test, or an elegant solution.

Do not collapse every useful comment into `important` or `critical`. If a finding is not a blocking risk, prefer `suggestion` or `question` when that more accurately describes the review value.

## Review Scope Rules

For pull request, merge request, branch, or diff reviews, keep findings strictly scoped to the reviewed diff:

- Only create findings on files that are present in the reviewed diff.
- Read files outside the diff only as supporting context to understand changed code.
- Do not create a finding whose primary location is outside the diff, even when the issue looks real.
- If a context file outside the diff reveals a risk, comment only when the risk is directly introduced or worsened by a changed line, and anchor the finding on the changed file/line that causes it.
- Do not turn preexisting issues outside the diff into review findings. Mention them only in the chat summary as "preexisting context" when useful, unless the user explicitly asks for a broader audit.
- Before calling `add_finding`, verify that `filePath` belongs to the reviewed diff file list. If it does not, skip the finding or re-anchor it on the changed file that introduces the issue.

## File Diff Rules

For local Git reviews, prefer `sync_git_file_diffs` with the target/base ref. This is mandatory when available for requests like "review the current branch against main" or "analyze local changes against dev", because findings and file diffs should appear together in DiffDeck. Each call replaces the active review's current Git file-diff set, so files removed from the latest Git diff disappear from the UI.

When the review source is not a local Git repository but the agent has reliable unified diff content for reviewed files, call `add_file_diff` for each processed file.

Each file diff should include:

- `filePath`: current path in the target project.
- `oldFilePath`: previous path when the file was renamed or copied.
- `status`: one of `added`, `modified`, `deleted`, `renamed`, `copied`, or `unchanged`.
- `unifiedDiff`: exact unified diff text for that file.
- `language`: language or extension when useful.
- `additions` and `deletions`: counts when known.
- `agentName`: the current AI tool name when known.

Do not invent diff content. If only a finding snippet is known, add the finding and skip `add_file_diff` for that file.

## Review Discipline

- Focus on bugs, regressions, security, data loss, broken behavior, maintainability risks, missing tests, and unclear assumptions.
- Do not report preexisting issues as findings unless the user asks for a global audit.
- Prefer fewer, stronger findings over many speculative ones.
- Use `question` when business context is missing.
- Use `praise` only for genuinely useful positive review comments.
- Do not use local build, compilation, or test execution as a default review step. Mention useful commands in the chat summary unless the user explicitly asked you to run them.
- Never publish comments to GitLab, GitHub, Bitbucket, or another platform without explicit human approval.
- Do not include personal local paths, secrets, API keys, tokens, passwords, or sensitive environment values in DiffDeck findings or chat summaries.

## Chat Summary

After pushing findings to DiffDeck, summarize:

- how many findings were pushed;
- the most important risks;
- any uncertainty or context needed;
- whether the review is ready for human review in DiffDeck.
