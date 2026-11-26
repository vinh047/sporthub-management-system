# Design Tokens

## Source of truth

Global token values are defined once in `src/index.css` under `:root`. Color variables hold RGB channel triplets so Tailwind CSS 3.4 can apply opacity modifiers; use them through mapped Tailwind colors rather than as standalone CSS colors. `tailwind.config.js` exposes the semantic colors, radii, shadows, font family, and content width as Tailwind utilities. Do not copy token values into page styles or redefine them in component styles.

## Semantic token map

| Purpose | CSS token | Tailwind utility examples |
|---|---|---|
| Brand action | `--color-primary`, `--color-primary-hover` | `bg-primary`, `text-primary`, `hover:bg-primary-hover` |
| Supporting brand | `--color-secondary`, `--color-accent` | `bg-secondary`, `text-accent` |
| Page and raised surfaces | `--color-background`, `--color-surface`, `--color-surface-raised` | `bg-background`, `bg-surface`, `bg-surface-raised` |
| Text and divider | `--color-foreground`, `--color-muted`, `--color-border` | `text-foreground`, `text-muted`, `border-border` |
| Feedback | `--color-success`, `--color-warning`, `--color-error`, `--color-information` | `text-success`, `bg-warning`, `text-error`, `text-info` |
| Typography | `--font-family-sans`, `--font-size-*`, `--font-weight-*`, `--line-height-*` | `font-sans`, `text-heading-1`, `font-semibold`, `leading-body` |
| Radius and elevation | `--radius-*`, `--shadow-*` | `rounded-control`, `rounded-card`, `shadow-design-sm` |
| Layering | `--z-header`, `--z-overlay` | `z-header`, `z-overlay` |
| Motion and focus | `--duration-*`, `--ease-standard`, `--focus-ring` | Use focus-visible utilities and token-backed transitions |

Compatibility aliases (`--bg-primary`, `--text-primary`, `--accent-primary`, and related legacy names) point to the canonical values. Prefer canonical semantic tokens in new code.

## Practical rules

- Use Tailwind's existing 4px spacing scale (`1` = 4px); avoid one-off spacing values unless a layout genuinely requires them.
- Use standard Tailwind responsive breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`); do not add a competing breakpoint system.
- Use `max-w-content` for broad content containers where appropriate.
- Use `z-header` and `z-overlay` values only when the corresponding utilities are available; existing components can retain established z-index classes until refactoring.
- Use `:focus-visible` and never remove keyboard focus without an accessible replacement.
- Opacity modifiers such as `bg-primary/10` are supported by the RGB-channel Tailwind mapping; check generated styles when changing the mapping.

## Change control

Changing the meaning or value of a global token can affect all areas. Treat changes to this file as design-system changes: explain the use case, check existing consumers, and update the token documentation.
