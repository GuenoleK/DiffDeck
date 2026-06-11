# MCP Workflow

DiffDeck MCP is the structured bridge between AI agents and the local dashboard.

Use `DIFFDECK_LOG_LEVEL` to tune server and MCP logs: `silent`, `error`, `info`, or `debug`. The default is `info`; repeated conversation polling logs only appear in `debug`.

## Expected Agent Flow

1. Read the user request, ticket, diff, and relevant files.
2. Analyze the changes with the agent's own tools.
3. Create or reuse the active DiffDeck review.
4. If ticket or functional rules are available, set a concise review context summary.
5. Push processed file diffs when the agent has unified diff content available.
6. Push each finding as structured data.
7. Call `record_usage` near the end of the review. Use exact provider totals when the AI tool exposes them; otherwise mark provider totals as `unavailable` so DiffDeck can still add observed local estimates from stored review payloads. Clearly mark DiffDeck, project, and other/host attribution as `exact`, `estimated`, `observed`, or `unavailable`.
8. Mark the review ready for human review.
9. Summarize the analysis in chat.

## MCP Tools

Initial tools:

- `create_review`
- `reset_review`
- `set_review_context`
- `add_finding`
- `list_findings`
- `list_approved_findings`
- `sync_git_file_diffs`
- `add_file_diff`
- `list_file_diffs`
- `record_usage`
- `list_conversation`
- `list_pending_conversation`
- `wait_for_conversation_message`
- `add_conversation_reply`
- `mark_ready_for_human_review`

Future tools:

- `export_review`
- `prepare_browser_publication`

For local Git branch or working-tree reviews, agents should call `sync_git_file_diffs` with the target/base ref after creating the review and before marking it ready. For branch-to-branch or MR-style reviews, pass `compareMode: "merge-base"` so the UI shows only source-branch changes since divergence from the target branch. Use direct comparison only for explicit two-dot or exact-baseline requests. `sync_git_file_diffs` replaces the active review's current Git file-diff set so files removed from the latest Git diff disappear from the UI. Use `add_file_diff` directly only when the agent already has unified diff content from another source such as a PR/MR API.

## Browser Publication

Browser MCP may open a GitLab/GitHub/Bitbucket merge request and prefill comments, but publication must remain under human control.
Publication agents should use `list_approved_findings` and treat each finding `suggestion` as the human-edited final comment body.

Use `reset_review` only when the user explicitly asks to reset, clear, or restart the DiffDeck analysis session. Do not reset as part of a normal review update.

## Review Conversation

The UI can add human questions to the session conversation. Questions can be attached to the active review or detached from it. Agents should use `list_conversation` when the user asks them to answer or continue from DiffDeck, then write the answer back with `add_conversation_reply` so the human can stay in the UI. Preserve `isReviewAttached` when answering an attached review question, and use `relatedMessageId`, `relatedFindingId`, `relatedFilePath`, `relatedFilePaths`, `relatedLine`, and `relatedLineSide` when a response targets a specific question, finding, file, or selected diff line.

DiffDeck does not wake an agent by itself. A running AI tool must be connected to the DiffDeck MCP server and must be asked to check or watch the conversation. For a one-shot answer, use `list_pending_conversation` or `list_conversation`, then answer with `add_conversation_reply`. For an explicit watcher mode, call `wait_for_conversation_message`, answer the returned pending human message with `add_conversation_reply`, then repeat until the user asks to stop. If MCP configuration changed, the AI tool usually needs a restart so it reloads the MCP server.

Supported browser publication modes are limited to this priority order:

1. Playwright MCP + Chrome Extension: recommended true-session mode for a user-selected Chrome/Edge/Chromium tab with the user's existing session. For GitLab, use this authenticated session to call the GitLab API for positioned notes instead of relying on inline diff clicks.
2. Playwright MCP with persistent profile: dedicated Playwright browser that keeps login state between sessions.
3. Playwright MCP via CDP / remote debugging: advanced true-browser mode for controlled setups.
4. Chrome DevTools MCP: diagnostic or limited fallback mode, useful for auth, network, console, and page checks.
5. Integrated or isolated browser: separate session, only if the user accepts it.
6. Manual mode: provide approved comments ready to paste.

If the user asks for prefill without specifying a mode, ask them to choose a browser mode before opening or controlling a browser. Recommend Playwright MCP + Chrome Extension first. Do not silently fall back to an integrated browser when the user expected their real authenticated browser.
For Playwright MCP + Chrome Extension, use `@playwright/mcp@latest --extension`; the user chooses the browser tab exposed to the agent. Treat `PLAYWRIGHT_MCP_EXTENSION_TOKEN` as sensitive local configuration if it is used.
For Playwright MCP with a persistent profile, use standard `@playwright/mcp@latest`; the user may need to authenticate once in that dedicated browser. Use `--user-data-dir` when an explicit profile location is required.
For Playwright MCP via CDP, use a localhost `--cdp-endpoint` only with a Chrome instance that the user intentionally started for browser automation.
For GitLab, ask for the action level when it is not explicit: 1 = fill only the opened inline form, 2 = create draft review comments without publishing, 3 = publish/submit after explicit confirmation. For level 2, prefer the GitLab Draft Notes API from the authenticated browser context. For level 3, use GitLab Discussions API or publish drafts only after explicit confirmation. Retrieve the latest MR version from `/api/v4/projects/:project_id/merge_requests/:iid/versions`, use explicit `base_sha`, `start_sha`, `head_sha`, `position_type`, paths, and line, then verify the created draft or discussion at the expected file and line.

On GitLab UI fallback, if target files or lines are collapsed, hidden, or lazy-loaded, use visible expand controls such as `Expand all files`, `Show file`, or equivalent per-file buttons before placing inline comments. Never publish into a generic textarea or the last visible textarea. Never use a `Reply to comment` field unless the user explicitly asked to reply to that existing thread. Before saving through UI fallback, confirm the textarea belongs to the target diff row, target file, and target line.

For Chrome DevTools MCP publication, treat the tool as diagnostic or fallback rather than the primary GitLab inline-comment engine. Large GitLab diffs can produce huge snapshots, lazy-loaded files can recycle target lines, inline controls may require real hover, and existing thread reply textareas can remain visible. Avoid JavaScript injection, DOM mutation scripts, and generic `evaluate_script` calls in the default GitLab prefill path. Prefer snapshots, locator/accessibility clicks, hover, scroll, keyboard input, and text filling. If a DevTools transport closes after an injection-style call, reconnect at most once, then continue only with non-injection actions or stop and explain that the browser connection is unstable.

After browser publication or prefill work, the agent must disconnect, detach, release, close, or stop the browser-control session when the browser tool supports it. If the agent opened a dedicated tab and the mode allows closing it, it may close that dedicated tab. Do not close the user's normal browser window or a user-selected preexisting tab unless they explicitly asked for it. If the tool cannot release the connection programmatically, the agent must say so and give mode-specific manual steps, such as clicking `Annuler` in the Playwright Extension, stopping Playwright MCP, closing the dedicated Playwright browser, disabling remote debugging, closing a dedicated Chrome instance launched with `--remote-debugging-port`, stopping the DevTools MCP server, or closing the integrated browser session. The agent must explain that releasing the session avoids a later run inheriting an unexpected browser state. Do not leave an active browser-control session silently.
