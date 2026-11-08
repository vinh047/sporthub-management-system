# Frontend Standards

- Use React function components and TypeScript types; avoid `any` and unsafe casts.
- Keep domain data access in existing API modules and preserve route/auth boundaries.
- Keep presentation components free of API calls and business calculations.
- Reuse existing helpers, domain types, and Lucide icons.
- Give controls labels, errors, focus states, and disabled/loading states as applicable.
- Avoid adding dependencies when the current stack can meet the need.
- Run the smallest relevant validation, then `npm run build` and `npm run lint` for shared foundation changes.
