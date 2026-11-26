# SportHub Design System

## Purpose

This is the visual and interaction foundation for new SportHub frontend work. It keeps the existing React, TypeScript, Vite, React Router, Tailwind CSS 3.4, and Lucide stack. It is a foundation, not a redesign of existing screens.

## Visual identity: Sport Premium

SportHub should feel professional, athletic, minimal, functional, and trustworthy. Use the dark-red brand primary for decisive actions, neutral surfaces for information, and semantic colors only for meaning. Prefer clear hierarchy and practical density over decoration.

Avoid decorative gradients, glass effects, large shadows, arbitrary colors, nested cards, and unnecessary rounded containers. Use gradients only where an existing branded surface requires them; do not extend that legacy treatment to new pages by default.

## Principles

1. **Business first:** preserve booking, payment, authentication, and role behavior.
2. **One source of truth:** use CSS tokens from `src/index.css`, exposed through Tailwind semantic names.
3. **Reuse:** inspect `src/components/ui`, `src/components/shared`, and `src/components/booking` before creating a component.
4. **Accessible by default:** label controls, preserve keyboard operation, communicate errors and statuses with text, and honor reduced-motion preferences.
5. **Responsive by default:** build mobile-first and verify narrow and wide layouts.
6. **Incremental adoption:** existing pages can keep legacy styles until the separately planned consistency refactor.

## Page composition

- Use one clear page title and a concise description where context is needed.
- Place primary actions near the relevant heading or workflow.
- Use a single surface for a coherent group of controls; avoid cards inside cards.
- Keep forms, tables, grids, and booking matrices usable on mobile. Horizontal overflow is acceptable for inherently two-dimensional schedules when it remains discoverable.
- Distinguish loading, empty, error, and success states.

## Example

```tsx
import { Button, Card, Input } from '../components/ui';
import { PageHeader } from '../components/shared';

<section className="space-y-6">
  <PageHeader title="Tạo sân" description="Nhập thông tin sân để tiếp tục." />
  <Card className="space-y-4 p-5">
    <Input label="Tên sân" required />
    <Button type="submit">Lưu sân</Button>
  </Card>
</section>
```

See [DESIGN_TOKENS.md](./DESIGN_TOKENS.md), [COMPONENTS.md](./COMPONENTS.md), and [UX_GUIDELINES.md](./UX_GUIDELINES.md) for implementation rules.
