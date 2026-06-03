---
name: diffdeck-browser-prefill
description: Use this skill when the user asks an AI agent to take approved DiffDeck findings and prefill comments in a browser-based code review UI such as GitLab, GitHub, or Bitbucket. The skill requires browser automation and must never submit comments without explicit human approval.
---

# DiffDeck Browser Prefill

## Purpose

Use approved DiffDeck findings to prefill code review comments in a browser UI.

This skill is intentionally separate from `diffdeck-code-review` because browser publication is more sensitive and platform UIs can change.

## Preconditions

Before using this skill:

1. DiffDeck MCP tools should be available.
2. Browser automation should be available through the current AI tool.
3. The user should provide the pull request or merge request URL.
4. Findings should already exist in DiffDeck.

If browser automation is unavailable, explain the limitation and offer the manual mode.

## Browser Modes

DiffDeck supports only these browser publication modes:

1. A - True session mode: pilot the user's default Chrome/Edge browser via a browser automation tool attached to that browser, such as Chrome DevTools MCP with `--autoConnect`, Chrome DevTools MCP with `--browser-url`, or a browser-extension MCP.
2. B - Fallback mode: use the AI tool's integrated browser, with a separate session, only if the user accepts logging in there.
3. C - Manual mode: provide the approved comments ready to paste manually.

If the user asks to prefill or publish approved comments without specifying a mode, stop before opening any browser and ask the user to choose:

```text
Which mode do you want to use?
A. Pilot my already authenticated default browser (requires Chrome DevTools MCP or an extension MCP attached to this session)
B. Use the AI tool's integrated browser (separate session, login may be required again)
C. Provide approved comments ready to paste manually
```

For option A, make the setup user-friendly: tell the user that Chrome 144 or newer is required, ask them to open `chrome://inspect/#remote-debugging`, enable remote debugging, accept the Chrome DevTools MCP access prompt when it appears, and retry mode A.

If the user asks to use their default browser or existing authenticated session, use true session mode. Opening the URL in the default browser is not enough; the agent must be able to click, type, read the page, and place comments in that browser.

For Chrome DevTools MCP, prefer `--autoConnect`. Guide the user through the setup when needed:

1. Use Chrome 144 or newer.
2. Open `chrome://inspect/#remote-debugging` in Chrome.
3. Enable remote debugging.
4. Restart the AI tool if the MCP configuration changed.
5. When Chrome asks to allow DevTools MCP access, accept it.
6. Retry the prefill in mode A.

If `--autoConnect` is not available, use `--browser-url=http://127.0.0.1:9222` only with a Chrome instance that the user started with remote debugging enabled.

## GitLab Action Levels

For GitLab, distinguish these action levels:

1. Form-only prefill: open the inline comment form and fill the textarea. Do not click `Start a review`, `Add comment now`, or any submit/persist action.
2. Draft review comments: fill the textarea, then click `Start a review` for the first comment and `Add to review` for subsequent comments so GitLab saves each comment as a draft, but do not publish or submit the review.
3. Publish or submit: publish the review or add comments immediately. This requires a separate explicit confirmation from the user.

If the user says "prefill" without specifying the GitLab action level, ask which level they want before placing comments. For multiple approved comments, recommend level 2 because level 1 may leave only one unsaved inline form visible or may lose previous unsaved text when navigating/scrolling.

If the user chooses level 1, treat it as a fragile single-form operation: fill the textarea as soon as the inline form opens, do not search for a persistence mechanism, and report that only currently open unsaved forms may be visible.

For GitLab, placing multiple approved comments requires saving each inline comment as a GitLab review draft. Do not rely on unsaved inline textareas across file navigation or scrolling. GitLab diffs can be lazy-loaded or virtualized, so unsaved forms can disappear when files are collapsed, unloaded, or replaced.

## Workflow

1. Use `list_approved_findings` to retrieve only comments approved by the human.
2. If `list_approved_findings` is unavailable, use `list_findings` and keep only findings with `status: "approved"`.
3. Confirm the chosen browser mode. If the user did not choose a mode yet, ask for A/B/C and wait.
4. For GitLab, confirm the chosen action level. If it is missing, ask for form-only prefill, draft review comments, or publish/submit.
5. Open and control the provided GitLab, GitHub, Bitbucket, or review platform URL. If the user asks to use their existing authenticated session, use browser automation attached to the OS default browser rather than an integrated or isolated browser.
6. Before placing comments, verify that the browser tool can see an authenticated review page, not only a sign-in page or an isolated browser page.
7. Navigate to the changed file and target line for each finding.
8. Place the comment according to the chosen action level.
9. Stop before publishing unless the user explicitly asks to submit.
10. Release the browser connection when the browser automation tool provides a close, disconnect, detach, or stop-session action. Do not close the user's normal browser window unless they explicitly asked for it.
11. If the connection cannot be released from the agent side, tell the user exactly how to disconnect it for the mode being used.
12. Report which comments were placed, which could not be placed, and whether the browser connection was disconnected or still needs user action.

## Browser Disconnection

At the end of any browser automation session, the agent must leave the user oriented about the browser connection state.

Preferred behavior:

- If the browser tool has a command to close, disconnect, detach, end session, stop auto-connect, or close the controlled integrated browser tab, use it after the requested work is complete.
- If the browser tool controls the user's default Chrome/Edge browser, disconnect or detach the automation session without closing the user's normal browser window unless the user explicitly asks to close it.
- If the browser tool cannot disconnect programmatically, say so and provide manual steps.

Manual steps by mode:

- Chrome DevTools MCP with `--autoConnect`: revoke/stop the DevTools MCP connection from the AI tool or MCP server, then in Chrome open `chrome://inspect/#remote-debugging` and disable remote debugging if the user enabled it only for this task.
- Chrome DevTools MCP with `--browser-url=http://127.0.0.1:9222`: stop the Chrome process that was launched with remote debugging, or close that dedicated debugging browser window. If it was the user's normal browser, do not close it automatically; ask the user.
- Browser-extension MCP: disconnect or disable the extension session for the current AI tool, or disable the extension if it was enabled only for this task.
- Integrated browser fallback: close the controlled tab/session when the tool allows it, then tell the user that this was a separate browser session.

Do not leave an active browser-control session silently. The final message must include one of:

- "Browser connection disconnected."
- "I could not disconnect it from here; please disconnect it by ..."

## Safety Rules

- Do not click submit, publish, start review, resolve, approve, merge, or any destructive action without explicit user confirmation.
- Do not click `Start a review` for GitLab level 1. For level 2, `Start a review` and `Add to review` are allowed because they create drafts, but publishing/submitting remains forbidden without explicit confirmation.
- Never click `Add comment now`, `Submit review`, `Publish`, `Merge`, or any final publication action unless the user explicitly requested GitLab level 3.
- If the file or line cannot be found, do not guess silently. Report the mismatch.
- For MR/PR publication, do not publish approved findings whose `filePath` is not present in the platform diff. Treat them as out of scope for inline review comments and report them back to the user instead.
- Do not automatically fall back from an inline/diff comment to a general MR/PR note. A general note is allowed only when the user explicitly approves that fallback for the specific finding or asks for manual/general publication.
- When a requested line is not directly commentable, verify whether GitLab/GitHub exposes a nearby changed or context line in the same diff hunk. Use that nearby line only when the finding still clearly refers to that hunk; otherwise stop and report the mismatch.
- Keep the human in control of final wording and publication.
- Prefer platform draft modes when available.
- When using the OS default browser, do not ask the user to reauthenticate in an integrated browser if their normal browser is already logged in.
- Do not claim default-browser prefill is possible just because the URL can be opened. It is possible only if a tool can also inspect and control that browser.
- If the visible controllable page is a sign-in page while the user's default browser is already logged in, treat the current browser tool as isolated from the true session.
- If no tool can control the default browser, stop and say which capability is missing. Offer only the supported modes: configure true session mode, continue in fallback mode after login, or use manual mode.
- Do not leave browser automation attached silently after prefill or publication work is done.

## Comment Text

Use the finding suggestion as the comment body. In DiffDeck, this field may have been edited by the human and should be treated as the final approved wording. If a suggestion is missing, use the finding explanation.

Keep comments professional, concise, and actionable.
