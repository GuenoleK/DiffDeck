# Coding Standards

## TypeScript

- Use strict TypeScript.
- Keep shared types in `packages/core`.
- Use schemas for external inputs.
- Prefer explicit domain names: `Review`, `Finding`, `FindingStatus`, `FindingSeverity`.
- Avoid large utility files; split helpers by domain.

## File Size And Composition

- Prefer focused files.
- Split complex components into subcomponents.
- Split reusable logic into hooks or helpers.
- Do not create catch-all components or catch-all services.

## State

- Server state is in-memory for the MVP.
- UI state should stay close to the component that owns it.
- Add a shared store only when prop drilling or repeated state transitions become painful.

## Human-In-The-Loop Rule

AI-generated findings are drafts. Do not implement behavior that publishes comments to a remote platform without explicit human approval.

## Public Documentation And Secrets

- Do not commit personal absolute paths from a developer machine in README files, distributed snippets, examples, generated docs, or public-facing configuration.
- Use placeholders such as `<DIFFDECK_ROOT>`, `<TARGET_PROJECT_ROOT>`, or `<MCP_CONFIG_PATH>` in documentation.
- Do not commit API keys, tokens, passwords, private URLs, customer data, or sensitive environment variable values.
- Environment variable names are allowed in examples, but values must be safe placeholders unless they are harmless local defaults such as `http://127.0.0.1:4337/api`.
- Before finishing documentation or distributed assets, search for personal paths and secret-like values.
