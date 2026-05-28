# MCP Workflow

DiffDeck MCP is the structured bridge between AI agents and the local dashboard.

## Expected Agent Flow

1. Read the user request, ticket, diff, and relevant files.
2. Analyze the changes with the agent's own tools.
3. Create or reuse the active DiffDeck review.
4. If ticket or functional rules are available, set a concise review context summary.
5. Push each finding as structured data.
6. Mark the review ready for human review.
7. Summarize the analysis in chat.

## MCP Tools

Initial tools:

- `create_review`
- `reset_review`
- `set_review_context`
- `add_finding`
- `list_findings`
- `list_approved_findings`
- `mark_ready_for_human_review`

Future tools:

- `export_review`
- `prepare_browser_publication`

## Browser Publication

Browser MCP may open a GitLab/GitHub/Bitbucket merge request and prefill comments, but publication must remain under human control.
Publication agents should use `list_approved_findings` and treat each finding `suggestion` as the human-edited final comment body.

Use `reset_review` only when the user explicitly asks to reset, clear, or restart the DiffDeck analysis session. Do not reset as part of a normal review update.

Supported browser publication modes are limited to:

- A - true session mode: pilot the user's default Chrome/Edge browser through Chrome DevTools MCP (`--autoConnect` preferred, `--browser-url` for a manually debuggable browser) or a browser-extension MCP;
- B - fallback mode: use the AI tool's integrated browser with a separate session, only if the user accepts it;
- C - manual mode: provide approved comments ready to paste.

If the user asks for prefill without specifying a mode, ask them to choose A/B/C before opening or controlling a browser.
For mode A with Chrome DevTools MCP, guide the user to use Chrome 144+, open `chrome://inspect/#remote-debugging`, enable remote debugging, accept the DevTools MCP access prompt, then retry with `--autoConnect`.
For GitLab, ask for the action level when it is not explicit: 1 = fill only the opened inline form, 2 = create draft review comments without publishing, 3 = publish/submit after explicit confirmation. For multiple comments, recommend level 2 because unsaved inline textareas can disappear across file navigation, scrolling, lazy loading, or collapsed/unloaded files. In level 2, use `Start a review` for the first comment and `Add to review` for subsequent comments, but never `Add comment now`, `Submit review`, `Publish`, or `Merge` unless level 3 was explicitly requested.
