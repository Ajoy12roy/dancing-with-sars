---
# Design System — Dancing with the SARs

## Colors (use ONLY these — never introduce a new color)
- paper (background, light mode): #F1F0EC
- paper-dark (background, dark mode): #141618
- ink (primary text, light mode): #1D2023
- ink-dark (primary text, dark mode): #EDEBE6
- text-secondary (light mode): #4A4E52 — solid color, NEVER an opacity value of ink
- text-secondary-dark (dark mode): a solid light grey with equivalent contrast, NOT an opacity value
- accent-teal (survey teal — the ONE primary accent, used for all data values, links, primary buttons): #2C5C61
- accent-rust (annotation rust — ONLY for actual alerts/flagged change, never decorative): #A8462E
- hairline (borders/rules): #C7C4BC

## Typography
- Headings: Source Serif 4 (fallback Georgia, serif)
- Body: Public Sans (fallback system-ui, sans-serif)
- Data/numbers/coordinates ONLY: IBM Plex Mono

## Structural rules
- Border radius: 0–2px maximum, everywhere. No large rounded corners.
- NO box-shadow anywhere. Elevation/separation is done with 1px hairline borders only (#C7C4BC).
- NO gradients anywhere.
- All stat/data values use accent-teal as the single shared color — never a different color per stat (no rainbow/traffic-light coloring). accent-rust is reserved strictly for a genuine alert condition.
- Charts: use only accent-teal (positive/gain values) and accent-rust (negative/loss values) — never default library colors (no default blue/green/red from Recharts or any charting library).
- All text must use the solid color tokens above at full opacity. Never use a Tailwind opacity modifier (e.g. text-opacity-50, /60, /70) on any text color — this has repeatedly caused invisible/low-contrast headings.
- Motion: Framer Motion only (GSAP must not be used or installed anywhere). Keep animations restrained — one orchestrated entrance moment per page, hairline/underline hover states only, no scale or glow effects.
---
