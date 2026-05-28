# DiffDeck Distributed Assets

These files are meant to be copied into projects that want to use DiffDeck.

- `skills/`: skills that teach AI agents how to push code review findings to DiffDeck.
- `snippets/`: small instruction snippets for target project agent files.

These files are not for developing DiffDeck itself. Internal DiffDeck development instructions live in `.agent/`.

## Install In A Target Project

In the project that will use DiffDeck, copy these two folders:

```text
DiffDeck\distributed\skills\diffdeck-code-review
DiffDeck\distributed\skills\diffdeck-browser-prefill
```

Paste them into:

```text
target-project\.agent\skills\
```

The target project should then contain:

```text
target-project/
  .agent/
    skills/
      diffdeck-code-review/
        SKILL.md
      diffdeck-browser-prefill/
        SKILL.md
```

Then add this note to the target project's shared agent/development instructions:

```md
DiffDeck:
- For AI code review, MR/PR analysis, branch analysis, or diff analysis, use `.agent/skills/diffdeck-code-review` by default, even if the user does not explicitly mention DiffDeck.
- For browser prefill of approved comments in GitLab/GitHub, use `.agent/skills/diffdeck-browser-prefill`; retrieve the queue with `list_approved_findings` and use `suggestion` as the final human-edited comment.
- If DiffDeck MCP is unavailable, stop before the review, propose MCP configuration as the main next step, then mention chat-only review only as fallback.
- If MCP configuration requires restarting the AI tool, give a clear resume phrase with the source, target branch, and context, for example: "Analyze <SOURCE> with DiffDeck. Target branch: <TARGET>. Feature/fix context: <ticket, acceptance criteria, business description, or useful knowledge>."
```

For MCP setup, run this from the DiffDeck repository:

```bash
npm run setup:mcp
```

For Codex specifically:

```bash
npm run setup:mcp:codex
```

These commands must be run from the DiffDeck repository root, not from the target project being reviewed.

From another folder, use:

```bash
npm --prefix <DIFFDECK_ROOT> run setup:mcp:codex
```

To only print the config:

```bash
npm run setup:mcp:print
```

DiffDeck can also be used before a platform MR/PR exists. Ask the agent to review a source branch against a target branch, for example:

```text
Review branch feature/dose-validation against dev with DiffDeck. Context: implements ticket DOSITL-337.
```

If the target branch is missing, the agent should ask for it before analyzing.
