# Events — Handoff Contract for Josh

## Duffy asset slots

**CrowdBackground** — pass `illustration` prop (React component) to drop in Duffy's crowd SVG.
Currently renders a placeholder gradient. The illustration fills the entire 60vh container.

**EventCreature** — pass `illustration` prop to replace the arm + wristband placeholder.
Each creature is positioned absolutely at `creature_x`% / `creature_y`% (from DB).
The container already handles the position, so the illustration just needs to render the creature visual.

**EventsHero** — decorative placeholders (planet left, satellite right, globe bottom-left)
are simple circles now. Replace with Duffy SVGs once delivered.

**PastEvents** — card thumbnails use `event.thumbnail_url` from DB. Placeholder grey box when absent.

## Animations
All variants in `lib/animation/events.ts`:
- `creatureVariants` — gentle bob (y: 0 → -4 → 0, 2.5s loop)
- `flyoutVariants` — fade + scale on stage changes
- `pastEventVariants` — fade up on scroll reveal
- `CROWD_PARALLAX_FACTOR = -0.3` — scene moves OPPOSITE to mouse (scene x = mouse x × -0.3)

## Parallax
`CrowdBackground` tracks mouse via Framer Motion `useMotionValue`, smoothed with `useSpring` (damping 30, stiffness 100). The parallax scene container moves inversely to mouse position — creating depth. Creatures sit above the parallax layer and stay fixed.

## Flyout state machine
```
hover/click creature → selectedId set → stage: 'minimal'
  minimal → click "Show me more" → stage: 'expanded'
    expanded → click "Show me more" → stage: 'full'
      full → click "Get tickets" (logged in) → opens external_ticket_url
      full → click "Subscribe for ticket access" (guest) → subscribe modal
      full → click X / Escape / backdrop → close
```

Stages 1 and 2 anchor to creature position on the page.
Stage 3 is a centered modal with a backdrop.

## RSVP flow
- `event_rsvps` table exists in schema but NOT wired in MVP
- Tickets handled externally via `external_ticket_url` (new tab)
- Guests get subscribe modal (free tier CTA) instead of ticket link
