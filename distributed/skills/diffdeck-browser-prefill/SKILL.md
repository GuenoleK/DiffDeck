---
name: diffdeck-browser-prefill
description: Use this skill when the user asks an AI agent to take approved DiffDeck findings and prefill comments in a browser-based code review UI such as GitLab, GitHub, or Bitbucket. The skill requires browser automation and must never submit comments without explicit human approval.
---

# DiffDeck Browser Prefill

## Purpose

Use approved DiffDeck findings to prefill or create code review comments through a controlled review platform session.

This skill is intentionally separate from `diffdeck-code-review` because browser publication is more sensitive and platform UIs can change.

## Preconditions

Before using this skill:

1. DiffDeck MCP tools should be available.
2. Browser automation should be available through the current AI tool.
3. The user should provide the pull request or merge request URL.
4. Findings should already exist in DiffDeck.

If browser automation is unavailable, explain the limitation and offer the manual mode.

## Browser Modes

DiffDeck supports only these browser publication modes, in this priority order:

1. Playwright MCP + Chrome Extension: recommended mode. Use a user-selected Chrome/Edge/Chromium tab with the user's existing authenticated session. For GitLab, prefer authenticated API calls from that browser context over inline UI clicks.
2. Playwright MCP with persistent profile: use a dedicated Playwright browser that keeps login state between sessions.
3. Playwright MCP via CDP / remote debugging: advanced true-browser mode for controlled environments.
4. Chrome DevTools MCP: diagnostic or limited fallback mode for authentication, console, network, performance, and page visibility checks.
5. Integrated or isolated browser: separate session, only if the user accepts logging in there.
6. Manual mode: provide the approved comments ready to paste manually.

If the user asks to prefill or publish approved comments without specifying a mode, stop before opening any browser and ask the user to choose:

```text
Which browser mode do you want to use?
1. Playwright MCP + Chrome Extension (recommended, uses my selected authenticated browser tab)
2. Playwright MCP with persistent profile (dedicated browser, login kept between sessions)
3. Playwright MCP via CDP / remote debugging (advanced real-browser setup)
4. Chrome DevTools MCP (diagnostic or limited fallback)
5. Integrated browser (separate session, login may be required again)
6. Manual comments ready to paste
```

If the user asks to use their default browser or existing authenticated session, use mode 1 when available. Opening the URL in the default browser is not enough; the agent must be able to click, type, read the page, and place comments in that browser.

Recommended Playwright extension setup:

```json
{
  "mcpServers": {
    "playwright-extension": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--extension"]
    }
  }
}
```

The Playwright Chrome Extension lets the user choose which existing tab is exposed to the agent. If `PLAYWRIGHT_MCP_EXTENSION_TOKEN` is configured to avoid repeated approval prompts, treat it as sensitive local configuration and never copy it into shared docs, findings, comments, or tickets.

For Playwright MCP with a persistent profile, standard `@playwright/mcp@latest` keeps browser state between sessions. The user may need to authenticate once in that dedicated browser. Use `--user-data-dir` only when the user wants an explicit profile location.

For Playwright MCP via CDP, use a localhost `--cdp-endpoint` only with a Chrome instance that the user intentionally started for this task. Explain that remote debugging exposes browser state to local processes that can reach the endpoint.

## GitLab Action Levels

For GitLab, distinguish these action levels:

1. Form-only prefill: open the inline comment form and fill the textarea. Do not click `Start a review`, `Add comment now`, or any submit/persist action.
2. Draft review comments: create GitLab draft notes without publishing. Prefer the GitLab Draft Notes API from the authenticated browser context.
3. Publish or submit: create published GitLab diff discussions or publish pending drafts. This requires a separate explicit confirmation from the user.

If the user says "prefill" without specifying the GitLab action level, ask which level they want before placing comments. For multiple approved comments, recommend level 2 because level 1 may leave only one unsaved inline form visible or may lose previous unsaved text when navigating/scrolling.

If the user chooses level 1, treat it as a fragile single-form operation: fill the textarea as soon as the inline form opens, do not search for a persistence mechanism, and report that only currently open unsaved forms may be visible.

For GitLab, placing multiple approved comments requires saving each inline comment as a GitLab draft note or explicit published diff discussion. Do not rely on unsaved inline textareas across file navigation or scrolling. GitLab diffs can be lazy-loaded or virtualized, so unsaved forms can disappear when files are collapsed, unloaded, or replaced.

## GitLab API-First Path

For GitLab, the reliable path is Playwright Extension for authenticated session access plus GitLab API calls for creating positioned notes. Inline UI clicking is a fallback, not the primary publication mechanism.

Use the authenticated GitLab page to run same-origin API requests. Do not copy cookies, CSRF tokens, private project URLs, or session material into chat, logs, findings, or docs.

For GitLab level 2, prefer the Draft Notes API:

```text
POST /api/v4/projects/:project_id/merge_requests/:iid/draft_notes
```

For GitLab level 3, after explicit confirmation, use the Discussions API:

```text
POST /api/v4/projects/:project_id/merge_requests/:iid/discussions
```

Before creating any positioned note:

1. Parse the project ID or URL-encoded project path and merge request IID from the MR page or URL.
2. Fetch the latest MR version:

```text
GET /api/v4/projects/:project_id/merge_requests/:iid/versions
```

3. Use the first version response to populate:
   - `position[base_sha]` from `base_commit_sha`;
   - `position[start_sha]` from `start_commit_sha`;
   - `position[head_sha]` from `head_commit_sha`.
4. Create a text position with:
   - `position[position_type]=text`;
   - `position[old_path]`;
   - `position[new_path]`;
   - `position[new_line]` for added or current new-side lines;
   - `position[old_line]` for removed old-side lines.
5. After creation, fetch and verify the resulting draft note or discussion. Confirm that the created note is a positioned diff note at the expected `new_path`/`new_line` or `old_path`/`old_line`.

Never publish by writing into a generic visible textarea. Never use a `Reply to comment` field unless the finding explicitly says to reply to that existing thread.

If an API-created note is misplaced, use the recovery flow:

1. Find the note by body and author in the MR draft notes or discussions.
2. Verify its position against the expected file and line.
3. Delete the misplaced draft/note when the API and permissions allow it.
4. Recreate it with the correct `position`.
5. Report the recovery clearly.

## Fast Path

Move quickly once the mode and GitLab action level are known:

1. Retrieve approved findings once with `list_approved_findings`.
2. Verify the controlled page is authenticated once before placing comments.
3. On GitLab, use the API-first path from the authenticated browser context for level 2 and level 3 whenever available.
4. For each finding, create a positioned draft note or discussion with explicit `base_sha`, `start_sha`, `head_sha`, `position_type`, paths, and line.
5. Verify the created draft note or discussion after each creation before moving on.
6. Use UI placement only as a strict fallback when the API path is unavailable.
7. Report only meaningful blockers, such as missing browser control, unauthenticated page, missing API permission, missing file, missing line, non-commentable line, or failed position verification.

For GitLab UI fallback at level 2, the expected button sequence is deterministic: click `Start a review` for the first saved draft, then `Add to review` for each subsequent draft. Never click `Add comment now`.

## Chrome DevTools Stability

Chrome DevTools MCP is useful for diagnostics and constrained fallback work, but it is not DiffDeck's primary GitLab inline-comment engine. Use it to verify authentication, inspect network or console behavior, confirm that target files and lines are visible, or perform small browser actions when the page structure is manageable.

Known GitLab UI limits: large diffs can produce huge snapshots, lazy-loaded or virtualized files can recycle line nodes, inline comment buttons may appear only after a real hover, and existing thread reply textareas can remain visible. If a target line cannot be addressed reliably, do not publish elsewhere.

When controlling a Chrome/Edge session through Chrome DevTools MCP, prefer platform-native browser actions: page selection, snapshots, locator/accessibility clicks, hover, scroll, keyboard input, and text filling.

Avoid JavaScript injection, DOM mutation scripts, and generic `evaluate_script`/console execution for GitLab prefill. In real browser sessions, these calls can close the DevTools transport (`Transport closed`) and detach the authenticated browser connection. If a DevTools transport closes after such a call, do not keep retrying the same technique. Reconnect at most once, then continue only with non-injection actions or stop and explain that a stable browser connection is missing.

Use injected JavaScript only as a last resort after telling the user why it is needed and when losing the browser-control connection would be acceptable. It should not be part of the default GitLab prefill path.

## Workflow

1. Use `list_approved_findings` to retrieve only comments approved by the human.
2. If `list_approved_findings` is unavailable, use `list_findings` and keep only findings with `status: "approved"`.
3. Confirm the chosen browser mode. If the user did not choose a mode yet, ask for one of the six supported modes and wait.
4. For GitLab, confirm the chosen action level. If it is missing, ask for form-only prefill, draft review comments, or publish/submit.
5. Open and control the provided GitLab, GitHub, Bitbucket, or review platform URL. If the user asks to use their existing authenticated session, use browser automation attached to the OS default browser rather than an integrated or isolated browser.
6. Before placing comments, verify that the browser tool can see an authenticated review page, not only a sign-in page or an isolated browser page.
7. For GitLab level 2 or level 3, prefer API creation from the authenticated browser context using the latest MR version and explicit note `position`.
8. For GitLab level 1, or when the API path is unavailable and the user accepts UI fallback, expand GitLab diff files when needed to make approved target files and lines commentable. Use visible controls such as `Expand all files`, `Show file`, or equivalent per-file expand buttons when they are present and relevant.
9. Place and immediately persist the comment according to the chosen action level.
10. Verify that the thread or draft comment exists at the expected file and line before moving to the next finding.
11. Stop before publishing unless the user explicitly asks to submit.
12. Release the browser connection when the browser automation tool provides a close, disconnect, detach, or stop-session action. Do not close the user's normal browser window unless they explicitly asked for it.
13. If the connection cannot be released from the agent side, tell the user exactly how to disconnect it for the mode being used.
14. Report which comments were placed, which could not be placed, and whether the browser connection was disconnected or still needs user action.

## Browser Disconnection

At the end of any browser automation session, the agent must leave the user oriented about the browser connection state.

Preferred behavior:

- If the browser tool has a command to disconnect, detach, release, end session, stop session, stop auto-connect, or close a controlled integrated browser tab, use it after the requested work is complete.
- If the agent opened a dedicated tab and the selected mode allows closing it, close only that dedicated tab.
- If the browser tool controls the user's default Chrome/Edge browser or a user-selected existing tab, disconnect or detach the automation session without closing the user's normal browser window or preexisting tab unless the user explicitly asks to close it.
- If the browser tool cannot disconnect programmatically, say so and provide manual steps. Explain that ending the automation session avoids a later run inheriting an unexpected browser state.

Manual steps by mode:

- Playwright MCP + Chrome Extension: try an MCP release, detach, disconnect, or end-session command if the tool exposes one. Do not close a user-selected preexisting tab automatically. If no programmatic release exists, ask the user to click `Annuler` in the Playwright Extension to end the extension session for the selected tab.
- Playwright MCP with persistent profile: close the dedicated Playwright browser session through the browser tool if available.
- Playwright MCP via CDP / remote debugging: stop the Chrome process that was launched with remote debugging, or close that dedicated debugging browser window. If it was the user's normal browser, do not close it automatically; ask the user.
- Chrome DevTools MCP with `--autoConnect`: revoke/stop the DevTools MCP connection from the AI tool or MCP server, then in Chrome open `chrome://inspect/#remote-debugging` and disable remote debugging if the user enabled it only for this task.
- Chrome DevTools MCP with `--browser-url=http://127.0.0.1:9222`: stop the Chrome process that was launched with remote debugging, or close that dedicated debugging browser window. If it was the user's normal browser, do not close it automatically; ask the user.
- Integrated browser fallback: close the controlled tab/session when the tool allows it, then tell the user that this was a separate browser session.

Do not leave an active browser-control session silently. The final message must include one of:

- "Browser connection disconnected."
- "I could not disconnect it from here; please disconnect it by ..."

Desired MCP improvement: browser-extension MCP servers should expose an explicit `detach_current_tab`, `release_current_tab`, or `end_session` command that disconnects the agent from the selected tab without closing the browser tab.

## Safety Rules

- Do not click submit, publish, start review, resolve, approve, merge, or any destructive action without explicit user confirmation.
- Do not click `Start a review` for GitLab level 1. For level 2, `Start a review` and `Add to review` are allowed because they create drafts, but publishing/submitting remains forbidden without explicit confirmation.
- Never click `Add comment now`, `Submit review`, `Publish`, `Merge`, or any final publication action unless the user explicitly requested GitLab level 3.
- For GitLab level 2, use draft notes rather than published discussions when the API path is available.
- For GitLab level 3, create published discussions only after explicit confirmation.
- Never fill a generic textarea or the last visible textarea on the page.
- Never use a `Reply to comment` field unless the requested action is explicitly to reply to that existing thread.
- In UI fallback, confirm that the opened textarea belongs to the target diff row, target file, and target line before filling or saving.
- After each GitLab API or UI creation, verify that the note is a positioned diff note at the expected file and line.
- If the file or line cannot be found, do not guess silently. Report the mismatch.
- For MR/PR publication, do not publish approved findings whose `filePath` is not present in the platform diff. Treat them as out of scope for inline review comments and report them back to the user instead.
- Do not automatically fall back from an inline/diff comment to a general MR/PR note. A general note is allowed only when the user explicitly approves that fallback for the specific finding or asks for manual/general publication.
- When a requested line is not directly commentable, verify whether GitLab/GitHub exposes a nearby changed or context line in the same diff hunk. Use that nearby line only when the finding still clearly refers to that hunk; otherwise stop and report the mismatch.
- Keep the human in control of final wording and publication.
- Prefer platform draft modes when available.
- When using the OS default browser, do not ask the user to reauthenticate in an integrated browser if their normal browser is already logged in.
- Do not claim default-browser prefill is possible just because the URL can be opened. It is possible only if a tool can also inspect and control that browser.
- If the visible controllable page is a sign-in page while the user's default browser is already logged in, treat the current browser tool as isolated from the true session.
- If no tool can control the expected browser, stop and say which capability is missing. Offer only the supported modes in priority order: Playwright extension, Playwright persistent profile, Playwright CDP, Chrome DevTools diagnostic fallback, integrated browser, or manual mode.
- Do not leave browser automation attached silently after prefill or publication work is done.

## Comment Text

Use the finding suggestion as the comment body. In DiffDeck, this field may have been edited by the human and should be treated as the final approved wording. If a suggestion is missing, use the finding explanation.

Keep comments professional, concise, and actionable.
