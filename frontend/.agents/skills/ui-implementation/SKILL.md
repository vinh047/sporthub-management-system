# UI Implementation Workflow

For frontend implementation:

- Keep business logic in existing domain/API layers and presentation logic in components.
- Reuse UI primitives and shared status/empty/error/loading components.
- Type public component props and use native HTML semantics.
- Provide labels, descriptions, keyboard focus, disabled/loading feedback, and textual status.
- Do not add dependencies or global tokens for a one-off page requirement.
- Update `design-system/COMPONENTS.md` for reusable API changes.
- Verify `npm run build`, `npm run lint`, route behavior, and responsive rendering.
