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

## Brand / Logo exception
1. New color token: navy (brand) = #000E1C. It is used ONLY for the navbar background and the footer strip. It does not replace paper / ink.
2. The logo images in /public/brand/ are protected brand assets. They contain gradients and glow by design. Never edit, recolor, re-encode, crop, add CSS filters/shadows/glow to them.
3. The "no gradient / no box-shadow / no glow" rules apply to UI elements only, not to the logo image files.
4. Navbar text color on navy: #EAF3FB (solid, no opacity modifiers). Navbar link hover/active color: #7FD6E3 (solid).
5. Motion exception: navbar links may use a Framer Motion "flip" hover (text rolls vertically to a duplicate label). This is the ONLY allowed hover motion that is not an underline. The logo satellite orbit is the ONLY continuous animation, and it must stop when prefers-reduced-motion is set.
6. Navbar font: Public Sans, weight 600 (semi-bold). No other font.

## Data panel & change-visualization exception
1. Panel border: 2.5px solid #2C5C61 (teal) in light mode, 2.5px solid #5FA3AB in dark mode. Panel header strip: 1px bottom rule in hairline #C7C4BC. Panel padding 20px. Radius 0-2px. Still NO box-shadow, NO glow, NO gradient.
2. Comparison line color: solid #0077CC (blue), 3px wide, with a 1px solid #FFFFFF casing on each side (not a shadow) so it is visible on both dark and bright SAR pixels. No glow.
3. Change-detection overlay: "change red" token #D7301F, used ONLY for changed pixels and their legend swatch. accent-rust #A8462E remains for text alerts.
4. Footer text: solid colors only at full opacity, minimum 14px for links and 13px for legal text, no Tailwind opacity modifiers.
---
