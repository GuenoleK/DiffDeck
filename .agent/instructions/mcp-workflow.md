# MCP Workflow

DiffDeck MCP is the structured bridge between AI agents and the local dashboard.

## Expected Agent Flow

1. Read the user request, ticket, diff, and relevant files.
2. Analyze the changes with the agent's own tools.
3. Create or reuse the active DiffDeck review.
4. Push each finding as structured data.
5. Mark the review ready for human review.
6. Summarize the analysis in chat.

## MCP Tools

Initial tools:

- `create_review`
- `add_finding`
- `update_finding`
- `list_findings`
- `mark_ready_for_human_review`

Future tools:

- `export_review`
- `prepare_browser_publication`

## Browser Publication

Browser MCP or Playwright may open a GitLab/GitHub/Bitbucket merge request and prefill comments, but publication must remain under human control.
