# Session 2026-06-27 (pt.2): Image perf, loading flash, cursor & join-ralph cover

A follow-up pass focused on asset weight and a few UX fixes.

---

## Images → AVIF via `next/image`

Most raster images were raw `<img>` (only 4 files used `next/image`), so they
bypassed Next's optimizer — no AVIF/WebP, no resize-to-display.

- **`next.config.ts`**: `images.formats = ['image/avif', 'image/webp']` so the
  optimizer prefers AVIF.
- Converted the large **local** assets to `next/image`:
  - `PlanetSection` planet image, `CoverStory` cover, `ArticleGrid` card image
    — each **local-guarded**: `next/image` for local srcs (`/...`), plain
    `<img>` for remote CMS/Shopify URLs (no `remotePatterns` needed → no risk of
    breaking remote images).
  - `BlockRenderer` ralph-logo signoff (login already used `next/image`).

### Measured (dev optimizer, AVIF, at display size)
| asset | raw PNG | next/image AVIF | saving |
| ----- | ------: | --------------: | -----: |
| planet_mag.png | 175 KB | 68 KB (@2×) / 61 KB | ~61% |
| article_lead.png | 292 KB | 7 KB | ~98% |
| ralph-logo.png (48px) | 426 KB | ~4 KB | ~99% |

Homepage planets (~725 KB of PNG) drop to ~320 KB AVIF (~55%), more on mobile
since the 822px sources are now resized to the displayed 220–411px.

**Not done (follow-ups):** remote CMS/Shopify images stay as `<img>` — would
need `images.remotePatterns` for those hosts to optimize them too. The favicon
still serves the 426 KB `ralph-logo.png` un-optimized (Next doesn't optimize
favicons) — a small dedicated `icon` asset would help.

---

## Page-transition white rectangle (subpages)

Navigating to a planet subpage (magazine/tv/lab/events/shop) flashed a **large
white rectangle before the content**. Cause: each route's `loading.tsx` skeleton
painted a big `bg-gray-100` block (plus `bg-gray-200` placeholders) while the
server component fetched data — reads as a white slab on the dark theme.

Fix: **deleted the five subpage `loading.tsx` skeletons**. They now fall back to
the transparent global `app/loading.tsx` (`min-h-screen`, no background), so
during navigation there's just the dark space, then the content — no flash.

---

## Cursor affordance

Tailwind v4's preflight no longer forces `cursor: pointer` on `<button>` (browser
default is the arrow), so most buttons showed the default cursor. Added a base
rule in `globals.css` restoring it on `button`/`[role="button"]`/`summary`
(disabled excluded). Links already get pointer from the browser.

---

## Join Ralph — magazine cover

- The left "mag cover" decoration (behind the JOIN RALPH title) now pulls the
  **latest magazine listing image** from the curated Shopify `magazines`
  collection (its listing image: `product_shot` metafield → `featuredImage`),
  fetched in `page.tsx` (`revalidate = 300`). Falls back to the auto-categorised
  magazine bucket when the collection lookup is empty (same as `/shop`) so it
  resolves in dev/mock too. Renders nothing if there's genuinely no image.
- The right "mag cover" placeholder (behind "Experience pop culture for the fun
  of it.") was **removed**.

---

## Files
- Changed: `next.config.ts`, `app/globals.css`, `app/join-ralph/page.tsx`,
  `components/home/PlanetSection/PlanetSection.tsx`,
  `components/magazine/{CoverStory,ArticleGrid,BlockRenderer}.tsx`,
  `components/join-ralph/JoinRalphClient.tsx`
- Removed: `app/{magazine,tv,lab,events,shop}/loading.tsx`
