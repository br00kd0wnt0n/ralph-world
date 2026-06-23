# Canvas / sprite animation system

A small frame-animation system for the site: a central sequencer (one rAF for
the whole page), declarative sprite-sheet "scripts", a DOM sprite component,
and a full-screen canvas stage for free-moving / scroll-aware sprites.

---

## Pieces

| File | Role |
| ---- | ---- |
| `lib/anim/sequencer.ts` | Central loop — ONE `requestAnimationFrame` drives everything |
| `lib/anim/animations.ts` | Registry of sprite sheets (the "scripts") |
| `components/anim/SpriteAnimation.tsx` | DOM sprite (single element, CSS `background-position` step) |
| `components/anim/CanvasStage.tsx` | Full-viewport canvas overlay hosting moving sprites |
| `scripts/build-sprite-sheet.mjs` | Packs a folder of frames (SVG/PNG) into a sheet |

### Why central
With many animations on screen, one rAF per sprite (or React state ticking at
60fps) is a re-render/loop storm. The sequencer owns the single loop and offers
two subscription kinds:

- **`register(spec)`** — frame-index anim. Notified (`onFrame(i)`) **only when
  its frame index changes** → cheap; used by the DOM `SpriteAnimation` (a 6fps
  blink costs ~6 DOM writes/sec, GPU-composited).
- **`registerTicker(fn)`** — per-frame callback `(dt, elapsed)` for things that
  update every frame (the canvas stage: move + redraw).

It pauses on `visibilitychange` (hidden tab) and resumes without time jumps.

---

## Sprite sheets

`scripts/build-sprite-sheet.mjs <inputDir> <outFile.png>` packs a folder of
frames into a **single horizontal row**:

- Sorts by the trailing number in the filename (`frame_1 … frame_10`).
- Rasterises SVGs (via `sharp` → librsvg) and reads PNGs as-is.
- Pads each frame into a uniform cell sized to the largest frame, anchored
  **bottom-centre** (so trimmed exports of differing bounding boxes line up).

Current sheets (in `public/animations/`):

| Sheet | Source folder | Cell | Frames | fps |
| ----- | ------------- | ---- | ------ | --- |
| `bouncing-alien.png` | `bouncing-alien/` (PNG) | 255×442 | 14 | 14 |
| `exhaust.png` | `exhaust/` (SVG) | 230×350 | 10 | 18 |
| `satellite.png` | `satelite/` (PNG) | 376×282 | 28 | 16 |

Register a sheet in `lib/anim/animations.ts` to reference it by name:

```ts
export const ANIMATIONS = {
  'bouncing-alien': { src: '/animations/bouncing-alien.png', frameW: 255, frameH: 442, count: 14, fps: 14 },
  // …
} satisfies Record<string, SpriteSheet>
```

---

## `SpriteAnimation` (DOM)

One element, stepped via CSS `background-position` (background-size set to
`count×100%`). The sequencer mutates `background-position-x` imperatively — no
per-frame React render. Responsive: set `width`, height follows the frame
aspect. Props: `name`, `fps?`, `durations?`, `offset?`, `mode?` (loop / once /
pingpong). Use for sprites anchored in document flow / low count.

---

## `CanvasStage` (canvas overlay)

A `position: fixed`, full-viewport, `pointer-events:none`, **DPR-aware** canvas
mounted once (currently on the homepage). It hosts every moving actor and draws
them off the shared ticker. Two actors today:

### Alien squad
A looping choreography:

1. **enter** — a random **3–7** aliens rise up from just below the screen
   (`easeOutCubic`), clustered but spread (`dx` step ~120–165px), each a
   slightly different size and tilt.
2. **drift** — they dart left/right; each has its own sway speed (`driftW`) and
   amplitude (around `DRIFT_AMP`) so it looks frantic, not uniform.
3. **charge** — exhaust ignites beneath each (staggered per-alien by
   `exhaustDelay`, 0–1s) and fires for `CHARGE_MS` (1.5s) before liftoff.
4. **blast** — they accelerate up off the top of the screen (staggered
   `igniteDelay`).
5. **hidden** — gone for a random gap, then respawn in the lower section.

Timing: first appearance after **1–5 min** (`START_MIN/MAX`), then **3–5 min**
between appearances (`HIDDEN_MIN/MAX`). All feel constants live at the top of
the file. A small per-alien random **rotation** (`ROT_MIN…ROT_MAX`, biased
slightly right) keeps them from all leaning the same way; the alien and its
exhaust rotate together about the alien's centre.

### Satellite
One craft crossing **left → right** at random intervals (`SAT_GAP_*`) at a
**different height** each pass. It's anchored in **document space** (`worldY`,
drawn at `worldY − scrollY`), so it scrolls out of view rather than sticking to
the viewport.

### Eyed-alien
Sits on the footer planet (anchored to `#footer-planet` in document space). It
does **not** cycle its frames in sequence — `updateEyed` holds the current frame
for a randomised spell (`rand(175, 800)` ms) then jumps to a random **different**
frame, so its eyes glance around at random. Sheet rebuilt to **6 frames** (the
source folder has `eye-eye_0..4, 6` — no frame 5).

### DEBUG
`const DEBUG = true` at the top of `CanvasStage.tsx` shortcuts the long
start/hidden delays (start ~1–2.5s, gap ~3–6s) for tuning. **Leave it `false`
in production.**

---

## Coordinate model (canvas)

- The canvas stays viewport-sized (never doc-height — browsers cap canvas size
  and it wastes memory).
- World-space sprites store a `worldY` and draw at `worldY − window.scrollY`
  (a camera), so scroll pans over them; off-screen sprites are culled.
- Screen-space actors (the alien squad's choreography) use viewport coords
  directly.

---

## Performance notes / choices

- DOM `SpriteAnimation` is leanest for **few, mostly-static** frame loops (only
  touches the DOM on frame change).
- Canvas is better for **many / moving** sprites (one element, no per-sprite
  layout/compositing; redraw cost scales with draw calls).
- Sheets keep art as one decode + GPU `drawImage`; SVG kept for the static /
  simple cases elsewhere in the app.

---

## Three canvases (depth layers)

The system now spans **three** full-viewport canvases, all driven by the one
shared sequencer (still a single rAF). Each sits at a different z so sprites
land at the right depth relative to page content:

| Canvas | z | Mounted | Renders |
| ------ | - | ------- | ------- |
| `MidgroundCanvas` | `z-[1]` (behind content) | `layout.tsx` (global) | moon + planet (static parallax), satellite + chaser (flyers) |
| `ForegroundCanvas` | `z-20` (in front of content) | `layout.tsx` (global) | scroll-anchored animated saucer |
| `CanvasStage` | `z-40` (above footer, portalled to `<body>`) | homepage | alien squad, eyed-alien (footer planet), saucer dogfight |

All three are `cosy-dynamics` + desktop only (matching the old parallax layers),
except `CanvasStage`, which runs on the homepage regardless of theme.

### MidgroundCanvas (`components/anim/MidgroundCanvas.tsx`)
Replaced the DOM `MidgroundLayer` (now deleted). Parallax via
`worldY − scrollY × parallax`. Three item kinds:
- **STATIC_ITEMS** — plain images pinned at a doc position (moon, planet).
- **FLYERS** — animated sheets that cross the screen at random intervals:
  - `satellite` — fast (0.3 px/ms), slow continuous z-tumble (`spin`), random
    start orientation, infrequent (25–55s gaps).
  - `chaser` — replaces the old `item_mid_spaceship`; level flight (upright),
    horizontal flip (`flipX`), gentle `wobble` tilt, random per-crossing speed.
- Flyer config knobs: `speed`/`speedMax`, `dir`, `flipX`, `fps`, `spin`,
  `wobble`, `parallax`, gap + band + first-appearance ranges.

### ForegroundCanvas (`components/anim/ForegroundCanvas.tsx`)
Scroll-anchored **animated** props (a sheet pinned at a doc position that plays
in place and parallaxes). Replaced the static `item_front_spaceship.png` with a
spinning `saucer`. (`item_front_alienrocket.png` is hidden on the homepage via a
pathname filter in `ForegroundLayer`.)

### Saucer show (`lib/anim/saucerShow.ts`)
A self-contained factory the top `CanvasStage` drives (`update`/`draw`):
- **Solo** (~65%): enter from a random side/bottom → hover + bob → (70%) a 360
  spin with `easeOutBack` → fly off. Slow idle spin throughout.
- **Fight** (~35%): a 2nd saucer enters ~1.4s later; both roam (random
  waypoints) and fire **bullets** on a cooldown; after 5–9s one is hit → the
  **explosion** sheet plays where it was and the survivor leaves.
- Per-saucer `scale` (distinct sizes in a fight) and velocity-based **z-tilt**
  banking. Hit timing is scripted (timer), not literal bullet collision.
- Pacing: first show ~4–9s after load, then ~18–40s gaps.

---

## Related homepage / page tweaks (same change set)

- **Starfield** — `isSubpage = pathname !== '/'`: all subpages use the
  events-style star motion (horizontal drift, no vertical scroll-parallax); the
  homepage keeps scroll-parallax. Re-runs on navigation.
- **PlanetSection** — the planet's `z-10` flex container was full-width and
  intercepted hover over the title; made it `pointer-events-none` with the
  planet wrapper interactive, so hovering the **title/subtext** also opens the
  panel. Also: the panel `clip-path` transition is gated until after the first
  painted frame (`transitionsOn`) to stop the flash of narrow panels on load.
- **FooterPlanet** — got an `id="footer-planet"` anchor so `CanvasStage` can pin
  the eyed-alien to it (document space).
- **Magazine** — a spinning `got-coin` (`SpriteAnimation`) on the planet's top
  curve at a 16° angle. Anchored to the section **centre** with a fixed offset so
  it stays on the curve regardless of viewport width: `translateX(200px)` at
  ≥768, `100px` below 768, and hidden entirely `< 576`. Content top-padding steps
  by breakpoint (90 / 130 / 170px at `<576` / `576–767` / `≥768`). Sheet rebuilt
  to 9 frames (source folder frames `got-coin_0..8`, cell 398×454).
- **ScrollIndicator** — `scroll-arrow.svg` with a gentle up/down bob (Framer
  Motion) + pink Roboto "SCROLL".

### New assets / sheets
`saucer`, `got-coin`, `eyed-alien`, `chaser`, `bullet`, `explosion` sprite
sheets (built from `public/animations/<name>/` via `scripts/build-sprite-sheet.mjs`),
plus `public/imgs/scroll-arrow.svg`.
