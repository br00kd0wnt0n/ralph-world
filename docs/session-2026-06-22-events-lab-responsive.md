# Session 2026-06-22: Events + Lab Responsive Polish & Background Characters

## Overview
Mobile/responsive polish across the Events and Lab pages, an orange accent
token on the homepage, and a rework of the Events background-character crowd
from a drifting animation to a fixed, evenly-spread bobbing row.

Commits: `8bba609` (events/lab responsive + orange token), `894b8db`
(events background characters).

---

## Events Page — Mobile Layout (`MinglingCharacters` / `EventsClient`)

### Full-planet framing on mobile (< 992)
- The bottom planet was moved **inside** the section (part of the layout, not a
  decoration hanging below) so the content centres evenly between the top and
  bottom planets and reads as one full planet.
- The white content background stops at the bottom planet (`bottom-[270px]`) on
  < 992 so it doesn't bleed through the flipped planet's transparent area;
  fills to the bottom on ≥ 992 where there is no bottom planet.
- 80px gap below the section on mobile (`mb-[80px] min-[992px]:mb-0`).

### Cards & arms by breakpoint
- Card width: `< 576` 260px / `576–767` 360px / `768–991` 460px
  (`MOBILE_CARD_W`).
- Arms 20% bigger on `768–991` (`MOBILE_ARM_LEN` 336 vs 280, breadth 132 vs 110).
- Arm tip anchored exactly 20px into the (centred) card edge at any width via
  `calc(50% - armBase px)` — viewport-independent since card + arm are both
  relative to 50%.

### Interaction / stability
- Arms + cards gated behind a `mounted` flag and faded in (opacity transition),
  so they no longer flash from the SSR desktop layout and animate into place.
- Tapping a card (mobile) slides that event's arm out too; expanded mode pops
  the card to a centred fixed overlay and slides **all** arms off.
- Expanded title capped to `max-w-[calc(100%_-_40px)]` (→ `max-w-none` at ≥ 576)
  so it clears the close button.
- Background scroll locked while an event is open — locks **both**
  `documentElement` and `body` since either can be the scroller.

---

## Lab Carousel — Mobile Layout (`LabGrid` / `LabClient`)

### Full-bleed carousel (< 768)
- Cloud given a fixed `612px` width and clipped at the screen edge
  (`overflow-x-clip`); section + parent side padding removed so the carousel
  crops at the viewport edge. The info text block keeps its own `px-6`.
- One jar visible (`slidesPerView: 1`; `2.2` at ≥ 768).
- Nav arrows pulled to 24px from the screen edge via
  `max(24px, calc(50% - 50vw + 24px))`.
- Character below the bubble + the thought bubbles are hidden < 768.

### Jar sizing / vertical nudges
- Jar width by breakpoint: `< 576` 174px / `≥ 576` 201px.
- Per-range vertical nudges; conveyor + jars raised 30px on `< 576`.

---

## Events Background Characters (`MinglingCharacters`)

Reworked the desktop background crowd (`hidden min-[992px]:block`) from a
random-drift-and-wrap animation to a **fixed, evenly-spread row that bobs in
place**.

- **Fixed x, even spread**: each character holds a fixed x position spread
  evenly from just off the left edge to just off the right (`OVERHANG` 90px)
  using `-OVERHANG + (span / (n - 1)) * i`. No horizontal motion.
- **Bob only**: a vertical sine bob (`±6px`, per-character phase/speed) is the
  only thing that animates per frame.
- **Width read fresh each frame**: `container.offsetWidth` is read at the top of
  each rAF frame (read-before-write, no layout thrash) so the spread is correct
  once layout settles — capturing it once gave a 0-width first frame and bunched
  everyone near the left edge.
- **Image sizing**: auto width (aspect preserved) with a per-character height
  `400 + ((i * 37) % 121)` (400–520px), so taller characters (e.g.
  `event_character_06`) keep their proportions. The wrapper box now matches the
  visible character, so the `scaleX(±1)` facing flip mirrors **in place** —
  previously the half-scale image sat in the left half of a full-width box, so
  flipping odd characters shoved them toward their neighbour and the row read as
  four pairs ("2,2,2,2").
- **Order**: the `CHARACTERS` array is a fixed scramble (05, 02, 08, 01, 06, 03,
  07, 04) so the row isn't in numerical order.
- All "random" values (height, order, bob phase) are **deterministic per index**
  rather than live `Math.random()`, to stay SSR-safe (a runtime shuffle/random
  in render would cause a hydration mismatch).
- Removed the now-unused `CharacterState` interface and the `statesRef`/`rafRef`
  refs.

---

## Homepage
- Magazine section accent now uses `var(--color-ralph-orange)` (#EE6626).

## Assets
- Updated arm + planet-foreground SVGs.

---

## Files Modified
- `components/events/MinglingCharacters.tsx`
- `components/events/EventsClient.tsx`
- `components/lab/LabGrid.tsx`
- `components/lab/LabClient.tsx`
- `components/magazine/MagazineClient.tsx`
- `app/page.tsx`
- assorted `public/imgs/*.svg`
