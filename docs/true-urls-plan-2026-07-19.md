# Plan — True content URLs (magazine / shop / events)

*2026-07-19 — how to make `/magazine/[slug]`, `/shop/[handle]`, `/events/[slug]` real, server-rendered URLs (no query strings) with per-item metadata + JSON-LD + OG, while keeping the existing in-app overlay/detail/panel UX and transitions.*

## Goal
- Shareable, crawlable, refresh-safe URLs at the pretty path — **no `?read=` / `?product=` / `?show=`**.
- Each item URL emits its own `<title>`/description, `alternates.canonical`, OG/Twitter image, and Article/Product/Event JSON-LD.
- Keep today's in-app experience: magazine = overlay over the list; shop = listing↔detail swap in the same template; events = panel open on the same page.
- Preserve the magazine paywall and the "subscribe → OAuth → back to article" flow.

## Key finding (why this is simpler than intercepting routes)
The in-app navigation **already uses the pretty URLs**. All three shells call `History.prototype.pushState(…, '/shop/handle')` etc. — deliberately bypassing Next's router so the client component **never unmounts** and the bespoke framer transitions keep running. Back/forward is handled via `popstate`.

So the URL bar is already "true" while you browse. **The only breakage is the entry points** — direct visit / refresh / share / crawler — where:
1. `app/<section>/[slug]/page.tsx` is a bare `redirect()` to the query URL, and
2. there is no server-rendered per-item metadata / JSON-LD / OG.

**Conclusion:** we do **not** need intercepting + parallel routes. Those would force in-app navigation back through the Next router (remounting the shell, fighting the existing animations). Instead we **keep the pushState shells** and only fix the server entry routes. This is the lower-risk path and preserves the transitions you've built.

*(Intercepting/parallel routes remain the "textbook" answer for modal-over-page and we can revisit them later; they're just not worth the remount cost here given the shells already own the pretty URL.)*

---

## The pattern (applies to all three, with per-section detail below)

For each section, replace the redirect stub with a **server component that renders the section in the item's open state** and carries the SEO payload:

```
app/<section>/[slug]/page.tsx   (server)
  ├─ export async function generateMetadata({params})  → per-item title/desc/canonical/OG
  ├─ fetch the item server-side (getArticleBySlug / getProductByHandle / event row)
  ├─ 404 via notFound() if missing
  ├─ <JsonLd data={…Article/Product/Event…} />
  └─ render the SAME section tree as app/<section>/page.tsx, but pass
     initialSlug={slug} so the client shell opens the item on mount.
app/<section>/[slug]/opengraph-image.tsx   → per-item OG card (item image or generated)
```

And the client shell change (small): accept an **`initialSlug` prop** and open the item from it on mount, instead of reading the `?query` param. Keep the `?query` read as a **back-compat fallback** so old links + the OAuth-return flow still work. In-app pushState stays exactly as-is.

### Two levels — ship Level 1 first
- **Level 1 — metadata-complete (recommended first):** the `[slug]` server route renders the section + `initialSlug` + full `generateMetadata` + JSON-LD + OG. The *item body* still renders client-side (the shell opens it on mount). This delivers correct titles, social cards, canonicals, and structured data — the actual SEO wins — with minimal risk. Google executes JS so it still sees the opened content.
- **Level 2 — content-complete (follow-up):** additionally server-render the item's readable content into the `[slug]` HTML (best for no-JS + maximum crawl confidence). Easy for shop/events (small data); more involved for magazine (paywall — server-render teaser only, gate the body). Do per-section as needed.

---

## Section 1 — Magazine (overlay over the list)
**Current:** grid click → `openArticle(slug)` → `fetch('/api/articles/[slug]')` (enforces tier) → `ArticleOverlay` over `MagazineClient`; URL pushState'd to the pretty path; `?read=` re-opens on mount; back closes overlay.

**Plan:**
- `app/magazine/[slug]/page.tsx` (server): `getArticleBySlug(slug)` → `notFound()` if missing; `generateMetadata` (title, `article.subtitle`/intro as description, canonical `/magazine/[slug]`, OG = lead image); `<JsonLd>` `@type: Article` (headline, datePublished = `publishedAt`, author, image); render `<MagazineClient … initialArticleSlug={slug} />`.
- `MagazineClient`: add `initialArticleSlug?` prop → on mount call `openArticle(initialArticleSlug)` (keeps the gated `/api/articles` fetch, so the paywall is unchanged). Keep the `?read=` fallback for OAuth-return.
- **Paywall/SEO:** JSON-LD + metadata use only non-gated fields (headline, teaser, image) — never the paid body. Level 2 (optional): server-render the intro/teaser blocks for crawlers; keep the full body behind the client `/api/articles` gate.
- `app/magazine/[slug]/opengraph-image.tsx`: article lead image (or generated card with the title).
- **UX unchanged:** in-app still opens the overlay over the list; direct hit renders the magazine page and the overlay opens on mount (the "list below" you want).

## Section 2 — Shop (listing ↔ detail, same template)
**Current:** card click → `openProduct(handle)` → pushState `/shop/[handle]` → `fetchProduct` → `AnimatePresence` cross-fades listing→`ProductDetail`; `?product=` opens on mount; `closeProduct` → pushState `/shop`.

**Plan:**
- `app/shop/[handle]/page.tsx` (server): `getProductByHandle(handle)` → `notFound()`; `generateMetadata` (title, description, canonical, OG = product image); `<JsonLd>` `@type: Product` + `offers` (price, availability, currency GBP); render `<ShopClient … initialProductHandle={handle} />`.
- `ShopClient`: add `initialProductHandle?` prop → on mount `openProduct`/set `selectedProduct` for it (the cross-fade still plays). Keep `?product=` fallback.
- `app/shop/[handle]/opengraph-image.tsx`: product image card.
- **Note:** the `Product` JSON-LD + real server metadata make product pages rich-result eligible (price/availability in SERPs). Level 2: server-render `ProductDetail` content for crawlers (product data is already available server-side).

## Section 3 — Events (panel open on the same page)
**Current:** arm/card → `handleShowMore` → pushState `/events/[slug]` → `setExpandedArm`; `?show=` opens on mount; back closes.

**Plan:**
- `app/events/[slug]/page.tsx` (server): look up the event row by slug (from `getActiveEvents()` / a `getEventBySlug` helper) → `notFound()`; `generateMetadata` (name, date, location, canonical, OG); `<JsonLd>` `@type: Event` (name, startDate, location, image, `offers`/`url` = `externalTicketUrl`); render `<EventsClient … initialShowSlug={slug} />`.
- `EventsClient` / `MinglingCharacters`: add `initialShowSlug?` → open that panel on mount. Keep `?show=` fallback.
- `app/events/[slug]/opengraph-image.tsx`: event thumbnail card.
- Events content is small, so **Level 2 is cheap here** — the event's title/date/venue can be server-rendered for full crawlability.

---

## Shared plumbing
- **Canonicals:** each `[slug]` route sets `alternates.canonical` to its own pretty path (resolves audit §1e). Update the list pages' metadata too if needed.
- **Sitemap:** already emits the pretty `/magazine/[slug]` etc. URLs (done in Phase 1) — they'll now resolve to real pages instead of redirects. ✅
- **`<JsonLd>`:** component already exists (`components/seo/JsonLd.tsx`). Add per-item nodes; optionally a `BreadcrumbList` (section → item).
- **OG images:** one `opengraph-image.tsx` per `[slug]` dir; can start by reusing the item's image, upgrade to generated cards later.
- **404s:** `notFound()` on unknown slug → the branded `app/not-found.tsx` (added Phase 1).
- **Metadata helper:** a small `lib/seo/metadata.ts` to build consistent `Metadata` objects (title template, canonical, OG) across the three routes.

## Risks & mitigations
- **Remount on real navigation:** only happens on direct hits / full loads (in-app uses pushState, no remount) — acceptable.
- **Paywall leakage:** never put gated body into server HTML/JSON-LD; keep the `/api/articles/[slug]` tier gate as the source of truth for the body (Level 1 avoids this entirely since the body stays client-fetched).
- **OAuth-return flow:** keep the `?read=`/`?product=`/`?show=` fallback reads in the shells so the existing return path still works; migrate it to the pretty path later.
- **Double data fetch:** the `[slug]` page renders the whole section (list + item). Listing reads are cached/parallel already; acceptable. Level 2 can trim.
- **Verify in the browser:** in-app open/close (overlay/detail/panel), direct hit + refresh, share preview (OG), back/forward, and the magazine paywall + OAuth return.

## Sequencing (recommended)
1. **Shared:** `lib/seo/metadata.ts` helper + confirm `<JsonLd>`.
2. **Shop** first (cleanest data, Product JSON-LD has the best SERP payoff) — full Level 1 + Level 2.
3. **Events** (small data, cheap Level 2).
4. **Magazine** last (paywall nuance) — Level 1, then Level 2 teaser.
5. Per-route `opengraph-image.tsx` for each.
6. Verify + Rich Results Test + resubmit sitemap.

## What we're explicitly NOT doing (and why)
- **Intercepting + parallel routes** — would route in-app navigation through Next again, remounting the shells and breaking the bespoke overlay/detail/panel animations. The pushState shells already give true URLs in-app, so this complexity buys nothing here.
- **Query-string canonicals** — abandoned; the whole point is true paths.
