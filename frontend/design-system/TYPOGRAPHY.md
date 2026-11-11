# Typography

## Typeface

Use the system-first sans stack in `--font-family-sans`. The current stack prefers Inter when available, then native system fonts. Do not add a separate font dependency or page-specific font family without approval.

## Hierarchy

| Role | Token | Guidance |
|---|---|---|
| Display | `--font-size-display` | Rare, marketing-only headline |
| Heading 1 | `--font-size-heading-1` | Page title |
| Heading 2 | `--font-size-heading-2` | Major page section |
| Heading 3 | `--font-size-heading-3` | Card or subsection heading |
| Body | `--font-size-body` | Standard readable content |
| Caption | `--font-size-caption` | Metadata; do not use for essential instructions |

Use Tailwind's responsive text utilities where a responsive hierarchy is needed. Use medium/semibold weights for labels and headings; reserve bold for primary headings, totals, and important actions. Keep body line height near 1.5 and heading line height compact.

## Content

- Write concise Vietnamese UI copy consistent with the existing product.
- Keep labels visible rather than relying on placeholders.
- Use tabular numerals for money, durations, and countdowns where alignment helps.
- Format VND consistently with `toLocaleString('vi-VN')` and the existing `đ` convention.
