# Color System

## Palette intent

SportHub uses a restrained warm-red brand accent against neutral white and slate surfaces. Teal supports secondary actions; amber is an accent, not a replacement for status. Feedback colors are reserved for state communication.

| Role | Token | Intended meaning |
|---|---|---|
| Primary | `--color-primary` | Main action and brand emphasis |
| Primary hover | `--color-primary-hover` | Hover/focus-adjacent brand state |
| Secondary | `--color-secondary` | Supporting action or secondary brand cue |
| Accent | `--color-accent` | Limited highlight; not a status substitute |
| Background | `--color-background` | Application page canvas |
| Surface | `--color-surface` | Subtle grouped or disabled surface |
| Raised surface | `--color-surface-raised` | Cards, fields, menus, dialogs |
| Foreground / muted | `--color-foreground`, `--color-muted` | Primary and supporting text |
| Border | `--color-border` | Dividers and control boundaries |
| Success / warning / error / information | `--color-*` | Feedback and business status |

The canonical values live in `src/index.css`; see that file for exact values.

## Accessibility

- Never communicate booking, payment, or system status by color alone. Include a text label and accessible name.
- Check text/background contrast for each rendered pairing, particularly muted text and tinted status backgrounds.
- Keep status colors semantically stable across screens. Use `BookingStatusBadge`, `PaymentStatusBadge`, and `BookingSlot` rather than inventing local status palettes.
- Do not use the red primary color to mean an error in one location and a normal action in another when that could mislead users.
