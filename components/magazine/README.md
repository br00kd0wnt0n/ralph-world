# Magazine — Claw Mechanic Animation Intent

## What it does
When the user hovers over any article card in the grid, an illustrated
robotic claw descends from the top of the viewport. The hovered card
lifts slightly and tilts. A white preview card appears "held" by the
claw, showing the article's issue number, title, and excerpt at a
15-degree tilt.

## Animation sequence
1. **Mouse enters card**: card lifts (y: -40px, rotate: -3deg, 0.3s)
2. **Claw descends**: from y: -200 to y: 0, 0.4s easeOut
3. **Preview card appears**: fades in + rotates to 15deg, 0.35s, 0.15s delay
4. **Mouse leaves card**: everything reverses — claw retracts, card settles

## Duffy asset slots
- Claw illustration: replace the grey placeholder div with SVG.
  Drop-in at `/public/illustrations/claw.svg`.
  The claw sits inside a `fixed` container at top-center of viewport.
- Article thumbnails: each grid card has an aspect-[3/2] placeholder area.

## How to adjust
- All variants in `lib/animation/magazine.ts`
- Claw preview tilt: change `rotate: 15` in `clawPreviewVariants`
- Card lift height: change `y: -40` in `grabbedCardVariants`

## States
- **Resting**: card at normal position, no claw
- **Lifted**: card elevated + tilted, claw descended, preview visible
- Only one card can be in "lifted" state at a time
