# Design System Rule

- Read `../../design-system/DESIGN.md`, `DESIGN_TOKENS.md`, and `COMPONENTS.md` before implementing UI.
- `../../src/index.css` is the canonical CSS token source; `../../tailwind.config.js` only maps those values to utilities.
- Reuse components from `../../src/components/ui`, `../../src/components/shared`, `../../src/components/booking`, and existing business components.
- Do not introduce arbitrary colors, independent typography, duplicate variants, global token overrides, or another UI library without approval.
- Existing pages may remain visually inconsistent until the separately scheduled legacy refactor; new UI must follow the design system.
- Any component or token addition requires documentation updates and a focused accessibility/visual check.
