# Frontend Development Rules

Before changing frontend UI, read:

1. `AGENTS.md`
2. `design-system/DESIGN.md`
3. `design-system/DESIGN_TOKENS.md`
4. `design-system/COMPONENTS.md`
5. The applicable rules in `.agents/rules/`
6. Existing components in `src/components/ui`, `src/components/shared`, `src/components/booking`, and any relevant domain component.

## Mandatory

- Use the current React/TypeScript/Vite/React Router/Tailwind 3.4 stack.
- Use semantic tokens and existing component variants for all new UI.
- Keep components typed, responsive, keyboard-operable, and labeled.
- Preserve existing routes, auth, business behavior, and API/realtime contracts.
- Show loading, empty, error, disabled, and success states as appropriate.
- Run `npm run build` and `npm run lint` after changes; inspect rendered UI for visual work.
- Update component/design docs when adding a reusable component or changing tokens.

## Prohibited without explicit approval

- Arbitrary new color palettes or typography systems.
- Duplicate reusable components or a second UI library.
- Changing global tokens as a local page fix.
- Broadly redesigning legacy screens during feature work.
- Changing booking, payment, POS, authentication, or SignalR behavior for visual reasons.

If a needed pattern is absent, establish the use case and component API, document variants and accessibility, then implement with the current tokens.

See `.agents/rules/` and `.agents/skills/` for the detailed standards and workflows.
