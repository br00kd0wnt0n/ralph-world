# Session 2026-05-23: TV rebuild, events expanded panel, shop polish, nav z-restructure

## Overview

Five streams of work this session:

1. **Docs refresh** — `CLAUDE.md` brought up to date with all post-April-17
   work; May sessions rolled up into `changelog.md`.
2. **Ralph TV redesign** — the CSS-built TV bezel replaced with the
   `tv_set_cropped.svg` graphic, ground added, side control panel with
   image-based buttons, SFX on toggle, custom volume slider built from
   three SVGs with a CSS mask. Everything inside the panel scales with
   the panel width via CSS container queries.
3. **Shop page** — proper shop planet SVGs wired in (no longer borrowing
   the TV planet), a new SVG title swapped in for the raster placeholder,
   category-filter underline replaced with the nav-style line graphic,
   and content top-padding tightened from 200 → 120px.
4. **Events page expanded panel** — clicking "Show me more" now opens an
   in-page expanded 2-column event view with the URL updating to
   `/events/[slug]` (no soft navigation). The other hands drop off-screen,
   the active hand centres and nudges down 50px, the panel grows into a
   side-by-side title/copy + poster layout. Direct visits to
   `/events/[slug]` open the same expanded state.
5. **Nav z-index restructure** — Theme + Language dropdowns were
   rendering behind the main nav. The utility bar now sits above the nav
   row z-wise, and `pointer-events` are organised so the bar's empty
   space doesn't block clicks on nav links underneath.

---

## 1. Docs refresh

[CLAUDE.md](../CLAUDE.md) had been stuck at the 2026-04-17 session goal
for ~5 weeks. Refreshed it without dropping any content that's still
valid:

- **Session goal** updated to the 2026-05 visual pass.
- **Foundation documents** list now includes a pointer to `docs/`.
- **Key files** reorganised into sections (Core/data, Layout/chrome,
  Parallax/visuals, Shared UI, Pages, API). Added entries for everything
  shipped between April 17 and now: `Starfield`, `MidgroundLayer`,
  `ForegroundLayer`, `PinkDropdown`, `PageTransitionWrapper`, `PageNav`,
  `SectionIntro`, `Globe`, `CanvasBackground`, `PlanetPreloader`, the
  shared `Button`, the new pages (`/magazine/[slug]`, `/join-ralph`,
  `/work-with-us`), and additional API routes (`profile/theme`,
  `account/upgrade`, `webhooks/shopify`).
- **Theme system** block updated with the new brand palette
  (`#EA128B` etc.) and a note on the RALPH WORLD iframe interim.
- **New convention sections** added:
  - Typography (Roboto + Gooper Trial + the `text-*` utilities)
  - Parallax depth layers
  - Page transitions (Frozen Router)
  - Layered planet decoration pattern
  - Shared dropdown shell

[changelog.md](../changelog.md) — added seven new entries above the
2026-04-17 block, each pointing at the relevant writeup in `docs/`:

- 2026-05-16 — Events arms interaction + nav hysteresis + planet exits
- 2026-05-13 — Header & nav reskin + Events arms scaffold + `/play` → `/work-with-us` rename
- 2026-05-10 — Article overlay redesign + `/join-ralph` carousel + Work With Us parallax
- 2026-05 mid — Nav + dropdown redesign + layered planet pattern
- 2026-05 mid — Page transitions (Frozen Router)
- 2026-05 mid — Homepage parallax overhaul + brand colour update
- 2026-05 mid — Magazine page redesign

---

## 2. Ralph TV — graphic rebuild

### 2.1 Replaced CSS bezel with SVG chrome

File: [components/tv/TVSet.tsx](../components/tv/TVSet.tsx)

The previous TV was a hand-built `bg-surface` container with three
coloured-dot knobs, an aspect-`4/3` screen, a separate `TVControls`
panel beside it, and a `R A L P H` label at the bottom. All of that is
gone.

The new structure is a single `aspectRatio: '976.297 / 676.934'`
container holding two layers:

| Layer | Element | Notes |
|---|---|---|
| Behind | Live screen `<div>` | Sized to the SVG's screen cutout: `left 9.3% / top 14% / width 63.9% / height 69.6%`. Holds the existing LivePlayer / SubscribeGate / OFFLINE GIF / Teletext overlays unchanged. |
| Front | `tv_set_cropped.svg` | Sits on top with `pointer-events-none` so screen interactions pass through. The painted bezel frames the live screen, and the right ~27% is the speaker/control decoration zone. |

The cutout coordinates were derived by parsing the screen sub-path in
the SVG's `d` attribute (single-path SVG using fill-rule nonzero to
create the screen hole). The hole maps to roughly 9.3%–73% horizontally
and 14%–84% vertically of the 976.297 × 676.934 viewBox.

**Alien + robot character placeholders removed.** Outer wrapper is now
`flex-col items-center max-w-5xl mx-auto` so the TV is centred without
side companions.

### 2.2 Ground decoration

Added `tv_set_ground.svg` behind the TV chrome as the visual base the
set "sits on". Positioned absolute inside the aspect-ratio container,
**before** the chrome in DOM order so it paints underneath:

```tsx
style={{ bottom: '-5.5%', width: '124%', maxWidth: 'none' }}
```

`maxWidth: 'none'` is needed because Tailwind/inherited `max-w-*`
classes would otherwise cap the image; explicit `none` lets the 124%
width through. The ground's viewBox (1198.409 × 117.598) is wider than
the TV's (976.297) so the ground overhangs the TV's left/right edges.

> **Note on global clip.** [app/globals.css](../app/globals.css) sets
> `html, body { overflow-x: hidden }`. On viewports that are roughly
> equal to the TV's max-width, the ground appears clipped at viewport
> edge — there's no room beside the TV for the overhang to be visible.

### 2.3 Section spacing (RalphTVClient)

File: [components/tv/RalphTVClient.tsx](../components/tv/RalphTVClient.tsx)

- Removed the `paddingTop: 200` from the content layer (the
  "overflow-content-up-over-the-planet" inset is no longer needed —
  the TV sits naturally below the planet).
- Added `marginTop: 32` on the `<section>` so the whole block (planet +
  content) drops 32px down from the page top.
- Planet decoration band shifted down an additional 12px (`marginTop:
  12` on the 270px planet wrapper), and the white fill below now starts
  at `top: 282` (was 270) so it stays flush with the planet's new
  bottom edge. Content layer is unaffected.

### 2.4 Side panel — `tv_panel_cropped.svg`

A second SVG (`tv_panel_cropped.svg`, viewBox 169×380) sits inside the
TV chrome's right-hand decorative zone — a separate control surface
overlaid on top of the painted speakers.

Positioning:

```tsx
style={{ right: '2%', top: '5.4%', width: '17.3%' }}
```

The panel's outermost div is also a **CSS container query host** via
`[container-type:inline-size]`. Everything inside the panel uses `cqi`
units, so the buttons / labels / volume slider scale together as the
panel scales.

### 2.5 Image-based toggle buttons (Show info / Schedule / Fullscreen)

Inside the panel, three buttons stacked in a column:

```tsx
<div className="absolute flex flex-col gap-3" style={{ left: '7%', top: '20%' }}>
  ...buttons
</div>
```

Each button row is `[button image] [label]`:

| Element | Spec |
|---|---|
| Button image — off state | `tv_button_off.svg` (viewBox 42.136 × 38.503) |
| Button image — on state | `tv_button_on.svg` (viewBox 27.52 × 30.954) |
| Image sizing | `width: 27.2cqi`, `height: 24.85cqi` (= 46×42 viewBox units of panel width). Same size box for both states so the label doesn't shift when toggling. |
| Image fit | `object-contain object-left` — the smaller "on" image stays left-anchored inside the box so it appears to be "pressed in" the same socket. |
| Label font | Gooper Trial 700, `font-size: 9cqi`, `line-height: 1.1875`, letter-spacing 0, black. The 9cqi value matches the original 16px design spec at typical panel render sizes. |
| Label content | Mixed case: "Show info", "Schedule", "Fullscreen" — not uppercase. |

> Browser synthesises the 700 weight because only Gooper Trial
> SemiBold (600) is loaded. Same trick the existing `.text-header-btn`
> utility uses. If a real 700 cut is added later, drop in a second
> `@font-face` declaration in [globals.css](../app/globals.css).

#### Button state mapping

- **Show info button**: `on` when `overlay === 'show-info'`
- **Schedule button**: `on` when `overlay === 'schedule'`
- **Fullscreen button**: `on` when `document.fullscreenElement` is set.
  Tracked via React state (`isFullscreen`) + a `fullscreenchange` event
  listener so the button also flips back to `off` when the user exits
  fullscreen via Esc or browser chrome.

#### SFX

Two preloaded `<audio>` clips:

```tsx
sfxOn.current  = new Audio('/sfx/tv_button_on.m4a')
sfxOff.current = new Audio('/sfx/tv_button_off.m4a')
```

`audio.currentTime = 0` before each play so rapid toggles always start
from the top; `.play().catch(() => {})` silently swallows autoplay
rejections. M4A used (AAC-in-MP4) — modern browser coverage is the
same as MP3.

Each click plays the matching clip:
- Show info / Schedule: `on` when activating, `off` when deactivating
- Fullscreen: reads `isFullscreen` to pick the right clip

### 2.6 Custom volume slider — 3 SVGs + CSS mask

Three assets:
- `tv_volume_meter.svg` (33.882 × 111.022) — the housing
- `tv_volume_switch.svg` (38.308 × 26.619) — the knob, wider than the meter
- `tv_volume_bar.svg` (8.443 × 104.545) — the inner indicator shape

Layering inside a meter-sized wrapper (`width: 20.05cqi`,
`height: 65.69cqi`, positioned `left: 50% / top: 60%` in the panel):

| z | Element | Notes |
|---|---|---|
| bottom | Black volume fill `<div>` | `bottom: 0`, height grows from 0 to 100% as volume increases. |
| mid | Bar mask wrapper | Sized to the bar's natural proportion of the meter (24.92% wide × 94.17% tall), positioned with `left: 51%` (tweaked 1% off-centre to remove a sub-pixel sliver), width expanded by `+2px` to cover sub-pixel edges. **`mask-image: url(tv_volume_bar.svg)`** carves the black fill into the bar shape. |
| top | `tv_volume_meter.svg` | The housing chrome — sits over everything to frame the bar. |
| overlay | `tv_volume_switch.svg` | The knob. `width: 113.06%` of meter (overhangs), `top: (1 - volume) × 76%` so it slides from bottom (vol 0) to top (vol 1). |

The 76% comes from `100% − (switch height / meter height)` = the
travel range that keeps the switch inside the meter.

**Interaction** — single drag handler on the wrapper using pointer
events:

```tsx
onPointerDown    → setPointerCapture, isDraggingVolume = true, update
onPointerMove    → update if dragging
onPointerUp      → release capture, isDraggingVolume = false
onPointerCancel  → isDraggingVolume = false
```

`touch-action: none` on the wrapper so vertical dragging doesn't
trigger page scroll on touch devices. The `setPointerCapture` call
means a drag started on the meter continues working even if the
pointer leaves the meter mid-drag.

`updateVolumeFromPointer(clientY)` maps cursor Y relative to the meter
rect → `1 - y / height` → clamped to `[0, 1]` → `setVolume()`.

**Volume label** — "Volume" sits below the meter at `left: 50% /
top: 90%`, same Gooper Trial 700 / 9cqi styling as the button labels.

### 2.7 SVG optimisation

Two SVGs run through SVGO with `--multipass --precision=1`:

| File | Before | After | Savings |
|---|---|---|---|
| `tv_set_cropped.svg` | 143 KB | 61 KB | 58% |
| `tv_panel_cropped.svg` | 9 KB | 5 KB | 45% |

Default SVGO settings only knocked 1.2% off the TV chrome — almost all
the size lives in the path coordinates. Reducing decimal precision
from 3 → 1 (rounding to 0.1 SVG units) is sub-pixel at any reasonable
render size, so there's no visible difference.

Both originals are stashed at `/tmp/` in case a revert is needed.

### 2.8 Removed old desktop / mobile controls

The `TVControls` component (Show Info / Schedule / Fullscreen +
volume slider that previously sat in a row below the TV) is no longer
rendered — its functions are now all on the in-panel controls. Mobile
button row also removed. Status bar ("On now / Up next") still sits
below the TV.

Files affected:
- `TVControls` import removed from [TVSet.tsx](../components/tv/TVSet.tsx)
- `components/tv/TVControls.tsx` itself is now orphaned but kept on disk

---

## 3. Shop page — proper assets

The shop page was using the TV planet as a placeholder. Two swaps:

### 3.1 Planet decoration

File: [components/shop/ShopClient.tsx](../components/shop/ShopClient.tsx)

| Layer | Before | After |
|---|---|---|
| Background | `planet_background_tv.svg` | `planet_background_shop.svg` |
| Foreground | `planet_foreground_tv.svg` | `planet_foreground_shop.svg` |

### 3.2 Page title

File: [components/layout/SectionIntro.tsx](../components/layout/SectionIntro.tsx)

The `TITLE_IMAGES` entry for `shop` swapped from the small raster
placeholder to the SVG title:

```diff
- shop: { src: '/imgs/title_shop.png', w: 195, h: 117 },
+ shop: { src: '/imgs/text_buy_ralph_stuff.svg', w: 952, h: 211 },
```

`w: 952` (rounded from viewBox 951.78) means the existing component
logic renders the title at `w/2 = 476px` max-width — matching the
half-scale convention used by magazine (575px) and events (535px).

### 3.3 Category filter polish

File: [components/shop/ShopClient.tsx](../components/shop/ShopClient.tsx)

Three changes to the Mag / Merch / Random tabs:

| Property | Before | After |
|---|---|---|
| Active text colour | `text-ralph-orange` (changed to green mid-session, then reverted) | `text-black` — stays black in every state |
| Underline | `<span>` with `h-0.5` and `bg-ralph-orange` | `<img src="/imgs/underline_shop.svg">` sized 118 × 11 (80% of nav-natural 148 × 14) |
| Layering | n/a | Label wrapped in `<span className="relative z-10">`, underline `z-0` — line graphic sits **behind** the text |

This matches the magazine pattern (text stays black, decorative SVG
underline drawn from the section's nav identity). The shop nav
underline asset is teal — same colour used in the main nav for the
Shop link.

### 3.4 Content top-padding

`paddingTop` on the shop content layer dropped from 200 → 120px so
the planet decoration and the section intro tuck together more
tightly.

---

## 4. Events page — expanded panel + in-page deep link

Adds an "expanded" event view that opens when the user clicks
"Show me more" on the mini panel, with the URL syncing to
`/events/[slug]` — **without** any soft navigation or page fade.

### 4.1 Routing setup

| File | Role |
|---|---|
| [app/events/[slug]/page.tsx](../app/events/%5Bslug%5D/page.tsx) (new) | Server `redirect()` from `/events/[slug]` → `/events?show=slug`. Handles direct deep links, refreshes, and shared URLs — the events page client then reads the query param and opens the right arm. |
| [components/events/EventsClient.tsx](../components/events/EventsClient.tsx) | Unchanged — `activeEvents` flows straight through. |
| [components/events/MinglingCharacters.tsx](../components/events/MinglingCharacters.tsx) | All new state + URL handling lives here. |

Pattern is copied verbatim from the magazine slug route
(`/magazine/[slug]` → `/magazine?read=slug`), with one critical
difference — see §4.4.

### 4.2 State + URL sync

```ts
const [activeArm, setActiveArm]     = useState<number | null>(null)
const [expandedArm, setExpandedArm] = useState<number | null>(null)
```

- **On mount**: read `?show=slug` from URL → find matching arm index →
  set `activeArm + expandedArm` → `History.prototype.replaceState` the
  nice slug URL into the bar.
- **"Show me more" click**: `History.prototype.pushState` to
  `/events/[slug]` → `setExpandedArm(idx)`.
- **Close while expanded**: `History.prototype.pushState` to `/events` →
  `setExpandedArm(null)`.
- **`popstate` listener** closes the expanded panel on back/forward.

### 4.3 Layout transitions

Driven by CSS transitions on existing absolute-positioned wrappers
(`transition-all duration-500 ease-out`):

| Element | Mini state | Expanded state |
|---|---|---|
| Active arm | At `defaultLeft` (or bunched), `verticalOffset: 0` | `left: 50%`, `verticalOffset: 50px` (nestled under the panel) |
| Other arms | At `defaultLeft` | `opacity: 0`, `translateY(arm.height + 100px)` (slid off-screen), `pointer-events-none` |
| Panel wrapper | `bottom: -100 + arm.height - 150`, `left: ${armLeft}%`, transform shifts to align with the hand | `bottom: 205px`, `left: 50%`, `translateX(-50%)` (centred) |
| Panel | 388 × 276, single column, `panelRotation` slight tilt | 760 × 420, **two-column flex** (text + poster), rotation `0deg`, transform-origin `bottom center` |
| Wave animation | runs when no arm is active | paused while expanded |

### 4.4 Bypassing Next.js's pushState monitor

**This is the key fix.** First attempt called `window.history.pushState`
directly, which caused a full FrozenRouter page fade and re-mount —
panel disappeared, arms came back, URL updated. Cause: Next.js 16's
App Router **patches `window.history.pushState`** and treats a path
change to `/events/[slug]` as a soft navigation:

1. RSC fetch for the new route segment
2. `/events/[slug]/page.tsx`'s `redirect()` fires
3. Soft-navigates to `/events?show=slug`
4. AnimatePresence-keyed pathname change runs the page-exit fade
5. MinglingCharacters re-mounts, local `expandedArm` state lost

The fix calls the **un-patched prototype method** directly:

```ts
History.prototype.pushState.call(window.history, null, '', `/events/${slug}`)
```

`window.history.pushState` is an own-property on the instance (added
by Next.js's patch); `History.prototype.pushState` is the original
native method. Calling it via `.call(window.history, …)` updates the
URL bar at the browser level but never notifies the router. Next.js
doesn't know the URL changed, so no fade, no refetch, no re-mount.

Back-button behaviour is unaffected — `popstate` is a native browser
event that fires on back/forward regardless of which pushState was
used. The handler in MinglingCharacters resets `expandedArm` to `null`
when the user navigates back.

Magazine doesn't hit this because the `ArticleOverlay` is portalled
via `createPortal` into `document.body`, escaping the
PageTransitionWrapper's stacking context. The events panel renders
in-place inside the page, so the fix was needed.

### 4.5 Expanded panel content

Two-column flex inside the expanded panel:

| Left column (`flex-1`) | Right column (`flex-1`) |
|---|---|
| Title (Gooper Trial 600 / 28px) | Event poster — `<img src={thumbnailUrl}>` with `object-contain`, `borderRadius: 8`. Falls back to a translucent "Poster" placeholder when `thumbnailUrl` is null. |
| `descriptionShort` body copy | |
| Date (Gooper Trial 600 / 16px) | |
| `<address>` with `location` / `locationAddress` / `locationPostcode` joined by newline (`white-space: pre-line`) | |
| Bottom CTA — `Button label="Get tickets" href={externalTicketUrl}` if set, else `Button label="Subscribe for ticket access"` (placeholder; SubscribeModal trigger to be wired later) | |

### 4.6 Other tweaks

- **[components/ui/Button.tsx](../components/ui/Button.tsx)** — `<button>` element now has explicit `type="button"`. Without it the browser default is `type="submit"`, which can submit forms / trigger reloads in some setups. Defensive hardening.
- **Local `Event` interface in MinglingCharacters** gained `locationAddress`, `locationPostcode`, `thumbnailUrl`, `externalTicketUrl` — fields already on `EventRow` from the DB schema, just not previously surfaced through the prop type.
- Confirmed via temporary `console.log` (removed after) that `thumbnailUrl` flows through the DB → server fetch → client props correctly. The empty posters are unset DB rows, not a pipeline bug.

---

## 5. Nav z-index restructure

The Theme + Language dropdowns were rendering **behind** the main nav
links. They sit inside the utility bar (`z-50`), but the main nav row
was at `z-[60]`, so the entire utility bar — and the dropdowns
positioned `absolute` within it — got covered by the nav.

The first attempt bumped the utility bar to `z-[70]`, but that broke
the inverse case: with the bar above the nav, clicks on the nav links
were blocked by the empty space in the utility bar container.

**Final layout** in [components/layout/Nav.tsx](../components/layout/Nav.tsx) and
[components/layout/PinkDropdown.tsx](../components/layout/PinkDropdown.tsx):

| Layer | z-index | `pointer-events` |
|---|---|---|
| Utility bar container (desktop, `fixed top-0`) | `z-50` | `none` (was implicit `auto`) |
| Blur layer (inside utility bar) | `-z-10` | `none` |
| Left flex group (logo + Subscribe + Login) | inherits | `auto` |
| Right flex group (Work with us + Theme + Lang + Basket) | inherits | `auto` |
| `PinkDropdown` (inside trigger) | `z-[70]` within utility bar stacking context | inherits `auto` from group |
| Main nav row | `z-[40]` (was `z-[60]`) | `none` (children re-enable) |

Result:
- Utility bar (z-50) paints above the nav row (z-40), so dropdowns
  rendering from inside the utility bar always sit on top.
- `pointer-events: none` on the bar container with `auto` on the two
  flex groups means clicks on the bar's empty space fall through to
  the nav links underneath.
- Mobile utility bar (different markup, no theme/lang pickers in it)
  was left untouched — clicks there don't need to pass through to a
  nav row.

---

## Files touched

### New
- `app/events/[slug]/page.tsx` — server-redirect deep-link route
- `docs/session-2026-05-23-tv-redesign.md` — this doc

### Modified
- `CLAUDE.md` — full refresh; new sections; no content dropped
- `changelog.md` — seven May entries added
- `components/tv/TVSet.tsx` — full rebuild (chrome, ground, panel, buttons, SFX, volume slider)
- `components/tv/RalphTVClient.tsx` — section spacing, planet offset
- `components/shop/ShopClient.tsx` — planet asset paths, page title, filter underline + colour, top-padding 200 → 120
- `components/layout/SectionIntro.tsx` — shop title entry
- `components/events/MinglingCharacters.tsx` — expanded panel state, URL sync via native History prototype, 2-col layout, arm transitions
- `components/layout/Nav.tsx` — utility bar `pointer-events-none`, flex groups `auto`, main nav `z-[60]` → `z-[40]`
- `components/layout/PinkDropdown.tsx` — `z-50` → `z-[70]` (inside utility bar context)
- `components/ui/Button.tsx` — explicit `type="button"` on the rendered `<button>` element
- `public/imgs/tv_set_cropped.svg` — SVGO precision-1 (143 KB → 61 KB)
- `public/imgs/tv_panel_cropped.svg` — SVGO precision-1 (9 KB → 5 KB)

### Assets referenced (new in `public/imgs/` and `public/sfx/`)
- `tv_set_cropped.svg`, `tv_set_ground.svg`
- `tv_panel_cropped.svg`
- `tv_button_off.svg`, `tv_button_on.svg`
- `tv_volume_meter.svg`, `tv_volume_switch.svg`, `tv_volume_bar.svg`
- `tv_button_off.m4a`, `tv_button_on.m4a` (mp3 originals preserved)
- `planet_background_shop.svg`, `planet_foreground_shop.svg`
- `text_buy_ralph_stuff.svg`

### Open follow-ups
- `components/tv/TVControls.tsx` is now unused on disk — safe to delete on a future cleanup pass.
- The browser-synthesised Gooper Trial 700 is acceptable; if a real 700 cut becomes available, drop in a second `@font-face` declaration.
- Pre-existing lint error on the localStorage volume-load effect in `TVSet.tsx:73` (`setState` inside `useEffect`) — unrelated to this session, refactor to a lazy `useState` initialiser when convenient.
- Events `descriptionShort` is currently used for both the mini panel and the expanded view body. If you want a richer extended body, add a `descriptionLong` (or `descriptionBlocks`) column to the events table.
- `events.thumbnail_url` is empty in the DB — expanded panels show the placeholder until rows are populated. Pipeline confirmed working.
- The expanded panel's "Subscribe for ticket access" button is currently a stub; wire it to the SubscribeModal trigger when the flow is ready.
