# Ralph World — Performance Audit
*2026-07-19 — focused on: (1) smooth fade-up page transitions with nothing visible before it should be, (2) load effects for content that needs loading, (3) runtime snappiness.*

## Context
Read-only sweep of the transition system, loading/data-fetch paths, and runtime hot loops. Overall the animation *architecture* is strong (one shared canvas sequencer, IntersectionObserver reveals, mostly-passive listeners, parallel server reads). The gaps are concentrated: a few elements flash in before their surroundings, there are **no route-level loading skeletons and no image load-in effects**, and a couple of canvas loops + an unbatched Nav scroll handler cost main-thread time.

**Severity:** 🔴 High (visible jank / launch-worthy) · 🟡 Medium · ⚪ Low (polish).
**Effort:** S (<1h) · M (a few hours) · L (day+).

> Note: `CLAUDE.md` says transitions live in `app/template.tsx` — that file doesn't exist; the system is in `components/layout/PageTransitionWrapper.tsx` (correct — a `template.tsx` would remount and kill exit anims). Stale doc line.

---

## Goal 1 — Smooth fade-up transitions, nothing visible before it should be

**How it works today:** three *uncoordinated* layers — (a) a page-level **opacity-only** crossfade (`PageTransitionWrapper.tsx`, `AnimatePresence mode="wait"` keyed on pathname, `FrozenRouter`); (b) per-section staggered reveals each `*Client.tsx` mounts (`sectionContainerVariants` → `sectionBgVariants`/`sectionContentVariants`); (c) the homepage `PlanetSection` scroll reveal.

| Sev | Finding | File | Fix |
|-----|---------|------|-----|
| 🔴 | **Elements flash in at full opacity** while everything around them fades — the only real "visible before it should be" bugs. The got-coin sprite is rendered *outside* the section motion tree; `CanvasStage` sits between Hero and planet sections with no reveal wrapper. | `MagazineClient.tsx:153` (got-coin), `app/page.tsx:142` (CanvasStage) | Wrap each in a `motion` element with `initial={{opacity:0}}` (tie the coin to `sectionBgVariants` so it arrives with its planet). |
| 🔴 | **Page transition is a flat opacity fade — no "fade up".** `pageVariants` animate `opacity` only; translateY only appears on the planet bg + hero heading, never on body content or the page swap. | `PageTransitionWrapper.tsx:53-63`; `page-transitions.ts:48,61,73` | Add `y` to `pageVariants` (`initial {opacity:0,y:12}`, `animate {…y:0}`, `exit {…y:-8}`) and to `sectionContentVariants` + the TV `*NoIntro*` variants so body content rises. |
| 🟡 | **Transitions feel sluggish (~1.0–1.35s to settle).** Stacked delays (bg delay 0.3s, content delay 0.5s) on top of the 0.35s page exit; mixed eases (cubic-bezier arrays vs `'easeOut'` strings). | `page-transitions.ts:12,25,39,52`; `homepage.ts:17,28` | Collapse the delays, standardise on one ease token + ~0.35–0.45s durations. Target settle < ~0.6s. |
| 🟡 | **`instantNav` doesn't reach section content.** Menu navigation makes the page-level fade instant, but section `*Client` staggers still play 0.3–0.5s — so it's not actually instant. | `PageTransitionWrapper.tsx:52`; each `*Client.tsx` | Propagate `instantNav` (+ reduced-motion) into the section variants, or drive section content off the wrapper. |
| 🟡 | **Homepage below the hero is blank until JS runs** (and with JS off). Sections start `opacity:0,y:60` and only reveal when the post-hydration IntersectionObserver fires → brief empty beat on the first above-the-fold section. | `PlanetSection.tsx:88,317`; `useScrollReveal.ts:12` | Initialise `isVisible=true` for the first above-the-fold section (or a no-JS CSS fallback). |
| ⚪ | **Homepage exit double-fades** — planets fade via `isExiting` while the parent `pageVariants` opacity fades the same nodes; the ±100px x-slide can momentarily overflow horizontally. | `PlanetSection.tsx:305-317,709-717` | Keep the directional slide, let one layer own the opacity. |
| ⚪ | Nested `exit` variants across `page-transitions.ts` never visibly run (parent opacity covers them) — harmless dead config; optional cleanup. | `page-transitions.ts` | — |

**Good already:** framer writes `initial` as inline styles during SSR, so *wrapped* content renders at `opacity:0` on first paint — no classic SSR flash. The `PlanetSection` panel gate (`planetLoaded && transitionsOn` + `visibility:hidden`, added 07-19) is the correct "hidden until ready" pattern to imitate. `minHeight` capture + `scrollTo` in `onExitComplete` prevent collapse/scroll-jump during the swap.

---

## Goal 2 — Load effects for content that needs loading

**Today: there are effectively none.** No `placeholder="blur"` anywhere; the only `loading.tsx` is a no-op empty spacer; no skeleton/shimmer component exists (only `animate-pulse` on the TV live-dot).

| Sev | Finding | File | Fix |
|-----|---------|------|-----|
| 🔴 | **No route-level loading skeletons.** Only `app/loading.tsx` exists and it renders an empty `min-h-screen` div. Every data route (shop, magazine, tv, events, lab + detail routes) holds the old page then pops the new one in. | `app/loading.tsx`; all data routes | Build one reusable `animate-pulse` skeleton; add `loading.tsx` to `app/{shop,magazine,tv,events,lab}` + `shop/[handle]`, `magazine/[slug]`. |
| 🔴 | **Images pop in — no blur placeholder, no fade-on-load.** Shop grid/overlay/detail, magazine grid + cover, home hero. `placeholder="blur"` appears nowhere. | `ProductCard.tsx:50`, `ProductOverlay.tsx:122,153`, `ProductDetail.tsx:92`, `ArticleGrid.tsx:270,280`, `CoverStory.tsx:38,48`, `Hero.tsx:49` | Add `placeholder="blur"`+`blurDataURL` (or `onLoad` fade-in) to content images; `priority` on the first shop row + the cover. Reuse the `PlanetSection` load-gate pattern. |
| 🟡 | **TV shows OFFLINE then flips to live** — `useLiveStatus` exposes `isLoading` but `TVSet` ignores it, so first paint is the offline state until the poll resolves. | `useLiveStatus.ts`; `TVSet.tsx:45` | Consume `isLoading` → render a "connecting…" state, not OFFLINE, until the first poll. |
| 🟡 | **Shop deep-link fetches client-side with no loading state** — `fetchProduct(handle).then(setSelectedProduct)` just appears when the network resolves. | `ShopClient.tsx:74,92` | Show a skeleton while in flight, or server-render via `app/shop/[handle]`. |
| ⚪ | Two `<Suspense>` boundaries have empty fallbacks (render nothing → pop). | `join-ralph/page.tsx:27`, `MagazineClient.tsx:203` | Give real skeleton fallbacks. |
| ⚪ | Home hero title is a raw `<img>` (LCP-adjacent), no `priority`/preload. | `Hero.tsx:49` | Convert to `next/image` `priority` or preload. |

**Good already:** fonts are solid (`next/font` self-host + swap; Gooper woff2 preloaded). Data fetching is **well parallelised** — every server page uses `Promise.all`. `PlanetPreloader` warms the planet assets. `priority` is correctly set on nav/logo LCP images.

---

## Goal 3 — Runtime snappiness (INP / main thread)

| Sev | Finding | File | Fix |
|-----|---------|------|-----|
| 🔴 | **`TVStatic` regenerates full-canvas noise pixel-by-pixel every frame** (`createImageData` + per-pixel `Math.random()`×3 + `putImageData`), own rAF, **no visibility guard** — millions of JS ops/frame whenever the subscribe gate is on screen. Worst single hotspot. | `TVStatic.tsx:19-38` | Render a small offscreen noise tile scaled up (or precompute a few frames) + add a `visibilitychange` guard. |
| 🔴 | **Two full-screen canvas loops run every frame on the homepage** — `Starfield` (350 particles, its *own* rAF) runs alongside the shared sequencer's canvases; Starfield also keeps running on subpages (horizontal drift). | `Starfield.tsx:9,142,271` | Reduce `PARTICLE_COUNT`; skip/scale-down Starfield on subpages; consider folding onto the sequencer. |
| 🟡 | **Nav scroll handler is unbatched `setState` on a 630-line, SVG-heavy component** — re-renders the whole nav tree within the first 16px of scroll + around the fixed threshold. | `Nav.tsx:88-123` | rAF-batch (copy `ForegroundLayer.tsx:36-57`'s `ticking` flag); drive `scrollProgress` via a CSS var/transform instead of React state. |
| 🟡 | **`MinglingCharacters` reads `offsetWidth` every animation frame** (forced reflow ×8 wrappers/frame) and its rAF has no off-screen guard. | `MinglingCharacters.tsx:170-187` | Cache width, refresh on resize; add a visibility guard. |
| 🟡 | **Loops with no tab-hidden guard** keep painting in backgrounded tabs. | `MinglingCharacters.tsx:185`, `TVStatic.tsx:36` | Add `visibilitychange` guards (mirror the sequencer/Starfield). |
| 🟡 | **Context value objects recreated every render** → consumer fan-out. `CartContext` value is an inline literal with inline `openCart`/`closeCart` arrows (every cart consumer re-renders on any cart change); `ThemeContext` value not memoised. | `CartContext.tsx:187-201`, `ThemeContext.tsx:52-56` | `useMemo` the value + `useCallback` the open/close fns. Copy `MenuContext` (already correct). |
| ⚪ | `hooks/useParallax.ts` is an unbatched-setState scroll footgun — currently **dead code** (no callers). | `useParallax.ts:20-31` | Delete, or rewrite to CSS-var/transform before anyone wires it up. |
| ⚪ | `PinkDropdown` capture-phase scroll/resize reposition, unbatched (small blast radius — only while open). | `PinkDropdown.tsx:67-87` | rAF-batch. |

**Good already (reference implementations):** the shared `lib/anim/sequencer.ts` (one rAF for all sprite/canvas tickers, visibility-pause, auto-stop); `ForegroundLayer` (rAF-batched scroll, transform-only, passive); `SpriteAnimation` (imperative `backgroundPositionX`, zero per-frame re-render); `useScrollReveal` (IO, disconnects after reveal); `MenuContext` (memoised); consistent canvas gating (`cosy-dynamics` + `min-width:768px` + reduced-motion + `hidden md:block`); nearly all listeners passive.

---

## Data fetching (mostly healthy)
- ✅ Every server page batches reads with `Promise.all` (`app/page.tsx:31`, shop/lab/tv/magazine/events/work-with-us, sitemap).
- 🟡 `lib/data/homepage.ts` awaits `readPicks()` sequentially *before* the `Promise.all` — one round-trip serialised ahead of first paint. Low impact.
- 🟡 `app/layout.tsx` `await getSiteCopy()` blocks every page (cached via `unstable_cache`, usually cheap).
- ⚪ `app/tv` is `force-dynamic` → never prerendered; every visit pays the round-trip (intentional for the gate flag).

---

## Recommended rollout

**Phase A — kill the flashes + snappiest quick wins (S, biggest perceived-quality jump):**
1. Wrap got-coin + CanvasStage so nothing flashes in (Goal 1 🔴).
2. Add `y` to the page + section-content variants → real fade-up; tighten timings (Goal 1 🔴/🟡).
3. Rewrite `TVStatic` + add visibility guards to it and MinglingCharacters (Goal 3 🔴).
4. rAF-batch the Nav scroll handler (Goal 3 🟡).
5. Memoise Cart/Theme context values (Goal 3 🟡).

**Phase B — load effects (M):**
6. Reusable skeleton component + `loading.tsx` for the data routes (Goal 2 🔴).
7. Blur/fade-in + `priority` on shop + magazine + hero images (Goal 2 🔴).
8. TV "connecting" state; shop deep-link loading state; Suspense fallbacks (Goal 2 🟡).

**Phase C — depth (M):**
9. Propagate `instantNav`/reduced-motion into section variants; harden homepage first-section reveal; de-dupe homepage exit (Goal 1 🟡/⚪).
10. Reduce Starfield cost on subpages; delete/fix `useParallax`; rAF-batch PinkDropdown (Goal 3 🟡/⚪).

## Verification
- Lighthouse + Web Vitals (LCP/CLS/INP) on `/`, `/shop`, `/magazine`, `/tv`, an article — before/after.
- Chrome Performance trace while scrolling the homepage (watch for the double canvas loop + Nav re-renders) and while the TV subscribe gate is on screen (TVStatic).
- Throttled 4G + slow-CPU: confirm skeletons show and images blur-up rather than pop.
- Navigate via the slide-in menu: confirm section content is actually instant (instantNav).
