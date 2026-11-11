# Frontend Project Audit

## Scope and stack

Audit covers the existing `frontend/` application and its active source, configuration, routes, and shared UI. The stack is React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 3.4, Lucide React, React Hot Toast, Axios, SignalR client, Zustand, and Recharts. The project does not currently use a general-purpose component framework such as MUI or Ant Design.

## Source organization

- `src/page/auth`: login and registration.
- `src/page/user`: public landing, player home, booking, booking history.
- `src/page/admin`: staff home, admin dashboard, reception/check-in, POS.
- `src/layouts`: role-oriented Player and Staff/Admin shell.
- `src/components`: shared business components and visual helpers.
- `src/api`, `src/hooks`, `src/store`, `src/utils`: transport, realtime, session state, and utilities.
- `src/App.tsx`: routes and role guards.
- `src/index.css` and `tailwind.config.js`: global CSS and Tailwind configuration.

## Route and screen inventory

| Route | Access | Screen |
|---|---|---|
| `/` | Public | Landing page and quick search |
| `/login`, `/register` | Public | Authentication |
| `/player` | Player | Player home |
| `/player/booking` | Player | Availability matrix, multi-hour selection, hold/payment flow |
| `/player/my-bookings` | Player | Booking history and cancellation |
| `/staff` | Staff/Admin | Staff home and today's operational stats |
| `/staff/reception` | Staff/Admin | Reception and check-in |
| `/staff/pos` | Staff/Admin | Point of sale |
| `/admin` | Admin | Admin dashboard and system status |
| `/admin/reception`, `/admin/pos` | Admin | Shared staff operational screens |

Social, tournament, profile, pricing, maintenance, reports, and several other navigation destinations are placeholders or absent routes, not complete screens.

## Existing reusable business components

`CourtTimeGrid`, `HoldCountdownTimer`, `useCourtStatus`, `TodayStats`, `SystemStatus`, `AuthShell`, `FormField`, `UserMenu`, and `Brand` already provide reusable domain or layout behavior. Keep these components and their business contracts intact.

## Existing design-system observations

- `index.css` contains global variables, base styling, and animation.
- Tailwind exposes a partial semantic token map, but the palette is incomplete.
- Pages mostly use Tailwind utility classes and sometimes repeat similar button/card/form styles.
- `App.css` contains Vite starter selectors and refers to variables not defined in the current root token set; `main.tsx` imports `index.css`, not `App.css`.
- The HTML document originally used the generic Vite title and English language metadata; the foundation now sets the product title and Vietnamese document language.
- Existing screens have mixed layout patterns and ad hoc status styles.
- Public, Player, and Staff/Admin surfaces share a red/neutral palette but do not yet share a documented component vocabulary.
- Some existing Player Home quick actions still present implemented booking/history routes as “coming soon”; POS uses local sample court, slot, and price values. These are product/UI consistency debt, not changed by this foundation work.

## Foundation changes

This task adds semantic tokens, a small reusable primitive/shared/booking component library, design-system documentation, and frontend agent governance. Existing pages are intentionally not migrated wholesale. No backend, route, auth, booking, payment, POS, or SignalR behavior is changed by the foundation.

## Validation plan

Run TypeScript production build and Oxlint. Inspect representative browser rendering for runtime errors and responsive behavior. These checks do not replace a full keyboard and screen-reader audit.
