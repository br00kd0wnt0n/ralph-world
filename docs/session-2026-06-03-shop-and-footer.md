# Session 2026-06-03: Shop product detail, deep links, footer redesign

## Overview

Four streams of work today:

1. **Magazine** — applied the Next.js 16 `History.prototype.pushState`
   bypass to the article overlay so opening an article no longer triggers
   a soft navigation + page reload.
2. **Shop** — full product detail rebuild. Removed the full-screen
   overlay in favour of an inline cross-fade detail view. Added deep
   linking via `/shop/[handle]`. New Swiper-based image gallery using
   `shop_product_container.png` as the frame. Wired the `custom.date`
   metafield through to listing card + detail. Magazines tab now ordered
   by the curated Shopify Magazines collection. Listing card and detail
   typography to spec; all copy on white normalised to `#000000`.
3. **Page-fill polish** — Shop / Events / TV sections now use
   `min-height: calc(100svh - 200px)` so their white background reaches
   the footer on tall viewports. Events additionally anchors its
   characters block to the bottom of the section via flex column +
   `mt-auto`.
4. **Footer redesign** — fixed-position footer with a 103px bar
   ("footer-top") that's always visible and an expandable Swiper panel
   ("footer-bottom") containing offices + contact form. Globe and "Contact
   us" trigger their respective slides.

Plus housekeeping: `npm install` to pick up `bcryptjs` after Brook's auth
changes landed.

---

## 1. Magazine — article overlay URL fix

File: [components/magazine/ArticleOverlay.tsx](../components/magazine/ArticleOverlay.tsx)

**Problem.** Opening an article via the magazine grid pushed the URL to
`/magazine/[slug]` via `window.history.pushState`, but the page would
visibly reload and the overlay would disappear.

**Cause.** Next.js 16's App Router patches `window.history.pushState` and
treats the path change as a soft navigation. That fetched the RSC for
`/magazine/[slug]/page.tsx`, which `redirect()`s back to
`/magazine?read=slug` — triggering the FrozenRouter page-exit fade and
re-mounting the page. Local overlay state (`overlayOpen`) was lost in the
re-mount.

**Fix.** Replace both pushState calls with the un-patched prototype
method:

```ts
History.prototype.pushState.call(
  window.history,
  null,
  '',
  `/magazine/${article.slug}`,
)
```

`window.history.pushState` is an own-property added by Next.js's router
patch. `History.prototype.pushState` is the original native method.
Calling it via `.call(window.history, …)` updates the URL bar at the
browser level without notifying the router — no soft nav, no fade, no
re-mount.

Same fix pattern previously applied to `MinglingCharacters.tsx` and now
to the shop deep links.

---

## 2. Shop — product detail rebuild + deep links

### 2.1 Inline ProductDetail (replaced ProductOverlay)

File: [components/shop/ProductDetail.tsx](../components/shop/ProductDetail.tsx) (new) +
[components/shop/ShopClient.tsx](../components/shop/ShopClient.tsx)

The previous `ProductOverlay` was a full-screen fixed overlay portalled
on top of the listings. Replaced with an inline detail view rendered in
the same content area as the listings; the two cross-fade via
`<AnimatePresence mode="wait">` with `key="listings"` ↔
`key={product-id}` motion.divs (250ms opacity).

Wrapper: `max-w-5xl mx-auto px-6 pt-2 pb-16 md:pb-12`. Extra 16px of
bottom padding on mobile so the detail clears the fixed footer (matches
the listing's extra-bottom-padding pattern).

### 2.2 Deep links + URL sync

| File | Role |
|---|---|
| [app/shop/[handle]/page.tsx](../app/shop/%5Bhandle%5D/page.tsx) (new) | Server `redirect()` from `/shop/[handle]` → `/shop?product=handle`. Handles direct deep links, refreshes, shared URLs. |
| `ShopClient.tsx` mount effect | Reads `?product=handle` from URL → fetches the product → opens the detail → `History.prototype.replaceState`s the nice slug URL back. |
| `openProduct(handle)` | `History.prototype.pushState` to `/shop/[handle]`, then fetch + show detail. |
| `closeProduct()` | `History.prototype.pushState` back to `/shop`, clear `selectedProduct`. |
| `popstate` listener | Closes the detail on browser back/forward. |

Same App Router bypass as magazine and events. Direct URLs land on the
detail view; opening a product from listings doesn't trigger a soft nav.

### 2.3 Swiper image gallery

Replaced the old framed thumbnail strip with a Swiper carousel:
- **Slides**: one `<SwiperSlide>` per `product.images` edge, falling back
  to `product.featuredImage` if `images` is empty. Image fits via
  `object-cover`.
- **Aspect ratio**: container is `aspectRatio: '1176 / 748'` (landscape,
  per design). `min-w-0` + `w-full` on the wrapper so Swiper doesn't
  blow past its grid column on phones (CSS Grid `min-width: auto`
  workaround).
- **Frame removed** — no `border / bg-white` chrome around the image.
- **Custom pagination** — Swiper's default dots are off. React tracks
  `activeIndex` via `onSlideChange`; bullets render below as `<button>`s
  using `bullet_on.svg` / `bullet_off.svg` (16×16). Clicking a bullet
  calls `swiperRef.current.slideTo(i)`.
- **SOLD OUT scrim** kept, now `z-10 pointer-events-none` so it overlays
  without intercepting Swiper drag.

### 2.4 ProductDetail typography & spacing

Right column stacks: title → date (optional) → description →
buy/sold-out block → subscribe upsell. 32px between groups.

| Element | Spec |
|---|---|
| Title | Gooper Trial 600 / 32px / 100% line-height / 0 letter-spacing, black. `mb-2` when a date follows (tight pair), `mb-8` when not. |
| Date metafield | Roboto 600 / 22px / 32px line-height / 0 letter-spacing, black. `mb-8` so there's 32px between the title-group and the description. |
| Description | Roboto 600 / 16px / 23px line-height / 0 letter-spacing, black. `mb-8`. |
| Back button | `< Back`, Gooper Trial 600 / 18px / 100% line-height / 0 letter-spacing, **ralph-pink**. `mb-[22px]`. |
| Subscribe upsell paragraph | Roboto 400 (Regular) / 16px / 23px line-height / 0 letter-spacing, black. 32px before + 32px after. |

### 2.5 Buy now CTA

Now uses the shared [Button](../components/ui/Button.tsx) component for
the homepage planet-panel shadow-press effect. Two changes to `Button`:

- New optional `minWidth?: number` prop (defaults to existing 170px).
  Buy now CTA passes `minWidth={230}`.
- Existing `<button>` already had `type="button"` from a previous pass
  (defensive against form-submit reloads).

Label now reads **"Buy now for £X"** — the separate price row above the
button is gone.

### 2.6 Subscribe upsell

Below the buy block (any state — available, sold out, demo):

```
"Love the idea of getting a shiny new Ralph Mag every quarter posted
 through your letterbox? Then subscribe to Ralph, then upgrade to
 'full Ralph'"

[Subscribe now]  ← shared Button, minWidth 230, href="/join-ralph"
```

### 2.7 Listing card rebuild

File: [components/shop/ProductCard.tsx](../components/shop/ProductCard.tsx)

Old card: bordered white box with a 1:1 photo, title + price below.
New card:

- **Width**: `w-full md:w-[224px]` — fills the 2-col grid track on
  mobile, locks to 224px on desktop.
- **Framed image** — `shop_product_container.png` (448 × 612, scaled to
  half) sits on top of the product photo as a decorative border.
  Image is `object-cover` inside `aspectRatio: '448 / 612'`. Layering
  back-to-front: photo → SOLD OUT scrim → frame PNG → diagonal badge
  ribbon (NEW/HOT/LIMITED).
- **Title / date / price** moved **below** the framed image (no
  internal padding container).

Typography on the card, responsive:

| Element | Mobile | md+ |
|---|---|---|
| Title (Gooper Trial 600 / line-height 1.3) | 20px | 24px |
| Date metafield (Roboto 600) | 14 / 22px | 16 / 26px |
| Price (Gooper Trial 600) | 18 / 28px | 22 / 37px |

The `line-height: 1.3` on the title deviates from the 100% spec — needed
for Gooper Trial's descenders (g/p/y) to clear the `line-clamp-4`
bottom edge.

### 2.8 Listing grid + page padding

File: `ShopClient.tsx`

- Grid:
  - `< 768px`: `grid-cols-2 gap-4` (16px gap).
  - `>= 768px`: `grid-cols-[repeat(auto-fill,224px)] gap-16` (64px gap),
    `justify-center` so tracks stay centred.
- Grid wrapper top padding bumped to 64px (gap between category
  filters and first row).
- Grid wrapper bottom padding bumped to 96px on mobile (`pb-24`),
  32px on desktop — extra footer clearance, matches the listing's
  earlier pattern.
- Section content `paddingTop` reduced from 200 → 120.

### 2.9 Category filter polish

- Active text colour: **stays black** in every state (matches the
  magazine pattern).
- Underline graphic: `<span>` replaced with `underline_shop.svg`
  (118 × 11, 80% of the nav-natural 148 × 14). Label wrapped in
  `relative z-10`, underline `z-0` — line sits **behind** the text.

### 2.10 Magazines tab — sourced from the curated Shopify collection

File: [app/shop/page.tsx](../app/shop/page.tsx)

Page now fetches the `magazines` Shopify collection in parallel with the
full catalogue. If the collection returns at least one product, it
overrides the auto-categorised magazine bucket so the manual sort order
set in Shopify Admin is respected. Falls back to the productType-based
bucket if the collection is missing/empty. Merch + random buckets are
deduped against the magazine handles to avoid double-display.

### 2.11 Custom `Date` metafield — wired through

Brook added a free-text `Date` metafield in Shopify Admin per product
(e.g. "Summer 2026"). Pipeline added:

| File | Change |
|---|---|
| [lib/shopify/queries.ts](../lib/shopify/queries.ts) | `PRODUCT_FRAGMENT` now requests `dateMetafield: metafield(namespace: "custom", key: "date") { value type }`. |
| [lib/shopify/types.ts](../lib/shopify/types.ts) | `ShopifyProduct.dateMetafield: { value, type } \| null`; `ProductSummary.date: string \| null`. |
| [lib/shopify/client.ts](../lib/shopify/client.ts) | `toProductSummary()` lifts `p.dateMetafield?.value ?? null` onto the summary. |
| [lib/shopify/mock.ts](../lib/shopify/mock.ts) | Mock builder + summary updated for type compliance. |
| `ProductCard.tsx` | Renders `product.date` between title and price (Roboto 600). |
| `ProductDetail.tsx` | Renders `product.dateMetafield?.value` below the title (Roboto 600 / 22 / 32). |

**Storefront access** must be toggled ON for the metafield definition in
Shopify Admin (Settings → Custom data → Products) for the value to come
through — without that, the Storefront API returns `null` even when the
field has a value.

---

## 3. Page-fill polish — sections reach the footer

Files: [components/shop/ShopClient.tsx](../components/shop/ShopClient.tsx),
[components/events/EventsClient.tsx](../components/events/EventsClient.tsx),
[components/tv/RalphTVClient.tsx](../components/tv/RalphTVClient.tsx)

**Problem.** On tall viewports (iMac, big monitors) the shop / events /
TV pages had a dark gap between the bottom of the section's white
background and the footer — the section element ended where content
ended.

**Fix.** Each section now has `min-height: calc(100svh - 200px)`, so the
white background layer extends to the footer. 200px is a placeholder
for SectionIntro + footer total — easy to tweak.

Per-page nuance:

- **Shop**: just the min-height — product content stays at the top of
  the content area.
- **Events**: `min-height` + `flex flex-col` on the section, plus
  `mt-auto` on the content layer. The characters/hands block now
  anchors to the **bottom** of the section so on tall viewports it
  sits flush with the footer (white bg fills the gap above) rather
  than leaving a band of white below the characters.
- **TV**: just the min-height. Kept the existing `marginTop: 32` on the
  section.

The dropdown z-index work from an earlier session ensures the
PinkDropdown panels (now portalled) still render above everything.

---

## 4. Footer redesign — fixed bar + expandable Swiper panel

File: [components/layout/Footer.tsx](../components/layout/Footer.tsx)

### 4.1 Structure

Two-part footer, both inside a single `<footer>` element fixed at the
bottom of the viewport:

```tsx
<footer className="fixed bottom-0 left-0 right-0 z-10">
  {/* footer-top: 103px bar, always visible */}
  <div className="bg-black h-[103px] ..." style={{ borderTop: '4px solid #EA128B' }}>
    <Globe button />   {/* left */}
    <Contact us button + social icons />   {/* right */}
  </div>

  {/* footer-bottom: expandable panel */}
  <motion.div
    initial={false}
    animate={{ height: panelOpen ? 'auto' : 0 }}
    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    className="bg-black overflow-hidden"
  >
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100svh - 103px)' }}>
      ...close button + Swiper with 2 slides...
    </div>
  </motion.div>
</footer>
```

**Animation behaviour.** When closed, panel height is `0`; only the
103px bar is visible at the viewport bottom. When opened, panel height
animates `0 → auto`. Because the footer is anchored at `bottom: 0`, the
bar slides UP as the panel grows below it. Only `height` animates —
no opacity fade — so the black background is solid the whole time.

### 4.2 Triggers

| Trigger | Behaviour |
|---|---|
| **Globe button** | `swiperRef.current.slideTo(0, panelOpen ? undefined : 0)` + `setPanelOpen(true)` — slide to offices, open panel. Slide is **instant** (speed 0) when opening from closed state, animated when already open. |
| **"Contact us" button** | Same pattern, `slideTo(1)` — slide to contact form. |
| **X button** (top-right of panel) | `setPanelOpen(false)`. Only way to close. |

The Swiper is always mounted (just collapsed via height); since
`swiperRef` is set on initial mount, `slideTo` works regardless of
panel state.

### 4.3 Panel content — two Swiper slides

| Slide | Content |
|---|---|
| **0 — Offices** | 4-column grid (London, U.S.A., Tokyo, Mumbai) on `md+`, 2-column on mobile. Each office: city label in Gooper Trial 600/24px (uppercase), address lines in Roboto 600/14/22. Office data is a static `OFFICES` array at the top of `Footer.tsx`. |
| **1 — Contact form** | Native `<form>` with `<select>` Select Enquiry (5 options), Name, Email, Message textarea, Submit button. All inputs styled: white bg, 2px ralph-pink border, `rounded-xl`, `placeholder-gray-500`. Submit button uses the same shadow-press visual as the shared Button (inline styles). `noSwipingSelector="input, textarea, select, button, a"` on Swiper so form interactions don't trigger swipe. |

Form submission currently `console.log`s — wire to `/api/contact` (or
similar) when ready.

### 4.4 Layout impact — global `pb-[100px]`

File: [app/layout.tsx](../app/layout.tsx)

`<main>` got `pb-[100px]` so the 103px fixed bar doesn't cover the last
~100px of any page's content. Single line, applies universally.

---

## Other small things

- **bcryptjs** installed via `npm install` after Brook's auth changes
  landed and the dev build broke with "Module not found: Can't resolve
  'bcryptjs'". The dependency was declared in package.json but
  node_modules was stale.

---

## Files touched today

### New
- `app/shop/[handle]/page.tsx`
- `components/shop/ProductDetail.tsx`
- `public/imgs/shop_product_container.png`
- `public/imgs/bullet_on.svg`, `public/imgs/bullet_off.svg`
- `docs/session-2026-06-03-shop-and-footer.md` (this doc)

### Modified
- `app/layout.tsx` — `pb-[100px]` on `<main>`
- `app/shop/page.tsx` — Magazines collection fetch + override
- `components/events/EventsClient.tsx` — section `min-h`, flex-col, content `mt-auto`
- `components/layout/Footer.tsx` — full rebuild (fixed bar + Swiper panel)
- `components/magazine/ArticleOverlay.tsx` — History.prototype.pushState bypass
- `components/shop/ProductCard.tsx` — framed image card, responsive type, all-black copy
- `components/shop/ShopClient.tsx` — inline detail swap, URL deep links, mobile grid
- `components/tv/RalphTVClient.tsx` — section `min-h`
- `components/ui/Button.tsx` — `minWidth` prop
- `lib/shopify/client.ts` — `date` on ProductSummary
- `lib/shopify/mock.ts` — `dateMetafield: null` + `date: null`
- `lib/shopify/queries.ts` — `dateMetafield` on PRODUCT_FRAGMENT
- `lib/shopify/types.ts` — `dateMetafield` on ShopifyProduct, `date` on ProductSummary

### Memory saved
- `feedback_copy_on_white.md` — copy on white surfaces defaults to `#000000` unless a spec says otherwise.

---

## Open follow-ups

- **`pb-[100px]` on `<main>`** is a placeholder for the 103px bar. Bump
  to `pb-[103px]` if you start seeing the bottom 3px of content tucked
  behind the pink border.
- **Contact form `handleSubmit`** logs to console; wire to a real
  endpoint (Resend? Mailgun? A `/api/contact` route?) before launch.
- **`components/shop/ProductOverlay.tsx`** is now orphaned — safe to
  delete on a future cleanup pass.
- **Swiper inner-panel scrollbar**: the inner div has
  `overflow-y-auto` + `maxHeight: calc(100svh - 103px)` so very tall
  form content (e.g. mobile with the keyboard open) can scroll within
  the panel. If a phantom scrollbar appears when the panel is closed
  on small phones, wrap that overflow + maxHeight in a `panelOpen ?
  ... : {}` conditional. Not seen in testing today.
- **min-height on shop/events/tv sections** uses `calc(100svh - 200px)`
  as a placeholder. Once the SectionIntro + bar heights settle, dial
  the subtraction in per page (TV has no SectionIntro and could go to
  `calc(100svh - 100px)`).
- **Shopify Admin** needs Storefront access toggled ON for the
  `custom.date` metafield definition for the dates to surface. Empty
  panels in the listing are unset data, not a pipeline bug.
