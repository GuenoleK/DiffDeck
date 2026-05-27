# Product Vision

DiffDeck is a collaborative pre-review workspace for AI-assisted code review.

An AI agent analyzes a diff, a branch, or a merge request with its own tools, then pushes structured findings into DiffDeck. The user reviews those findings in a dedicated web UI, edits wording, approves useful comments, rejects false positives, and decides what to export or publish.

## Product Principles

- Agent prepares, human decides.
- Findings must be structured, not plain chat text.
- The UI must make severity, location, rationale, and suggested wording easy to scan.
- GitLab, GitHub, and Bitbucket visibility matters, but platform coupling should stay outside the core.
- Browser automation may prefill comments, but should not publish them without explicit human validation.

## Review Severities

- `critical`: blocking bug, security issue, major regression.
- `important`: risky behavior, major maintainability issue, architectural concern.
- `suggestion`: useful improvement or simplification.
- `question`: missing context or assumption to validate.
- `praise`: good code or robust solution worth highlighting.
