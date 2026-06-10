# Lab Page Redesign

## Overview

The `/lab` route has been redesigned from a slot-machine ("Ralph-O-Matic") experience into a **scroll-anchored carousel** of bell-jar experiments, accompanied by a character that lives outside the page flow and "thinks" toward a cloud of products. The redesign also introduces a new section heading, a reusable filled-button variant, and a more consistent cookie banner.

---

## Lab Page Structure

### Before

- `RalphOMatic` slot-machine UI with a lever, spinning items, and a settled selection
- Items chosen randomly on lever pull, opening the external URL in a new tab
- No section intro — the lab section animated in without a heading

### After

- **`SectionIntro`** heading + intro lines at the top of the section (matches other planet sections)
- **`LabGrid`** carousel below — a horizontal Swiper of experiment "bell jars"
- **Lab character** portalled to `<body>`, pinned to the bottom-left of the viewport
- **Thought-bubble trail** of three circles linking the character's forehead to the cloud above the active jar
- Character + bubbles scroll-track in real time (rAF-batched, transform-only)

---

## `LabGrid.tsx` — the carousel

### Bell-jar slides

Each lab item renders as a **bell jar** built from layered SVGs:

| Layer            | Source                | Purpose                                                      |
| ---------------- | --------------------- | ------------------------------------------------------------ |
| Jar illustration | `bell-jar.svg`        | White glass + black outline + base, sits on top              |
| Thumbnail mask   | `jar-mask.svg`        | CSS `mask-image` clips the experiment thumbnail to the glass |
| Thumbnail        | `item.thumbnailUrl`   | Experiment artwork, masked to the jar's interior             |

`JAR_GLASS` constants (`top`, `left`, `width`, `height`) position the masked thumbnail inside the jar's glass dome.

### Carousel mechanics

- Uses `swiper/react` (`Swiper` + `SwiperSlide`)
- `swiperRef` exposes the imperative `slidePrev` / `slideNext` API
- `activeIndex` state tracks the current slide so the cloud, bubbles, and copy stay in sync
- Carousel nav buttons styled to match the **home-page planet panels**:
  - 30×30, square corners, `bg-black text-white` with `hover:bg-black/80`
  - Positioned at `left: 1` / `right: 1` (just inside the carousel edge)
  - Same chevron SVG as the planet panel buttons

### Character (portalled, scroll-anchored)

The character is rendered via `createPortal(..., document.body)` so it escapes the `<main>` stacking context and can paint over the footer.

| Constant               | Value     | Meaning                                                      |
| ---------------------- | --------- | ------------------------------------------------------------ |
| `CHARACTER_WIDTH`      | `412`     | Intrinsic width of `labs-character.svg`                      |
| `CHARACTER_OFFSET_X`   | `-440`    | X offset from viewport centre at **full scroll** (rest)      |
| `CHARACTER_TOP_SHIFT`  | `-150`    | Extra leftward shift when **at the top** of scroll           |
| `FOREHEAD_X`           | `175`     | Horizontal anchor of the forehead, relative to character's left edge |
| `FOREHEAD_FROM_BOTTOM` | `300`     | Vertical anchor of the forehead, measured up from viewport bottom |

The scroll handler interpolates the character's X linearly between `CHARACTER_OFFSET_X + CHARACTER_TOP_SHIFT` (at the top) and `CHARACTER_OFFSET_X` (at full scroll), then applies the same offset to the forehead position used by the thought-bubble trail. Result: the character drifts ~150px to the right as you scroll down, and the bubbles follow.

### Thought-bubble trail

Three circles interpolated along the line from the character's forehead to a fixed anchor on the cloud (`CLOUD_ANCHOR_X`, `CLOUD_ANCHOR_Y`).

```ts
const BUBBLES = [
  { t: 0.32, d: 22, dx: 0,   dy: 0 },
  { t: 0.58, d: 34, dx: 0,   dy: 0 },
  { t: 0.82, d: 51, dx: -90, dy: 0 },
]
```

- `t` is the position along the forehead→cloud line (0 = forehead, 1 = cloud)
- `d` is the diameter
- `dx` / `dy` are per-circle nudges
- The middle circle is recomputed to sit exactly between the outer two, then nudged

Scroll down → cloud rises → wide gap → circles spread out. Scroll up → cloud descends → bubbles bunch closer to the forehead.

---

## `LabClient.tsx`

- Removed `RalphOMatic` + all lever-pull / spin state
- Removed unused `useCallback`, `SPIN_DURATION_MS`, `isSafeUrl`, `MachineState` imports
- Added `SectionIntro` ("Come up to the lab")
- Switched motion variants from `*NoIntro*` to the standard `sectionBgVariants` / `sectionContentVariants` (intro now exists)
- Reduced the content layer's top padding from `200px` to `60px` since the intro provides its own height

---

## `SectionIntro.tsx`

Swapped the lab title image:

```diff
- lab: { src: '/imgs/title_lab.png', w: 202, h: 116 },
+ lab: { src: '/imgs/text-come-up-to-the-lab.svg', w: 623, h: 105, maxWidth: 520 },
```

The new SVG is the hand-drawn **"Come up to the lab"** wordmark and matches the type treatment used by the other section intros.

---

## `Button.tsx` — new `filled` variant

Added a `filled?: boolean` prop to the shared `Button` component:

```tsx
filled?: boolean
// If true, the button fills ralph-pink with white text. Border + shadow
// stay black (unless `pink` is also set) — a solid pink button rather
// than a pink-outlined white one.
```

When `filled` is true the button sets `backgroundColor: RALPH_PINK` and `color: white`. This lets callers get a solid-pink CTA without bespoke styling.

---

## `CookieBanner.tsx` — uses the shared Button

Replaced the two ad-hoc `<button>` elements with the shared `Button` component:

- **Necessary only** → default `Button` style
- **Accept all** → `<Button … filled />` (uses the new prop)

Layout switched to right-aligned (`sm:justify-end`) with a slightly larger gap (`gap-4`).

---

## New Assets

Added to `public/imgs/`:

- `bell-jar.svg` — jar illustration (white glass + outline + base)
- `jar-mask.svg` — mask used to clip experiment thumbnails to the jar interior
- `conveyor-belt.svg` — supporting illustration for the lab section
- `labs-character.svg` — the character rendered via portal at the bottom-left
- `labs-cloud.svg` + `labs-cloud-mask.svg` + `labs-cloud_overlay.png` — the cloud above the active jar (thought-bubble trail target)
- `text-come-up-to-the-lab.svg` — new section-intro wordmark

---

## Files Changed

| File                                 | Change                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| `components/lab/LabClient.tsx`       | Replaced slot-machine with carousel + section intro             |
| `components/lab/LabGrid.tsx`         | Full rewrite: Swiper carousel, bell jars, portalled character, scroll-driven bubble trail |
| `components/layout/SectionIntro.tsx` | Swap lab title image to SVG wordmark                            |
| `components/ui/Button.tsx`           | Add `filled` prop for solid pink fill                           |
| `components/legal/CookieBanner.tsx`  | Use shared `Button` (incl. `filled`) instead of ad-hoc buttons  |
| `public/imgs/*` (8 new assets)       | Bell jar, mask, character, clouds, conveyor belt, lab wordmark  |
