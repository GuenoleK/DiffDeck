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
