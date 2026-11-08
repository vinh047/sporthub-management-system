# Motion

Use motion to confirm an interaction, not decorate the interface. Prefer short color, opacity, or transform transitions within the `--duration-fast` and `--duration-normal` tokens. Avoid parallax, continuous decorative motion, and layout-shifting animations.

The global stylesheet disables or minimizes animation and transition durations when `prefers-reduced-motion: reduce` is enabled. Countdown timers and realtime state must remain understandable without animation.
