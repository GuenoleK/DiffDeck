# Frontend Rules

## Stack

- React
- TypeScript
- Vite
- SCSS
- BEM

Do not use Tailwind.

## Component Structure

Use one folder per component:

```text
FindingCard/
  FindingCard.tsx
  FindingCard.scss
  components/
    FindingCardHeader/
      FindingCardHeader.tsx
      FindingCardHeader.scss
```

## BEM

Each component owns a clear block name:

```tsx
<article className="finding-card finding-card--important">
  <header className="finding-card__header" />
</article>
```

```scss
.finding-card {
  &--important {}
  &__header {}
}
```

Names should be easy to inspect in browser DevTools.

## Visual Direction

- Dark mode premium.
- Developer-focused density.
- No marketing landing page for the app shell.
- The first screen should be the usable review workspace.
- Cards are for individual findings, not for wrapping every page section.
