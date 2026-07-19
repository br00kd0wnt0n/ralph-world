# Ralph World — Accessibility, SEO & Performance Audit
*2026-07-15 — pre-launch review*
*2026-07-18 — verified against current source; corrections applied inline (search "**[verified 07-18]**").*

## Context
Pre-launch review of the whole site to get **accessibility (WCAG 2.1 AA)**, **SEO**, and **load-speed/performance** to an excellent state. This is an inventory of every gap found across all views, each with severity, the file(s) involved, and the recommended fix.

Findings came from a full read-only sweep of `app/` and `components/`, then spot-verified against the actual source (layout, sitemap, robots, next.config, CanvasStage, and greps for JSON-LD / hreflang / reduced-motion / manifest / 404). Overall the codebase is in better shape than typical (icon buttons carry `aria-label`, decorative art is `aria-hidden`, focus-trap hook exists, images already partly on `next/image`, one shared rAF for canvases). The gaps are concentrated and fixable.

**Severity:** 🔴 High (launch-blocking / real user impact or major ranking loss) · 🟡 Medium · ⚪ Low (polish).
**Effort:** S (<1h) · M (a few hours) · L (day+).
**Status:** ✅ Done · ⏳ In progress · ☐ Not started. Completed items keep their original text with a ✅ prefix so the record stays intact.

---

## Progress log
*Running tally of what's shipped, newest first. Full detail against each item inline below.*

- **2026-07-19 (Phase 2)** — **Phase 2 COMPLETE (Reduced-motion & focus).** ✅ **Global reduced-motion** (#3): CSS blanket rule + per-canvas gates (CanvasStage/Midground/Foreground/Starfield) + `useParallax` flatten + `<MotionConfig reducedMotion="user">` + instant page transitions. ✅ **Starfield** hidden-tab pause (`visibilitychange`). ✅ **Events overlay** un-`aria-hidden`ed + arms/cards are labelled buttons + expanded panel is a focus-trapped `role="dialog"` with Escape. ✅ **MobileMenu** focus trap + Escape + dialog role. ✅ **ProductOverlay** focus trap + dialog role. ✅ **`<header>` banner** landmark around the nav. ✅ **h1s**: `/tv`, `/join-ralph`, home (+ section titles → `<h2>`); `MobileHome` confirmed dead code. ✅ **PlanetSection** fake `div role=link` → real links (CTA + sr-only planet-only link). ✅ **TVStatic** `aria-hidden` + **TV countdown** announces only at milestones.

- **2026-07-19 (batch 2)** — **Phase 1 substantially complete.** ✅ **CanvasStage mobile+theme gate** (#4): `cosy-dynamics` + `matchMedia('(min-width:768px)')` gate + `hidden md:block` — no full-viewport paint on phones. ✅ **Skip link + `<main id>`** (#10): visually-hidden "Skip to content" link (first focusable) targets `#main-content`. ✅ **Home metadata** + canonical (`app/page.tsx`, `absolute` title). ✅ **`/work-with-us`** title/description de-staled ("Play with Ralph" → "Work with Us") + canonical. ✅ **noindex auth pages**: `/login`, `/account` (metadata) + `/reset-password` (new thin server `layout.tsx`, since the page is a client component). ✅ **Branded `not-found.tsx`** (404, noindex, home/magazine CTAs). ✅ **Reciprocal hreflang**: `/contact` ↔ `/jp/contact` now a consistent cluster (fixed jp's `en` from `/` → `/contact`). ✅ **`aria-current="page"`** on active nav links (both desktop nav rows + MobileMenu Worlds). ✅ **Gooper Trial preload** (`<link rel=preload>` in `<head>`). ✅ **Alt fixes**: cart thumbnail falls back to product title; Globe frames `alt=""` + `aria-hidden`. **Remaining Phase 1:** only the deferred broadcaster/TV thumbnails (see #2).

- **2026-07-19** — ✅ **Sitemap rebuild** (Phase 1 #8): `app/sitemap.ts` now async — pulls published article slugs, active-event slugs, and Shopify product handles (all in parallel, error-guarded); dropped the dead `/play` and the `/subscribe` stub; added `/join-ralph`, `/work-with-us`, `/legal/*`, `/jp/contact`; real `lastModified` from `publishedAt`/`eventDate`. ✅ **robots.ts**: added `/reset-password` to disallow. ⏳ **`images.remotePatterns`** (Phase 1 #2): added `cdn.shopify.com` + `picsum.photos` (dev mock) and converted the 4 Shopify `<img>` (ProductCard / ProductOverlay ×2 / ProductDetail) → `next/image`. **Still open:** broadcaster/TV thumbnails (backend-authored presigned URLs on an unconfirmed host) — deliberately deferred until the runtime host is confirmed; those render in homepage/lab/events/play cards, not the shop/TV files.
- **2026-07-19** — ✅ **Favicon set** (Phase 1 #1): replaced the 420 KB PNG favicon with `app/favicon.ico` (15 KB) + `app/icon.png` (96px, 4 KB) + `app/apple-icon.png` (180px). Tab now loads ~15 KB instead of 426 KB. ✅ **Web manifest + theme-color** (Phase 1 #2): added `public/manifest.webmanifest` with 192 / 512 / maskable icons and `theme-color: #000000`. *(`ralph-logo.png` retained — still used as a real logo on login + article footer; those are Phase 4 image work.)*

---

## 0. Top priorities (do these first — high impact)

| # | Area | Item | Sev | Effort |
|---|------|------|-----|--------|
| 1 | Perf | ✅ `ralph-logo.png` is **420 KB / 800×800** shipped as the favicon — *done 07-19: proper favicon set + manifest* | 🔴 | S |
| 2 | Perf | ⏳ No `images.remotePatterns` → **all Shopify + TV images unoptimized** — *done 07-19 for Shopify (4 imgs → next/image); TV/broadcaster thumbnails deferred (host unconfirmed)* | 🔴 | S |
| 3 | A11y | ✅ **No `prefers-reduced-motion`** anywhere (heavy canvas/parallax/framer) — *done 07-19: CSS blanket + per-canvas gates + useParallax + MotionConfig + page transitions (see §2a)* | 🔴 | M |
| 4 | Perf | ✅ `CanvasStage` has **no mobile gating** — continuous full-viewport rAF paint on phones — *done 07-19: cosy-dynamics + `min-width:768px` gate + `hidden md:block`* | 🔴 | S |
| 5 | A11y | ✅ **MobileMenu**: no focus trap, no Escape, no initial focus — *done 07-19: focus trap + Escape + dialog role* | 🔴 | M |
| 6 | SEO | Dynamic routes (article/event/product) are **redirect stubs with no metadata** | 🔴 | M |
| 7 | SEO | **No JSON-LD** structured data (Organization, Article, Product, Event) | 🔴 | M |
| 8 | SEO | ✅ `sitemap.ts` is static, omits all content, lists a **dead `/play` URL** — *done 07-19: async, pulls articles/events/products, `/play` removed* | 🔴 | S |
| 9 | A11y | **Placeholder-only form labels** (Footer contact, Join Ralph) | 🔴 | M |
| 10 | A11y | ✅ **No skip-to-content link** — *done 07-19: skip link + `<main id="main-content">`* | 🟡 | S |

---

## 1. SEO

### 1a. Per-route metadata
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | Magazine article route is a bare `redirect()` → `/magazine?read=slug`; no `generateMetadata`, so every article shares the site default title/desc/OG | `app/magazine/[slug]/page.tsx` | Add `generateMetadata` (per-article title, description, canonical, OG image). Render real content at the slug URL instead of redirecting, OR keep redirect but emit metadata + canonical first. |
| 🔴 | Same pattern — no per-event metadata | `app/events/[slug]/page.tsx` | `generateMetadata` per event (name, date, location → also Event JSON-LD, §1d). |
| 🔴 | Same pattern — no per-product metadata | `app/shop/[handle]/page.tsx` | `generateMetadata` per product (title, price, image → Product JSON-LD). |
| 🟡 | ✅ Home page exports no `metadata` (uses layout default only) — *done 07-19: title (`absolute`)/description/canonical/OG added* | `app/page.tsx` | Add home-specific title/description/canonical/OG. |
| 🟡 | ✅ `/work-with-us` still titled "Play with Ralph" / "the agency arm" — *done 07-19: retitled "Work with Us" + copy + canonical* | `app/work-with-us/page.tsx` | Update title + description copy. |
| ⚪ | ✅ `/login`, `/account`, `/reset-password` have no `robots:{index:false}` — *done 07-19: metadata on login/account; new server `layout.tsx` for the client reset-password page* | those pages | Add noindex to auth pages (account/login already robots-disallowed; add reset-password). |
| ⚪ | ⏳ No `alternates.canonical` on **any** route. **[verified 07-18]** Original text said "except `/jp/contact`" — that route sets `alternates.languages`, not canonical. *07-19: canonicals added to `/`, `/work-with-us`, `/contact`, `/jp/contact`; remaining routes (incl. dynamic content) still open — see §1e.* | all routes | Add canonical per route (esp. the dynamic content — see §1e). |
| ⚪ | Per-page `twitter` never overridden; article/section Twitter cards show generic site title | section pages | Set `twitter.title/description` where OG is set (or a shared helper). |

### 1b. Global metadata — `app/layout.tsx` (mostly good)
| Sev | Item | Fix |
|-----|------|-----|
| ⚪ | `lang="en"` but OG locale `en_GB`; `/jp` served under `lang="en"` | Align locale; set `lang="ja"` on the JP surface (already done on jp/contact content). |
| ⚪ | ✅ Icons all point at one 800px PNG; no `.ico`, sized, or maskable icons; no `manifest.webmanifest`, no `theme-color` — *done 07-19: `app/{favicon.ico,icon.png,apple-icon.png}` + `public/manifest.webmanifest` (192/512/maskable) + `theme-color` via `viewport` export* | Add proper favicon set (`app/icon.png`/`apple-icon.png`), a web manifest, and `themeColor` (ties to Perf #1). |

### 1h. i18n / hreflang & 404
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🟡 | ✅ hreflang is one-directional: only `/jp/contact` declared `languages` — *done 07-19: `/contact` ↔ `/jp/contact` now a consistent cluster (`en`→`/contact`, `ja-JP`→`/jp/contact` on both); fixed jp's `en` from `/` → `/contact`* | `app/contact/page.tsx`, `app/jp/contact/page.tsx` | Add reciprocal `alternates.languages` on the paired English pages (at least `/contact`↔`/jp/contact`). |
| 🟡 | ✅ No custom `not-found.tsx` — 404s render Next's generic default — *done 07-19: branded `app/not-found.tsx` (noindex, home/magazine CTAs, transparent over the black body + starfield)* | `app/not-found.tsx` | Add a branded `app/not-found.tsx` with helpful links + `robots noindex`. |

### 1c. Sitemap & robots
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | ✅ Static list; no articles/events/products emitted — *done 07-19: async, pulls article slugs + active-event slugs + product handles in parallel* | `app/sitemap.ts` | Make sitemap async; pull published article slugs, event slugs, product handles from `lib/data/*` / Shopify. |
| 🔴 | ✅ Lists `/play` (route deleted → dead URL) — *done 07-19: removed; `/work-with-us` added* | `app/sitemap.ts` | Remove; add `/work-with-us`. |
| 🟡 | ✅ Lists `/subscribe` (a redirect stub) — *done 07-19: dropped* | `app/sitemap.ts` | Drop or replace. |
| 🟡 | ✅ Omits `/join-ralph`, `/work-with-us`, `/legal/*`, `/jp/contact` — *done 07-19: all added* | `app/sitemap.ts` | Add real indexable pages. |
| ⚪ | ✅ Every entry `lastModified: new Date()` — *done 07-19: articles use `publishedAt`, events use `eventDate`; products fall back to now (no `updatedAt` exposed)* | `app/sitemap.ts` | Use real `updatedAt` where available. |
| ⚪ | ✅ robots disallows `/account`,`/login` but not `/reset-password` — *done 07-19: added* | `app/robots.ts` | Add reset-password (and any auth stubs). |

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
| 🔴 | ✅ `/tv` renders **no heading at all** (no h1) — *done 07-19: renders the `heading` prop (fallback "Ralph TV") as an `sr-only` h1* | `components/tv/RalphTVClient.tsx` | Render an `<h1>` (visually-hidden if design has no title). |
| 🟡 | ✅ `/join-ralph` has no h1 (starts at h2) — *done 07-19: `sr-only` h1 "Join Ralph"* | `components/join-ralph/JoinRalphClient.tsx` | Add an h1 (visually-hidden ok). |

---

## 2. Accessibility (WCAG 2.1 AA)

### 2a. Motion / reduced-motion 🔴 (biggest single gap) — ✅ DONE 07-19
- No `prefers-reduced-motion` handling site-wide. `lib/animation/page-transitions.ts:148` defines `reducedMotionVariants` but it's **never used**.
- **Fix (M) — shipped in five layers:**
  - ✅ CSS `@media (prefers-reduced-motion: reduce)` blanket rule in `globals.css` → neutralises all CSS animation/transition + smooth scroll.
  - ✅ `PageTransitionWrapper` uses `useReducedMotion()` → page nav becomes an instant cut.
  - ✅ Each canvas (`Starfield`, `CanvasStage`, `MidgroundCanvas`, `ForegroundCanvas`) early-returns on `matchMedia('(prefers-reduced-motion: reduce)')` → no rAF paint.
  - ✅ `useParallax` returns flat `0` → no scroll drift.
  - ✅ `<MotionConfig reducedMotion="user">` in `app/providers.tsx` → every framer-motion component (incl. MobileMenu decor floats + all 31 files) honours the OS setting in one place.
  - *Note: `reducedMotionVariants` in page-transitions.ts is still unused/dead — the explicit `useReducedMotion` path + MotionConfig supersede it; safe to delete later.*

### 2b. Focus & keyboard
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | ✅ MobileMenu: no focus trap, no Escape, focus not moved in — *done 07-19: `useFocusTrap` on the menu panel + Escape-to-close + `role="dialog"`/`aria-modal`/`aria-label`; focus restores to the burger on close* | `components/layout/MobileMenu.tsx` | Reuse `hooks/useFocusTrap.ts` (already used by 5 other overlays); add Escape-to-close + `role="dialog"`/`aria-modal`. |
| 🟡 | No skip-to-content link; also `<main>` has **no `id`** to target | `app/layout.tsx:89` (main has no id) | Add a visually-hidden "Skip to content" link as the first focusable element → give `<main id="main">` and link to `#main`. |
| 🟡 | ✅ `ProductOverlay` has Escape but no focus trap and no dialog semantics — *done 07-19: `useFocusTrap` + `role="dialog"`/`aria-modal`/`aria-label`* | `components/shop/ProductOverlay.tsx` | Add `useFocusTrap` + `role="dialog"`/`aria-modal`. |
| 🔴 | ✅ Event info overlay is entirely inaccessible. **[verified 07-18]** Was 🟡 "verify focus/Escape" — but the `MinglingCharacters` root carried `aria-hidden="true"`, so event content was invisible to screen readers. *done 07-19: removed root `aria-hidden` (kept it on the decorative crowd + duplicate mobile arm); arms (desktop) + cards (mobile) are now labelled `role="button"` triggers (Enter/Space); expanded panel is a `role="dialog"` `aria-modal` with `useFocusTrap` + Escape.* | `components/events/MinglingCharacters.tsx` | Take the interactive arms/panels out from under `aria-hidden` (keep it only on the decorative mingling crowd), then add focus trap + Escape + `role="dialog"`/`aria-modal` on the expanded panel. |
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
| 🟡 | ⏳ Cart/gallery product thumbnails fall back to empty alt | `CartDrawer.tsx` (`altText ?? ''`), `ProductOverlay.tsx:142` (hardcoded `alt=""`) | Fall back to product title, not `''`. **[verified 07-18]** ProductOverlay's *main* image already falls back to `product.title`; only the thumbnail strip is `alt=""`. *07-19: CartDrawer now falls back to product title; ProductOverlay thumbnail strip still `alt=""` (decorative — main image is labelled).* |
| 🟡 | Article body images default `alt=""` | `components/magazine/BlockRenderer.tsx` — 2-col (108,127) + carousel (206) hardcode `alt=""`; 1-col + text-wrap use `caption ?? ''` | Require/author alt in CMS; don't silently blank editorial images. **[verified 07-18]** Part code (hardcoded `''`), part data (empty only when caption absent). |
| 🟡 | SubscribeModal placeholder art `<div>`s ("satellite/alien/mag cover") | `SubscribeModal.tsx:94-161` | When real art lands, set alt / `aria-hidden`. |
| ⚪ | ✅ Globe inner `alt="Globe"` redundant (button already labelled) — *done 07-19: both frame sets now `alt="" aria-hidden`* | `Globe.tsx` | `alt=""`. |

### 2e. Landmarks / headings / state
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🟡 | ✅ No `aria-current` on active nav links (color/underline only) — *done 07-19: added to both desktop nav rows + MobileMenu Worlds links* | `Nav.tsx`, `MobileMenu.tsx` | Add `aria-current="page"` (LegalNav already does). |
| 🟡 | ✅/n/a Mobile home starts at h3, no h1/h2 — **[verified 07-19]** `MobileHome.tsx` is **dead code** (imported nowhere); mobile home is the same Hero+PlanetSection as desktop, now covered by the home h1. | `components/home/MobileHome.tsx` | Ensure one h1 per rendered page; fix order. |
| 🟡 | ✅ Desktop home jumps h1→h3 (section titles are h3, title art outside headings) — *done 07-19: added `sr-only` h1 in `app/page.tsx`; section title art wrapped in `<h2>` (+ fallback h3→h2)* | `PlanetSection.tsx`, `app/page.tsx` | Normalise heading levels. |
| 🟡 | ✅ No `<header>`/`role="banner"` around the nav — *done 07-19: utility bar + nav wrapped in `<header>`* | `Nav.tsx` | Wrap top nav in `<header>`. |
| 🟡 | ✅ `PlanetSection` uses `div role="link" tabIndex=0` as a link — *done 07-19: removed fake-link attrs (kept `onClick` as mouse enhancement); real nav is the CTA `<Button>` (≥768) + an sr-only `<Link>` in the planet-only view. Fixes the invalid nested-interactive too.* | `PlanetSection.tsx` | Prefer a real `<Link>`. |
| ⚪ | ✅ `TVStatic` canvas missing `aria-hidden` — *done 07-19* | `components/tv/TVStatic.tsx` | Add `aria-hidden`. |
| ⚪ | ✅ TV countdown uses `aria-live="polite"` on a per-second counter — *done 07-19: visible badge now `aria-hidden`; a sibling `role=status` live region announces only at 60s/30s/10s milestones* | `components/tv/TVSet.tsx` | Throttle announcements / use `aria-live` on a coarser element. |

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
| 🔴 | ✅ Favicon is a **420 KB / 800×800** PNG — *done 07-19: favicon set + manifest; tab now ~15 KB* | `public/ralph-logo.png` (used `app/layout.tsx:41-44`) | Generate a small favicon set (32/180/512 + maskable) via `app/icon.png`/`apple-icon.png` or a tiny `.ico`. |
| 🔴 | ⏳ No `images.remotePatterns` → Shopify + broadcaster images all raw `<img>`, fully unoptimized — **[verified 07-18]** the shop/TV component files contain only 4 remote imgs (all Shopify); broadcaster thumbnails actually render in homepage/lab/events/play cards. *done 07-19: added `cdn.shopify.com` + `picsum.photos` remotePatterns; converted ProductCard / ProductOverlay (main + thumb) / ProductDetail → `next/image`. **Open:** broadcaster thumbnails — host is backend-authored (likely presigned object-store); confirm the runtime host (or leave `unoptimized`) before converting.* | `next.config.ts`; `components/shop/*`; broadcaster-thumbnail cards | Add `remotePatterns` (Shopify CDN + broadcaster host), then move those to `next/image` (AVIF/WebP + resize + lazy). |
| 🟡 | `article_lead.png` **288 KB / 502×310** | `public/imgs/article_lead.png` | Re-encode WebP/AVIF (prior test: →~7 KB) or serve via optimizer. |
| 🟡 | **Five** `planet_*.png` (822px, 116–172 KB) often rendered smaller. **[verified 07-18]** Was "six" — the sixth conflated `planet_creative.png` (next row). | `public/imgs/planet_{events,lab,mag,shop,tv}.png` | Already partly `next/image`; finish + they'll resize/AVIF. |
| 🟡 | `planet_creative.png` is 1500×1486 | `public/imgs/planet_creative.png` | Resize to display size. |
| 🟡 | Remaining local raster raw `<img>` (hero text, footer planet, event chars). **[verified 07-18]** Removed "wordmark" — `Nav.tsx` already uses `next/image` for the wordmark (its raw `<img>` is the basket icon). | `Hero.tsx`, `FooterPlanet.tsx`, `MinglingCharacters.tsx` | Move to `next/image` where layout allows (local-guarded pattern already used in `PlanetSection`). |
| 🟡 | Oversized sprite sheets decode huge in memory: `saucer.png` 13464×246 (~13 MB RGBA), `satellite.png` 10528×282 (~12 MB) | `public/animations/` | Consider fewer frames / smaller cells / on-demand. |
| ⚪ | Duplicate assets: both packed sheet **and** per-frame folders shipped (`satelite/` 1016K, `saucer/` 584K, `got-coin/` 404K) | `public/animations/*/` | Remove the unused per-frame folders from the deployed bundle. |

### 3b. Animations / runtime
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🔴 | ✅ `CanvasStage` has **no mobile gating** — full-viewport (`fixed inset-0`) paint on phones. **[verified 07-18]** It does NOT run its own rAF — it registers with the shared sequencer (`registerTicker`), so it *does* pause on hidden tab; the cost is the unthrottled per-frame full-viewport clear/redraw on mobile. *done 07-19: `cosy-dynamics` + `matchMedia('(min-width:768px)')` gate (effect early-returns → no ticker) + `hidden md:block` on the canvas.* | `components/anim/CanvasStage.tsx` | Add `matchMedia('(min-width:768px)')` + theme gate like the other canvases; consider not registering the ticker while hidden. |
| 🔴 | ✅ `Starfield` runs its **own** rAF (not the sequencer) → no hidden-tab pause. **[verified 07-18]** Confirmed — this is the one canvas that genuinely opts out of the shared sequencer's visibility pause (cf. CanvasStage, which is on it). *done 07-19: added a `visibilitychange` guard that cancels the rAF when `document.hidden` and resumes on focus (+ reduced-motion gate from §2a).* | `components/layout/Starfield.tsx` | Move onto `lib/anim/sequencer.ts` (gets visibility pause) or add its own `visibilitychange` guard. |
| 🟡 | Canvas actors run regardless of on-screen/scroll; LCP work during initial homepage render | canvases | Defer start / pause when scrolled away; respect reduced-motion (§2a). |

### 3c. Fonts
| Sev | Item | File | Fix |
|-----|------|------|-----|
| 🟡 | ✅ Gooper Trial (`@font-face`) not preloaded though used above the fold — *done 07-19: `<link rel=preload as=font crossorigin>` for the woff2 in `<head>`* | `app/layout.tsx`, `app/globals.css` | `<link rel="preload" as="font" ... crossorigin>` for the woff2. |
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
| ⚪ | `getHomepageData` **[verified 07-18]** — the four core reads (magazine/events/lab/TV) already run in `Promise.all`; only `readPicks()` (before, feeds pick IDs) and `getShopItems()` (after) are sequential bookends. Low priority; could fold shop read into the parallel batch if pick handles are known earlier. | `lib/data/homepage.ts` |
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
| `/events` + `[slug]` | ✅ | ⚠️/🔴 | 🔴 Event | per-event metadata; 🔴 event panels are under `aria-hidden` (invisible to SR — see §2b); then add focus/dialog |
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
- **Phase 1 — Quick wins (S, ~½–1 day): ✅ COMPLETE (07-19)** — one item deferred. Shipped: ✅ favicon set + web manifest + `theme-color` (#1); ✅ CanvasStage mobile gate (#4); ✅ sitemap fix + remove `/play` (#8) + robots `/reset-password`; ✅ skip link + `<main id>` (#10); ✅ `/work-with-us` + home metadata (+ canonicals); ✅ noindex auth pages; ✅ branded `not-found.tsx`; ✅ reciprocal hreflang on `/contact`↔`/jp/contact`; ✅ `aria-current`; ✅ Gooper preload; ✅ cart/globe alt fixes. ⏳ **Deferred:** `remotePatterns`/next-image for **broadcaster/TV thumbnails** only (Shopify done; broadcaster host must be confirmed at runtime first — #2).
- **Phase 2 — Reduced-motion & focus (M): ✅ COMPLETE (07-19)** — global `prefers-reduced-motion` (CSS + framer MotionConfig + canvases + Starfield visibility guard + parallax) (#3), MobileMenu focus trap/Escape/dialog (#5), ProductOverlay + event-overlay focus/dialog, `<header>` landmark, TV/join-ralph/home h1s + heading order, PlanetSection real links, TVStatic aria-hidden + TV countdown throttle.
- **Phase 3 — Forms & content SEO (M/L):** Footer + Join Ralph labels/aria-live (#9), dynamic metadata + canonical for article/event/product (#6), JSON-LD (#7), per-route OG images.
- **Phase 4 — Perf deep cuts (M):** re-encode remaining large PNGs to WebP/AVIF, drop duplicate per-frame sprite folders, lazy-load swiper/Footer panel, `optimizePackageImports`, trim unused deps/font weights, contrast fixes after measurement.

## 6. Verification
- **Lighthouse** (mobile + desktop) on `/`, `/magazine`, `/shop`, an article, `/tv` — target ≥95 SEO/Best-Practices, ≥90 Perf, ≥95 A11y; compare before/after.
- **axe DevTools** / `@axe-core/playwright` pass on each view (0 serious/critical).
- **Keyboard-only** walkthrough of nav, mobile menu, all overlays, both forms; screen-reader smoke test (VoiceOver) of home + one article.
- **Reduced-motion**: toggle OS setting → confirm canvases/parallax/page-transitions calm down.
- **Rich Results Test** for the JSON-LD; **Search Console** sitemap re-submit.
- Re-run the image-weight script (`sharp` WebP/AVIF sizes) and confirm optimizer serves AVIF (`/_next/image?...` Content-Type) for remote + local images.
