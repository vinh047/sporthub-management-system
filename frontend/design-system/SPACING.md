# Spacing and Layout

## Base scale

Use Tailwind's 4px spacing scale as the canonical scale: `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `6` = 24px, `8` = 32px. The CSS tokens `--space-base`, `--space-component`, `--space-section`, and `--space-page` describe common intent; Tailwind utilities remain the implementation mechanism.

## Application

- Control internals: typically 8–12px vertical and 12–16px horizontal padding.
- Related fields: usually 16px apart.
- Page sections: usually 24–32px apart.
- Page gutters: 16px on small screens; increase at larger breakpoints.
- Use one container width consistently; `max-w-content` maps to the design token.
- Use layout primitives (`flex`, `grid`, `gap-*`) rather than margins between repeated siblings.

These are defaults, not a reason to distort dense workflows such as schedules, tables, or POS.
