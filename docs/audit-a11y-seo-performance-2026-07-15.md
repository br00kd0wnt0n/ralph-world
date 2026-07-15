# Ralph World — Accessibility, SEO & Performance Audit
*2026-07-15 — pre-launch review*

## Context
Pre-launch review of the whole site to get **accessibility (WCAG 2.1 AA)**, **SEO**, and **load-speed/performance** to an excellent state. This is an inventory of every gap found across all views, each with severity, the file(s) involved, and the recommended fix.

Findings came from a full read-only sweep of `app/` and `components/`, then spot-verified against the actual source (layout, sitemap, robots, next.config, CanvasStage, and greps for JSON-LD / hreflang / reduced-motion / manifest / 404). Overall the codebase is in better shape than typical (icon buttons carry `aria-label`, decorative art is `aria-hidden`, focus-trap hook exists, images already partly on `next/image`, one shared rAF for canvases). The gaps are concentrated and fixable.

**Severity:** 🔴 High (launch-blocking / real user impact or major ranking loss) · 🟡 Medium · ⚪ Low (polish).
**Effort:** S (<1h) · M (a few hours) · L (day+).

---

## 0. Top priorities (do these first — high impact)

| # | Area | Item | Sev | Effort |
|---|------|------|-----|--------|
| 1 | Perf | `ralph-logo.png` is **420 KB / 800×800** shipped as the favicon | 🔴 | S |
| 2 | Perf | No `images.remotePatterns` → **all Shopify + TV images unoptimized** | 🔴 | S |
| 3 | A11y | **No `prefers-reduced-motion`** anywhere (heavy canvas/parallax/framer) | 🔴 | M |
| 4 | Perf | `CanvasStage` has **no mobile gating** — continuous full-viewport rAF paint on phones | 🔴 | S |
| 5 | A11y | **MobileMenu**: no focus trap, no Escape, no initial focus | 🔴 | M |
| 6 | SEO | Dynamic routes (article/event/product) are **redirect stubs with no metadata** | 🔴 | M |
| 7 | SEO | **No JSON-LD** structured data (Organization, Article, Product, Event) | 🔴 | M |
| 8 | SEO | `sitemap.ts` is static, omits all content, lists a **dead `/play` URL** | 🔴 | S |
| 9 | A11y | **Placeholder-only form labels** (Footer contact, Join Ralph) | 🔴 | M |
| 10 | A11y | **No skip-to-content link** | 🟡 | S |

---

## 1. SEO

### 1a. Per-route metadata
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | Magazine article route is a bare `redirect()` → `/magazine?read=slug`; no `generateMetadata`, so every article shares the site default title/desc/OG | `app/magazine/[slug]/page.tsx` | Add `generateMetadata` (per-article title, description, canonical, OG image). Render real content at the slug URL instead of redirecting, OR keep redirect but emit metadata + canonical first. |
| 🔴 | Same pattern — no per-event metadata | `app/events/[slug]/page.tsx` | `generateMetadata` per event (name, date, location → also Event JSON-LD, §1d). |
| 🔴 | Same pattern — no per-product metadata | `app/shop/[handle]/page.tsx` | `generateMetadata` per product (title, price, image → Product JSON-LD). |
| 🟡 | Home page exports no `metadata` (uses layout default only) | `app/page.tsx` | Add home-specific title/description/canonical/OG. |
| 🟡 | `/work-with-us` still titled "Play with Ralph" / "the agency arm" (renamed from `/play`) | `app/work-with-us/page.tsx:13-14` | Update title + description copy. |
| ⚪ | `/login`, `/account`, `/reset-password` have no `robots:{index:false}` | those pages | Add noindex to auth pages (account/login already robots-disallowed; add reset-password). |
| ⚪ | No `alternates.canonical` on any route except `/jp/contact` | all routes | Add canonical per route (esp. the dynamic content — see §1e). |
| ⚪ | Per-page `twitter` never overridden; article/section Twitter cards show generic site title | section pages | Set `twitter.title/description` where OG is set (or a shared helper). |

### 1b. Global metadata — `app/layout.tsx` (mostly good)
| Sev | Item | Fix |
|-----|------|-----|
| ⚪ | `lang="en"` but OG locale `en_GB`; `/jp` served under `lang="en"` | Align locale; set `lang="ja"` on the JP surface (already done on jp/contact content). |
| ⚪ | Icons all point at one 800px PNG; no `.ico`, sized, or maskable icons; no `manifest.webmanifest`, no `theme-color` | Add proper favicon set (`app/icon.png`/`apple-icon.png`), a web manifest, and `themeColor` (ties to Perf #1). |

### 1h. i18n / hreflang & 404
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🟡 | hreflang is one-directional: only `/jp/contact` declares `languages` (`ja-JP`↔`en`); English pages/`/contact` don't declare the `ja` alternate back. No site-wide en↔jp hreflang | `app/jp/contact/page.tsx:8-9`; English routes | Add reciprocal `alternates.languages` on the paired English pages (at least `/contact`↔`/jp/contact`). |
| 🟡 | No custom `not-found.tsx` — 404s render Next's generic default (off-brand; verify it still returns HTTP 404 + noindex) | (none in `app/`) | Add a branded `app/not-found.tsx` with helpful links + `robots noindex`. |

### 1c. Sitemap & robots
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | Static list; no articles/events/products emitted | `app/sitemap.ts:10-20` | Make sitemap async; pull published article slugs, event slugs, product handles from `lib/data/*` / Shopify. |
| 🔴 | Lists `/play` (route deleted → dead URL) | `app/sitemap.ts:18` | Remove; add `/work-with-us`. |
| 🟡 | Lists `/subscribe` (a redirect stub) | `app/sitemap.ts:17` | Drop or replace. |
| 🟡 | Omits `/join-ralph`, `/work-with-us`, `/legal/*`, `/jp/contact` | `app/sitemap.ts` | Add real indexable pages. |
| ⚪ | Every entry `lastModified: new Date()` | `app/sitemap.ts:23` | Use real `updatedAt` where available. |
| ⚪ | robots disallows `/account`,`/login` but not `/reset-password` | `app/robots.ts:12` | Add reset-password (and any auth stubs). |

### 1d. Structured data (JSON-LD) — none exists
| Sev | Item | Fix |
|-----|------|-----|
| 🔴 | No schema.org anywhere | Add: **Organization + WebSite** (root layout), **Article** (magazine article), **Product** + offers (shop), **Event** (events), **BreadcrumbList** (section→item). Emit via a small `<script type="application/ld+json">` component. |

### 1e. Canonical / duplicate content
| Sev | Item | Fix |
|-----|------|-----|
| 🔴 | Canonical content lives on query-string URLs (`/magazine?read=`, `/shop?product=`, `/events?show=`); pretty `[slug]` routes only redirect and set no canonical; content not in sitemap | Decide one canonical URL form (recommend the pretty `/magazine/[slug]` etc. rendering real content), set `alternates.canonical`, and put those in the sitemap. This resolves §1a + §1c together. |

### 1f. OpenGraph images
| Sev | Item | Fix |
|-----|------|-----|
| 🟡 | Single generic OG card for the whole site (`app/opengraph-image.tsx`); no per-article/product/event image, no `twitter-image` | Add dynamic per-route `opengraph-image.tsx` for magazine/shop/events (use the lead image or a generated card). |

### 1g. Headings (also A11y §5)
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | `/tv` renders **no heading at all** (no h1) | `components/tv/RalphTVClient.tsx` (accepts `heading` prop, never renders it) | Render an `<h1>` (visually-hidden if design has no title). |
| 🟡 | `/join-ralph` has no h1 (starts at h2) | `components/join-ralph/JoinRalphClient.tsx` | Add an h1 (visually-hidden ok). |

---

## 2. Accessibility (WCAG 2.1 AA)

### 2a. Motion / reduced-motion 🔴 (biggest single gap)
- No `prefers-reduced-motion` handling site-wide. `lib/animation/page-transitions.ts:148` defines `reducedMotionVariants` but it's **never used**.
- **Fix (M):** honour reduced-motion in one place per system:
  - CSS `@media (prefers-reduced-motion: reduce)` in `globals.css` to kill the wave/float/CSS animations.
  - `useReducedMotion()` (framer-motion) in `PageTransitionWrapper` → swap to instant/opacity-only.
  - Skip/most-static mode for the canvases (`Starfield`, `CanvasStage`, `Midground/ForegroundCanvas`) and parallax (`hooks/useParallax.ts`) and `MobileMenu` decor floats.

### 2b. Focus & keyboard
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | MobileMenu: no focus trap, no Escape, focus not moved in | `components/layout/MobileMenu.tsx` | Reuse `hooks/useFocusTrap.ts` (already used by 5 other overlays); add Escape-to-close + `role="dialog"`/`aria-modal`. |
| 🟡 | No skip-to-content link; also `<main>` has **no `id`** to target | `app/layout.tsx:89` (main has no id) | Add a visually-hidden "Skip to content" link as the first focusable element → give `<main id="main">` and link to `#main`. |
| 🟡 | `ProductOverlay` has Escape but no focus trap and no dialog semantics | `components/shop/ProductOverlay.tsx:45` | Add `useFocusTrap` + `role="dialog"`/`aria-modal`. |
| 🟡 | Event info overlay — verify focus/Escape | `components/events/MinglingCharacters.tsx:500` | Add trap/Escape/dialog role. |
| ⚪ | LanguageModal/ThemeToggle close on outside-click only (currently hidden for launch) | `LanguageModal.tsx`, `ThemeToggle.tsx` | Add Escape + trap when restored. |
| ⚪ | Verify pink `:focus-visible` outline is visible on pink/white button states | `globals.css:277-280` | Consider a contrasting/offset outline. |

### 2c. Forms
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | Contact form: placeholder-only labels, `<select>` "label" is a disabled option, no `aria-live` feedback (submit only `console.log`s) | `components/layout/Footer.tsx:424-469` | Add real `<label>`s (visually-hidden ok), `role="alert"` errors + `role="status"` success. Model on `LoginForm.tsx`. |
| 🔴 | Join Ralph: email/first/last/password placeholder-only, no labels | `components/join-ralph/JoinRalphClient.tsx:507-667` | Add labels/`aria-label`. (Marketing checkbox already correct.) |
| 🟡 | No visible/AT "required" indicator on those forms | same | Add required markers + `aria-required`. |

### 2d. Images / alt (mostly good — targeted fixes)
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🟡 | Cart/gallery product thumbnails fall back to empty alt | `CartDrawer.tsx:117`, `ProductOverlay.tsx:141` | Fall back to product title, not `''`. |
| 🟡 | Article body images default `alt=""` | `components/magazine/BlockRenderer.tsx:108,127` (+caption fallbacks) | Require/author alt in CMS; don't silently blank editorial images. |
| 🟡 | SubscribeModal placeholder art `<div>`s ("satellite/alien/mag cover") | `SubscribeModal.tsx:94-161` | When real art lands, set alt / `aria-hidden`. |
| ⚪ | Globe inner `alt="Globe"` redundant (button already labelled) | `Globe.tsx:73,89` | `alt=""`. |

### 2e. Landmarks / headings / state
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🟡 | No `aria-current` on active nav links (color/underline only) | `Nav.tsx:367-402,551-587`, `MobileMenu.tsx` | Add `aria-current="page"` (LegalNav already does). |
| 🟡 | Mobile home starts at h3, no h1/h2 | `components/home/MobileHome.tsx` | Ensure one h1 per rendered page; fix order. |
| 🟡 | Desktop home jumps h1→h3 (section titles are h3, title art outside headings) | `PlanetSection.tsx:387,394,647` | Normalise heading levels. |
| 🟡 | No `<header>`/`role="banner"` around the nav | `Nav.tsx:134,323` | Wrap top nav in `<header>`. |
| 🟡 | `PlanetSection` uses `div role="link" tabIndex=0` as a link | `PlanetSection.tsx:310-315` | Prefer a real `<Link>`. |
| ⚪ | `TVStatic` canvas missing `aria-hidden` (only canvas that does) | `components/tv/TVStatic.tsx:49` | Add `aria-hidden`. |
| ⚪ | TV countdown uses `aria-live="polite"` on a per-second counter — may over-announce | `components/tv/TVSet.tsx:332-333` | Throttle announcements / use `aria-live` on a coarser element. |

### 2f. Colour contrast (verify with a tool — flagged risk areas)
| Sev | Risk | Where |
|-----|------|-------|
| 🔴 | White on ralph-pink `#EA128B` (~3.9:1) fails AA for normal text | filled pink buttons/badges (`Button.tsx:74`, login CTAs, account avatar) |
| 🟡 | Pink `#EA128B` on black (~4.3:1) borderline for small text | nav links, mobile menu links |
| 🟡 | `text-white/70`, `text-white/60` small print | Footer, LoginForm muted text |
| 🟡 | `placeholder-gray-500` / `placeholder-black/40` (also the only label, §2c) | Footer/Join Ralph inputs |
> Action: measure each with axe/Lighthouse; darken pink or use black text on pink where it's normal-size body text; bump muted opacities.

---

## 3. Performance / load speed

### 3a. Images
| Sev | Item | File / asset | Fix |
|-----|------|------|-----|
| 🔴 | Favicon is a **420 KB / 800×800** PNG | `public/ralph-logo.png` (used `app/layout.tsx:41-44`) | Generate a small favicon set (32/180/512 + maskable) via `app/icon.png`/`apple-icon.png` or a tiny `.ico`. |
| 🔴 | No `images.remotePatterns` → Shopify + broadcaster images all raw `<img>`, fully unoptimized | `next.config.ts:44-47`; `components/shop/*`, `components/tv/*` | Add `remotePatterns` (Shopify CDN + broadcaster host), then move those to `next/image` (AVIF/WebP + resize + lazy). |
| 🟡 | `article_lead.png` **288 KB / 502×310** | `public/imgs/article_lead.png` | Re-encode WebP/AVIF (prior test: →~7 KB) or serve via optimizer. |
| 🟡 | Six `planet_*.png` (822px, 116–172 KB) often rendered smaller | `public/imgs/planet_*.png` | Already partly `next/image`; finish + they'll resize/AVIF. |
| 🟡 | `planet_creative.png` is 1500×1486 | `public/imgs/planet_creative.png` | Resize to display size. |
| 🟡 | Remaining local raster raw `<img>` (wordmark, hero text, footer planet, event chars) | `Nav.tsx`, `Hero.tsx`, `FooterPlanet.tsx`, `MinglingCharacters.tsx` | Move to `next/image` where layout allows (local-guarded pattern already used in `PlanetSection`). |
| 🟡 | Oversized sprite sheets decode huge in memory: `saucer.png` 13464×246 (~13 MB RGBA), `satellite.png` 10528×282 (~12 MB) | `public/animations/` | Consider fewer frames / smaller cells / on-demand. |
| ⚪ | Duplicate assets: both packed sheet **and** per-frame folders shipped (`satelite/` 1016K, `saucer/` 584K, `got-coin/` 404K) | `public/animations/*/` | Remove the unused per-frame folders from the deployed bundle. |

### 3b. Animations / runtime
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | `CanvasStage` has **no mobile gating**; runs full-viewport rAF paint on phones (loop clears/redraws every frame even while squad "hidden") | `components/anim/CanvasStage.tsx` | Add `matchMedia('(min-width:768px)')` + theme gate like the other canvases; consider not registering the ticker while hidden. |
| 🔴 | `Starfield` runs its **own** rAF (not the sequencer) → no hidden-tab pause | `components/layout/Starfield.tsx:247-262` | Move onto `lib/anim/sequencer.ts` (gets visibility pause) or add its own `visibilitychange` guard. |
| 🟡 | Canvas actors run regardless of on-screen/scroll; LCP work during initial homepage render | canvases | Defer start / pause when scrolled away; respect reduced-motion (§2a). |

### 3c. Fonts
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🟡 | Gooper Trial (`@font-face`) not preloaded though used above the fold | `app/globals.css:18-24` | `<link rel="preload" as="font" ... crossorigin>` for the woff2. |
| 🟡 | Roboto ships 4 weights (400/600/700/800) | `app/layout.tsx:26-30` | Drop any unused weight. |

### 3d. Bundle / client JS
| Sev | Item | Fix |
|-----|------|-----|
| 🟡 | `Footer.tsx` (client, imports **swiper**) is in the root layout → swiper+framer ship on every page | Lazy-load the swiper panel (`next/dynamic`), or split the contact/offices panel out. |
| 🟡 | framer-motion in 31 files, swiper static-imported in 4 | Add `experimental.optimizePackageImports: ['framer-motion','swiper']`; dynamic-import swiper carousels. |
| ⚪ | `hls.js` dep with no import found; `@stripe/stripe-js` never `loadStripe`d | Confirm dead → remove from deps. |

### 3f. Core Web Vitals (CLS / LCP)
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🟡 | **CLS**: raw `<img>` without width/height reserve no space (planets, hero text, footer planet, product/TV images) → layout shift as they load | see §3a raw-img list | Moving them to `next/image` (with width/height or `fill`) reserves space and fixes CLS in one go. |
| 🟡 | **LCP**: the likely LCP element (home hero text-image / first planet) is a raw `<img>` with no `priority`/preload | `components/home/Hero.tsx:50`, `PlanetSection.tsx` | Give the above-the-fold LCP image `priority` (next/image) or a `<link rel=preload>`; ensure fonts (Gooper, §3c) don't delay it. |

### 3e. Data / config
| Sev | Item | Fix |
|-----|------|-----|
| 🟡 | Verify `getHomepageData` runs broadcaster + Shopify + DB reads in parallel (not sequential awaits) | `lib/data/homepage.ts` |
| ⚪ | No `experimental.optimizePackageImports`, no explicit `Cache-Control` on static assets | `next.config.ts` (Next defaults are decent; low priority) |
| ⚪ | CSP uses `unsafe-inline`/`unsafe-eval` (documented launch-pragmatic) | hardening, not perf |

---

## 4. Per-view checklist
Legend: ✅ ok · ⚠️ needs work.

| View | H1 | Metadata | JSON-LD | Notable per-view fixes |
|------|----|----------|---------|------------------------|
| `/` home | ✅ (Hero) / ⚠️ mobile no h1 | ⚠️ none (layout default) | ⚠️ Organization/WebSite | favicon; wordmark/hero-text/footer-planet → next/image; CanvasStage mobile gate; reduced-motion |
| `/tv` | 🔴 none | ✅ | — | add h1; remote thumbnails → next/image; `force-dynamic` (expected) |
| `/magazine` | ✅ | ✅ | ⚠️ | article grid images ok; canonical strategy |
| `/magazine/[slug]` | ✅ (overlay) | 🔴 none (redirect) | 🔴 Article | generateMetadata + canonical + OG image + sitemap |
| `/events` + `[slug]` | ✅ | ⚠️/🔴 | 🔴 Event | per-event metadata; event overlay focus/dialog |
| `/lab` | ✅ | ✅ | — | images ok |
| `/shop` + `[handle]` | ✅ | ✅/🔴 | 🔴 Product | remotePatterns → next/image; per-product metadata; ProductOverlay focus trap; cart alt fallback |
| `/join-ralph` | 🔴 none | ✅ (no OG) | — | add h1; **form labels**; placeholder art alt |
| `/work-with-us` | ✅ | ⚠️ stale "Play" copy | — | update title/desc |
| `/contact` | ✅ | ✅ (no OG) | — | **Footer contact form labels + aria-live** |
| `/login`,`/account`,`/reset-password` | ✅ | ⚠️ noindex | — | noindex; login form is the reference impl |
| `/legal/*` | ✅ | ✅ | — | fine |
| `/jp/contact` | ✅ | ✅ (hreflang) | — | good reference; add reciprocal hreflang on English `/contact` |
| 404 / not-found | — | — | — | 🔴 no custom `not-found.tsx` — add branded 404 (noindex) |
| Global chrome | — | — | — | **skip link** + `<main id>`; MobileMenu focus trap/Escape; `<header>` landmark; `aria-current`; reduced-motion; Gooper preload; favicon/manifest/theme-color |

---

## 5. Recommended phased rollout
- **Phase 1 — Quick wins (S, ~½–1 day):** favicon set + web manifest + `theme-color` (#1), `remotePatterns` + move remote/local raw images to next/image (#2, also fixes CLS/LCP §3f), CanvasStage mobile gate (#4), sitemap fix + remove `/play` (#8), skip link + `<main id>` (#10), `/work-with-us` + home metadata, noindex auth pages, branded `not-found.tsx`, reciprocal hreflang on `/contact`, `aria-current`, Gooper preload, cart/globe alt fixes.
- **Phase 2 — Reduced-motion & focus (M):** global `prefers-reduced-motion` (CSS + framer + canvases + Starfield onto sequencer) (#3), MobileMenu focus trap/Escape/dialog (#5), ProductOverlay/event overlay focus, `<header>` landmark, TV/join-ralph h1s.
- **Phase 3 — Forms & content SEO (M/L):** Footer + Join Ralph labels/aria-live (#9), dynamic metadata + canonical for article/event/product (#6), JSON-LD (#7), per-route OG images.
- **Phase 4 — Perf deep cuts (M):** re-encode remaining large PNGs to WebP/AVIF, drop duplicate per-frame sprite folders, lazy-load swiper/Footer panel, `optimizePackageImports`, trim unused deps/font weights, contrast fixes after measurement.

## 6. Verification
- **Lighthouse** (mobile + desktop) on `/`, `/magazine`, `/shop`, an article, `/tv` — target ≥95 SEO/Best-Practices, ≥90 Perf, ≥95 A11y; compare before/after.
- **axe DevTools** / `@axe-core/playwright` pass on each view (0 serious/critical).
- **Keyboard-only** walkthrough of nav, mobile menu, all overlays, both forms; screen-reader smoke test (VoiceOver) of home + one article.
- **Reduced-motion**: toggle OS setting → confirm canvases/parallax/page-transitions calm down.
- **Rich Results Test** for the JSON-LD; **Search Console** sitemap re-submit.
- Re-run the image-weight script (`sharp` WebP/AVIF sizes) and confirm optimizer serves AVIF (`/_next/image?...` Content-Type) for remote + local images.
