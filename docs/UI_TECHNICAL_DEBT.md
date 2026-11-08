# UI Technical Debt — Deferred Consistency Refactor

This backlog records issues intentionally left out of the Design System Foundation task. Do not treat it as authorization to change business behavior. Address items in small route-focused changes after the product feature set is stable.

| Priority | Surface | Observation | Suggested follow-up |
|---|---|---|---|
| High | Player home | Booking and booking-history shortcuts are marked “coming soon” although `/player/booking` and `/player/my-bookings` exist. | Connect those actions to the existing routes; preserve role and auth navigation. |
| High | POS | Court, time slot, and price values are local placeholders; screen notes that real catalog/pricing integration is pending. | Integrate authoritative APIs only when available; do not use UI tokens to mask incomplete data behavior. |
| Medium | Global styles | `src/App.css` contains Vite starter selectors and undefined legacy custom properties and is not imported by the app entry point. | Confirm no external consumer, then remove or replace it in a dedicated cleanup. |
| Medium | Design tokens | Existing pages still use literal Tailwind palette classes, while a shared semantic layer is now available. | Migrate page-by-page, checking rendered contrast and preserving status meaning. |
| Medium | Form controls | Some forms use `FormField`, while others define inline input/select classes; error and help text patterns differ. | Adopt `Input`/`Select` where their APIs fit, while retaining specialized controls and browser semantics. |
| Medium | Dialogs | Booking and cancellation flows implement local modal markup independently. | Evaluate migration to `Dialog` after keyboard focus, escape, backdrop, and cancellation behavior are verified against the current flow. |
| Medium | Shells | Player uses a horizontal header; Staff/Admin uses a sidebar and compact mobile nav. | Keep role-appropriate information architecture but align shared spacing, focus, active states, and mobile testing. |
| Low | Facility selection | Some staff/admin screens use a numeric facility ID field while Booking uses a named catalog select. | Replace with an authoritative facility picker when its data contract is ready. |
| Low | Status semantics | Operational screens contain local status maps and custom badge styles. | Migrate to shared semantic status components after confirming every domain status and label. |

## Refactor guardrails

- Do not change API contracts, role permissions, booking calculations, payment actions, or SignalR subscription behavior as part of visual cleanup.
- Verify each route before and after its component migration.
- Remove legacy CSS only after checking imports and class usage.
- Record any intentional visual changes and validate mobile and desktop widths.
