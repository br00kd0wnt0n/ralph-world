# PlanetSection — Animation Intent

## What it does
Each homepage section has a planet illustration that floats with a parallax
effect as the user scrolls. The entire section fades + slides up when it
enters the viewport. Hovering (desktop) or tapping (mobile) the planet
triggers a flyout card with content previews.

## Animations
- **Section reveal**: fades from opacity 0 → 1, translateY 60px → 0, 0.7s easeOut.
  Triggered once when the section crosses 10% into the viewport. Stays visible.
- **Planet parallax**: planet moves at 30% of scroll speed (lags behind),
  creating depth. Uses `useParallax(0.3)` hook → inline translateY.
- **Flyout card**: scales from 0.95 → 1 + fades in, 0.4s on enter.
  Reverse on exit (0.25s). Uses AnimatePresence for mount/unmount.

## Duffy asset slots
- Planet illustration: replace the placeholder circle div with an SVG.
  Drop-in as `illustration` prop (React component) — renders inside the
  parallax container at the same size (w-64 h-64 on desktop).
- Each flyout item card has a thumbnail placeholder (w-full h-20 bg area).

## How to adjust
- All variants are in `lib/animation/homepage.ts` — edit there, not inline.
- Parallax factor: change `PLANET_PARALLAX_FACTOR` in the same file.
- Flyout card colours come from `accentColor` prop per section.
