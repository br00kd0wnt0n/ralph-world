# Magazine — Animation Intent

## Grid cards
- **Default state**: image fills entire cell, no text visible. Tight grid with dark borders.
- **Hover**: yellow dashed border frame appears inside card (inset 8px). Article info (tags, title, excerpt) fades in as overlay at bottom with gradient from transparent to black/90.
- **Click**: opens article overlay.

## Claw mechanic (future — awaiting Duffy asset)
When the claw SVG is delivered:
- Claw descends from above the viewport to the hovered card
- The card gets "grabbed" — lifts up, tilts slightly
- A styled preview card appears held by the claw with article info
- On mouse leave, claw retracts and card settles back

Animation variants are already defined in `lib/animation/magazine.ts`:
- `clawVariants` — descend/retract (y: -200 → 0)
- `grabbedCardVariants` — lift + tilt (y: -40, rotate: -3)
- `clawPreviewVariants` — fade in + rotate 15deg

Drop-in the claw SVG at `/public/illustrations/claw.svg`.

## Cover story
- Pink-tinted section with bordered card layout
- HOT badge top-left of thumbnail
- CTA button: "Sign up to read" (guest) or "Read now" (subscriber)

## Article overlay
- Full-screen overlay, background colour from article's `background_canvas_colour`
- URL updates via pushState to `/magazine/[slug]`
- Escape key or close button closes, back button works
- Guest access gate: content blurs after ~200 words with signup CTA
- BlockRenderer handles 7 block types

## Duffy asset slots
- Reading character: left side of hero
- "Got coin?" character: right side of hero (currently starburst placeholder)
- Claw: `/public/illustrations/claw.svg`
- Article thumbnails: each grid cell
