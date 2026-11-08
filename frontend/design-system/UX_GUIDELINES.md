# UX Guidelines

## Navigation

- Preserve the current React Router routes and role guards.
- A navigation item must lead to a working route or be clearly marked as unavailable; do not imply a placeholder is a completed feature.
- Preserve intended return paths through authentication.
- Indicate the active location and maintain keyboard-accessible navigation.

## Forms

- Provide a visible label for every control; placeholders are examples, not labels.
- Keep validation close to its field and connect errors with `aria-describedby` / `aria-invalid`.
- Explain disabled states when the reason is not obvious.
- Set a pending state and prevent duplicate submission; report errors rather than silently ignoring them.
- Preserve form values after recoverable errors.

## Booking and payment

- Preserve established booking rules, server values, hold expiration, and SignalR behavior.
- Communicate slot status through text and accessible names in addition to color.
- Make the selected date, facility, sport, court, duration, and total visible before a hold/payment action.
- Never infer or recalculate business prices in presentational components.
- Keep the server-provided hold expiry as the countdown source.

## Responsive behavior

- Start with a narrow layout and progressively enhance at Tailwind breakpoints.
- Keep actions usable with touch and keyboard; do not make hover the only way to reveal information.
- Test at mobile width and a desktop width.
- For wide data tables or time grids, make horizontal scrolling deliberate and keep row/column headers available.

## Accessibility and feedback

- Use semantic headings in order and native controls where possible.
- Provide visible focus, meaningful labels, `role="status"` for loading, and `role="alert"` for actionable errors.
- Do not rely on color alone.
- Respect reduced motion.
- Use toast for brief completion feedback, not as the only place to expose critical errors or persistent state.
