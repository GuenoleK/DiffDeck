# Browser Prefill Modes

DiffDeck does not publish review comments by itself. It prepares a queue of human-approved findings and gives AI agents a controlled workflow for placing those comments in GitLab, GitHub, Bitbucket, or another browser review UI.

The default recommendation is Playwright MCP with the Playwright Chrome Extension. It lets the user expose a selected Chrome, Edge, or Chromium tab that is already authenticated, without launching Chrome with a remote debugging port.

## Decision Matrix

| Priority | Mode | Use When | Advantages | Limits |
|---:|---|---|---|---|
| 1 | Playwright MCP + Chrome Extension | The user wants the agent to control an already authenticated real browser tab. | Reuses the user's real session, the user selects the exposed tab, no remote debugging port is needed. | Requires the extension and an MCP server configured with `--extension`. |
| 2 | Playwright MCP with persistent profile | The extension cannot be installed, but a dedicated browser profile is acceptable. | Simple MCP setup, login state is kept between sessions. | The user must authenticate once in the Playwright browser; it is not the normal browser profile. |
| 3 | Playwright MCP via CDP / remote debugging | A controlled enterprise or advanced setup needs real Chrome automation without the extension. | Keeps Playwright's robust locators, hover, scroll, and click behavior against a real browser. | More technical; exposes a remote debugging endpoint and needs clear security handling. |
| 4 | Chrome DevTools MCP | The agent needs browser diagnostics, network/console/perf inspection, auth checks, or a limited fallback. | Official Google tool, good diagnostics, can attach through auto-connect or browser URL. | Less reliable as the main GitLab inline-comment engine on large virtualized diffs. |
| 5 | Integrated or isolated browser | The user accepts a separate browser session. | Simple for public pages and non-SSO environments. | Does not reuse the user's real GitLab/GitHub session and may require login or 2FA. |
| 6 | Manual mode | Browser automation is unavailable or unsafe. | Always works, no automated publication risk. | Human copy/paste is required. |

## Mode A: Playwright MCP + Chrome Extension

Recommended mode.

Install the Playwright Chrome Extension, then configure the MCP server with `--extension`:

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

When the agent first interacts with the browser, the extension asks the user which tab should be exposed. This is the preferred DiffDeck path for "use my real authenticated browser" because it preserves the user session while keeping tab selection explicit.

The extension can also use `PLAYWRIGHT_MCP_EXTENSION_TOKEN` to avoid repeated connection approval prompts. Treat that token like a local credential for the browser profile: do not commit it and do not paste it in shared docs or tickets.

### Client Setup Notes

Use the same `command` and `args` pair in each MCP client. Restart the AI tool after changing MCP configuration.

Codex `~/.codex/config.toml`:

```toml
[mcp_servers.playwright-extension]
command = "npx"
args = ["@playwright/mcp@latest", "--extension"]
```

Claude Code, Antigravity, Cursor, VS Code, and other JSON-based MCP clients:

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

If the tool offers a CLI-based MCP installer, create an equivalent server named `playwright-extension` with command `npx` and args `@playwright/mcp@latest`, `--extension`.

## Mode B: Playwright MCP With Persistent Profile

Use standard Playwright MCP:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Playwright MCP stores login state in a persistent profile by default. The user logs in to GitLab/GitHub once in the Playwright-controlled browser, then later sessions can reuse that profile. Use `--user-data-dir` when a stable, explicit profile location is needed.

Use this when the extension is blocked but a dedicated browser session is acceptable.

## Mode C: Playwright MCP Via CDP / Remote Debugging

Use Playwright MCP with a Chrome DevTools Protocol endpoint:

```json
{
  "mcpServers": {
    "playwright-cdp": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--cdp-endpoint", "http://127.0.0.1:9222"]
    }
  }
}
```

The user must start Chrome with a remote debugging port and a dedicated profile. Document the operational risk clearly: a remote debugging endpoint can expose browser state to local processes that can reach it. Prefer `127.0.0.1`, use a task-specific profile, and close that Chrome instance after the prefill.

## Mode D: Chrome DevTools MCP

Chrome DevTools MCP remains useful, but DiffDeck should not present it as the main GitLab publication engine.

Typical install commands:

```bash
claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest
codex mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

Use it for diagnostics and constrained fallback work:

- verify whether the review page is authenticated;
- inspect console, network, or performance issues;
- confirm that target files and lines are visible;
- perform small browser actions when the page structure is manageable.

Known limits for GitLab inline comments:

- large diffs can produce huge accessible snapshots;
- virtualized or lazy-loaded files can recycle line nodes;
- inline comment buttons may appear only after a real hover;
- a click can miss if GitLab unloads or re-renders the target line.

When using Chrome DevTools MCP for GitLab prefill, avoid JavaScript injection, DOM mutation scripts, and generic `evaluate_script` calls. Prefer snapshots, locator or accessibility clicks, keyboard input, text filling, hover, and scroll.

## Mode E: Integrated Or Isolated Browser

Use the AI tool's integrated browser only after the user accepts that it is a separate session. It is useful for public pages, test environments, or cases where re-authentication is acceptable.

If the integrated browser shows a sign-in page while the user's normal browser is already logged in, treat that as a different session and do not claim that true-session prefill is available.

## Mode F: Manual Mode

When no safe browser-control mode is available, use `list_approved_findings` and provide comments ready to paste, with:

- file path;
- target line;
- final comment body from `suggestion`;
- any placement caveat, such as missing file or non-commentable line.

Do not convert an inline finding into a general MR/PR note unless the user approves that fallback for the specific finding.

## Required Agent Workflow

For every browser prefill run:

1. Retrieve approved findings once with `list_approved_findings`.
2. Use the `suggestion` field as the final human-edited comment body.
3. Confirm the browser mode before opening or controlling a browser.
4. Verify that the controlled page is authenticated.
5. For GitLab, confirm the action level:
   - level 1: fill opened inline forms only;
   - level 2: create draft review comments without publishing;
   - level 3: publish or submit only after explicit confirmation.
6. Navigate directly to each file and line.
7. Expand or show the file if GitLab collapsed or lazy-loaded it.
8. Hover the target line when required to expose inline controls.
9. Open the textarea and fill it immediately.
10. Save the draft or publish according to the confirmed action level.
11. Verify that the thread or draft comment exists before moving to the next finding.
12. If targeting fails, do not publish elsewhere; report the mismatch or ask for arbitration.

For multiple GitLab comments, recommend level 2. Unsaved inline textareas can disappear during navigation, scrolling, lazy loading, or file collapse.

## Security Notes

- Do not publish or submit without explicit level 3 confirmation.
- Do not store browser tokens, extension tokens, cookies, or private URLs in shared docs.
- Treat `PLAYWRIGHT_MCP_EXTENSION_TOKEN` as sensitive local configuration.
- Prefer the extension mode over remote debugging for everyday use.
- If using remote debugging, bind to localhost, use a dedicated profile, and close the debug browser when done.
- Disconnect, detach, or stop browser automation after the run. Do not leave a browser-control session attached silently.

## References

- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Playwright Chrome Extension: https://github.com/microsoft/playwright/tree/main/packages/extension
- Chrome DevTools MCP: https://github.com/ChromeDevTools/chrome-devtools-mcp
