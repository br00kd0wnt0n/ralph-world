# Session 2026-06-27: Slide-in Nav Panel, "Through Space" Transition & Polish

## Overview
A big pass on the mobile/burger navigation (< 1200px): the menu became a
full-screen, transparent **slide-in panel over a drifting starfield**, the page
content slides off to reveal it, and navigating from the menu changes the route
instantly so the new page slides in ready. Plus a batch of related fixes:
parallax depth on subpages, a homepage panel-flash fix, relocating the
eyed-alien onto the footer planet, and a restyle of the error page.

---

## New shared pieces

| File | Role |
| ---- | ---- |
| `context/MenuContext.tsx` | Shared menu state: `open`/`setOpen`, a `footerRequest` (open the footer panel from the menu), and a one-shot `instantNav` flag (skip the page transition for menu navigations). |
| `components/layout/PageShift.tsx` | Wraps the page content; slides it fully right + fades it out when the menu opens, revealing the starfield beneath. Carries `z-10`. |
| `components/layout/MenuFade.tsx` | Fades its children out while the menu is open (used for the nav + the midground/foreground canvases so they don't clutter the space scene). |
| `lib/useLanguage.ts` | Shared language state (read/persist/profile-sync) + `LANGUAGES`, used by both the nav `LanguageModal` and the menu. |

`MenuProvider` is wired into `app/providers.tsx`; `MobileMenu` is now rendered at
the layout level (outside `MenuFade`) so it isn't faded when it opens.

---

## Slide-in nav panel (`MobileMenu`)

Rebuilt from a centered list into a full-screen, **transparent** panel that
slides in from the left (framer-motion `AnimatePresence`, 0.5s).

- **Links** (Gooper, pink → white on hover):
  - Top: **Subscribe to Ralph** (`/join-ralph`), **Log in** (`/login`), **Language**
    (signed-in collapses to **Your account**).
  - **Worlds**: Ralph TV / Magazine / Events / Lab / Shop.
  - **About us**: Work with us, Weren't you an agency? (`/work-with-us`),
    **Find us** + **Contact us** (open the footer panel — see below).
- **Section headers** ("Worlds", "About us"): Roboto 900, white, 18px (16px < 576).
- **Logo**: ralph wordmark, fixed height (71px / 92px ≥ 768) so the bar reserves
  space and doesn't shift on load.
- **Close button**: the article-overlay image-swap close (`close_btn.svg` /
  `_over` on hover), absolutely positioned to line up with the nav basket
  (~`top: 13px`, `px-6`), and **pops in** (spring) after the panel settles /
  **pops out** when closing.
- **Responsive sizing**: links 28px → 24px < 576; headers + language items also
  step down, with tighter spacing, so the menu isn't so tall on phones.
- **Language**: reuses the nav's `icon_language.svg` (recoloured pink via a CSS
  mask + `currentColor`) and shows the current language; clicking reveals an
  inline list (English / 日本語 / हिंदी) with a tick on the active one — same
  persistence as the nav via `useLanguage`. (Inline rather than `PinkDropdown`
  because that dropdown's notch is built for the right-aligned nav.)
- **Burger** trigger bumped to 32×32px (`Nav`).

### Floating space decorations
Moon / saucer / satellite / planet PNGs are spread across the space to the right
of a ~400px text column (`min(400px, 55%)` reserve). Each **slides in with its
own extra offset + duration on top of the panel slide** (parallax — the planet
drifts in slowest at ~1.35s, the satellite snaps in at ~0.5s) and then gently
floats. Widths use `clamp()` so they grow on mid-range/tablet sizes.

---

## "Through space" page transition

- **`PageShift`**: when the menu opens, the page content (and nav, via
  `MenuFade`) **slides fully off to the right and fades** (transform 0.5s,
  opacity 0.3s), revealing the starfield at `z-0`. A left-edge **gradient mask**
  feathers the leading edge while sliding, so subpages' white backgrounds don't
  flash a hard white line. Uses `transform: none` when closed so it never breaks
  `position: fixed` descendants.
- **`Starfield`** is now menu-aware: while the menu is open it runs on **every**
  screen size (incl. mobile, where it's normally hidden) and switches to the
  **left→right horizontal drift** on every route — so it feels like we've
  travelled through space into the menu. No always-on mobile cost (it only runs
  on mobile while the menu is open).

### Instant route change from the menu (only)
- A menu link sets `instantNav` on `MenuContext`. `PageTransitionWrapper` reads
  it and runs that one navigation with **duration 0** (no fade), then resets the
  flag. **In-site links keep the normal fade.**
- The menu now **closes on the pathname change** (not on click), so the route
  commits while the page is off-screen and the new page **slides in already
  rendered** instead of sliding the old page in then swapping. (Same-route links
  just close.)

---

## Depth / stacking fixes

- **Subpages**: the foreground parallax layers (`ForegroundLayer` rocket etc.,
  `ForegroundCanvas` saucer) drop from `z-20` to `z-[5]` on non-home routes, so
  all parallax items sit **below** the page content. Homepage keeps `z-20` in
  front for its depth effect.
- **Homepage**: `PageShift` carries `z-10` itself (not just `<main>`). Its
  `will-change: transform` creates a stacking context, which had trapped the
  page's z-index and let the midground/foreground paint on top — the explicit
  `z-10` lifts the whole page above the parallax layers.

---

## Other polish

- **Homepage panel flash** (`PlanetSection`): the colored module-card panels
  could flash on load (their padding peeked at 0 visible width). Fixed with
  `box-sizing: border-box` (so the clip-path covers the padding) + keeping the
  panel `visibility: hidden` until it's both transition-ready and measured.
- **Eyed-alien**: removed from `CanvasStage` (canvas) and relocated to
  `FooterPlanet` as a DOM `SpriteAnimation` standing on the planet top, 150px
  left of centre (and 65px down), so it moves with the planet.
- **Footer** now opens its expanding panel on request from the menu
  (`footerRequest`): scrolls into view and expands to offices (Find us) or the
  form (Contact us) after the menu closes.
- **Magazine**: category filter bar (`CategoryTabs`) max width 540px.
- **Error page** (`app/error.tsx`): title now Gooper, body muted white
  (`text-white/70`), and the buttons use the shared `Button` component
  (solid-pink "Try again", default "Go home").

---

## Files
- New: `context/MenuContext.tsx`, `components/layout/PageShift.tsx`,
  `components/layout/MenuFade.tsx`, `lib/useLanguage.ts`
- Changed: `app/layout.tsx`, `app/providers.tsx`, `app/error.tsx`,
  `components/layout/MobileMenu.tsx`, `Nav.tsx`, `Starfield.tsx`,
  `PageTransitionWrapper.tsx`, `LanguageModal.tsx`, `Footer.tsx`,
  `ForegroundLayer.tsx`, `components/anim/CanvasStage.tsx`,
  `ForegroundCanvas.tsx`, `components/home/FooterPlanet.tsx`,
  `PlanetSection/PlanetSection.tsx`, `components/magazine/CategoryTabs.tsx`
