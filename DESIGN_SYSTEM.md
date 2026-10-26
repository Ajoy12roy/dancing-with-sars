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
1. New color token: navy (brand) = #000E1C. It is used ONLY for the navbar background (the footer now follows the theme). It does not replace paper / ink.
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

## Dark mode
Theme mechanism rule: theme is set by data-theme="light|dark" on <html>, all colors come from CSS variables, never hard-coded hex in components.

Dark mode tokens (solid colors only, never opacity modifiers on text):
- bg: #090C12
- surface (cards/panels): #0E131B
- surface-2: #141B26
- border: #1F2A38; panel border (data panels): 1.5px solid #1F8F55
- text: #E8EDF2; text-secondary: #8F99A3; text-small (footer/legal, min contrast): #B4BDC7
- accent (replaces teal in dark mode for data values, links, primary buttons): #19E66F; text on accent: #090B11; accent hover: #4CF094
- change red (dark): #FF5A47; comparison line (dark): #2F9BFF with 1px #FFFFFF casing
- navbar (dark): #0B1624 with a 1px bottom border #1E3045. It must be visibly different from bg. Light-mode navbar stays #000E1C.
- Light mode tokens stay exactly as they are today.

## Hero exception
Hero exception (homepage first section only):
- Title/hero text uses Public Sans weight 700 (sans) instead of Source Serif 4.
- In DARK mode only, the hero may use a CSS radial-gradient "Earth arc" background and tiny accent-colored star dots. No glow or box-shadow on buttons or text.
- Light mode hero keeps the current background and colors.

## Hero primary button exception
1. Only the homepage hero primary button ("Explore Now") may: use a box-shadow ring as its outline, change its border-radius from a pill (100px) to 12px on hover, scale to 0.95 while pressed, and animate a filled circle that grows from the center on hover. No other element may use these effects.
2. Colors: light mode accent = the existing teal accent token, text on fill = the existing paper/page background token. Dark mode accent = #19E66F, text on fill = #090B11. No glow, no gradient.
3. All its animations are disabled under prefers-reduced-motion (the color change still happens, the movement does not).

## Footer v2
1. Light mode footer: background = the existing light surface token that differs from the page background (if none exists use the paper color), 1px top border in the existing hairline color. Headings = ink; links and secondary text = the existing secondary text color; link hover = the existing teal accent. No new colors.
2. Dark mode footer: background #0C0E15, 1px top border #1A1F29, column headings #F9FAFB (Public Sans 600, 16px), links and secondary text #A3ABB5 (14-15px, solid), link hover #19E66F, bottom bar rule #1A1F29. No opacity modifiers on text.
3. Layout: 4 columns (brand column wider), then a full-width rule, then a bottom bar: copyright left, legal links right. Responsive: 2 columns below 1024px, 1 column below 640px; bottom bar stacks.
4. Logo in the footer uses TerraPulseLogo with tone="auto": it shows public/brand/terrapulse-wordmark-light.png in light mode and public/brand/terrapulse-wordmark.png in dark mode. Never recolor the logo with CSS filters.
5. No box shadow, no gradient, no glow. Hover on links = solid color change only.
---

