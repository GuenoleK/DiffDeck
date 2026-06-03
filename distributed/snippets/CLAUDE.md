# Claude Instructions

<!-- BEGIN DIFFDECK MANAGED BLOCK -->
## DiffDeck

- For AI code review, MR/PR analysis, branch analysis, diff analysis, ticket review, or local changes, use `.agent/skills/diffdeck-code-review` by default, even if the user does not explicitly mention DiffDeck.
- For MR/PR or branch reviews, keep DiffDeck findings scoped to files present in the reviewed diff; read files outside the diff only as context and do not publish out-of-diff findings unless the user explicitly asks for a broader audit.
- For browser prefill of approved comments in GitLab, GitHub, Bitbucket, or another browser review UI, use `.agent/skills/diffdeck-browser-prefill`; retrieve the queue with `list_approved_findings` and use `suggestion` as the final human-edited comment.
- For installing, updating, refreshing, or synchronizing DiffDeck distributed skills in this project, use `.agent/skills/diffdeck-sync-distributed`; run a dry-run first and do not overwrite local edits unless explicitly requested.
- For questions asked from the DiffDeck UI conversation, use `.agent/skills/diffdeck-code-review` and the MCP conversation tools. For one-shot replies, use `list_pending_conversation` then `add_conversation_reply`. For live chat, loop on `wait_for_conversation_message`, answer with the current agent's project context, then send the reply back to DiffDeck with `add_conversation_reply`.
- If DiffDeck MCP is unavailable, stop before the review, propose MCP configuration as the main next step, then mention chat-only review only as fallback.
- If MCP configuration requires restarting the AI tool, give a clear resume phrase with the source, target branch, and context, for example: "Analyze <SOURCE> with DiffDeck. Target branch: <TARGET>. Feature/fix context: <ticket, acceptance criteria, business description, or useful knowledge>."
<!-- END DIFFDECK MANAGED BLOCK -->

DiffDeck findings are drafts. The human user decides what gets published.
