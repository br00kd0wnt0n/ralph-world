# Changelog: ralph-world

All notable changes documented here, organised by session. Most recent on top.

---

## 2026-04-14 — FRONTEND mode (Phase 7: Lab)

**Session goal:** Lab page with RalphOMatic machine state shell and items grid

### Added
- `lib/animation/lab.ts` — lever rotate, lights flash, conveyor scroll, bell jar hop, lab card reveal variants. SPIN_DURATION_MS constant
- `lib/data/lab.ts` — getPublishedLabItems from Postgres, sorted by sort_order then published_at desc
- `lib/data/lab-utils.ts` — isFresh() utility (client-safe, no DB dependency) — checks if item published within 30 days
- `components/lab/RalphOMatic.tsx` — bespoke interaction machine with 4 states (idle → lever-pulled → spinning → settled). Lever click triggers 3-step transition. Random item lands under center bell jar when settled. Illustration slots via `machineIllustration` and `conveyorIllustration` props (receive state). CSS placeholder when no illustration provided
- `components/lab/RalphOMatic.types.ts` — MachineState type + props interface
- `components/lab/LabHero.tsx` — "LAB" heading in yellow with intro copy and lever CTA hint
- `components/lab/LabGrid.tsx` — responsive grid (1/2/3 col) with FRESH (auto, <30 days) and NEW badges, paid-subscriber lock overlay for gated items
- `components/lab/LabClient.tsx` — wires machine state → timed state transitions → random item selection, external URL opens in new tab
- `components/lab/README.md` — full handoff contract for Josh (state diagram, asset slots, animation intent)

### Decisions made
- State machine managed via setTimeout chain (300ms lever-pull → 2500ms spin → settle) — no external state library
- Split `isFresh` into separate file so it can be imported into client components without pulling DB module into bundle (Turbopack was otherwise trying to bundle postgres driver for the client)
- Machine picks a random item on each pull — no sequential carousel
- Settled bell jar bobs + scales in loop to signal interactivity

---

## 2026-04-14 — ARCHITECT mode (Phase 6: Shop)

**Session goal:** Shopify Storefront API integration, CartContext, product grid, overlay, subscription webhook

### Added
- `lib/shopify/types.ts` — ShopifyProduct, ShopifyCart, ShopifyVariant, ProductSummary types
- `lib/shopify/queries.ts` — GraphQL fragments and queries/mutations (GET_PRODUCTS_BY_COLLECTION, GET_PRODUCT_BY_HANDLE, CREATE_CART, ADD/UPDATE/REMOVE_CART_LINES, GET_CART)
- `lib/shopify/client.ts` — server-side storefront() fetch with 5s timeout, lazy-init, graceful failure (returns null/empty when credentials missing)
- Cart API routes (all server-side, Storefront token never in browser):
  - POST `/api/cart/create` — new cart with optional variant
  - POST `/api/cart/add` — add lines
  - PATCH `/api/cart/update` — update line quantity
  - DELETE `/api/cart/remove` — remove line IDs
  - GET `/api/cart/[cartId]` — fetch existing cart
- GET `/api/shop/[handle]` — full product details for overlay
- POST `/api/webhooks/shopify` — HMAC-verified webhook handler (orders/paid → 'paid', subscriptions/cancelled → 'free'), logs all events to webhook_log, matches users by email
- `context/CartContext.tsx` — wired to real Shopify actions, persists cartId to localStorage, auto-recovers expired carts
- `components/layout/CartDrawer.tsx` — real Shopify cart display with qty controls, remove, checkout URL link
- `components/shop/ProductCard.tsx` — bordered card with diagonal ribbon badges (NEW/HOT/LIMITED from product tags), sold-out overlay
- `components/shop/ProductOverlay.tsx` — full-screen overlay with image + thumbnails, description, price, Buy Now → addItem → open drawer. Sold-out state with "You snooze, you lose" subscribe CTA
- `components/shop/ShopClient.tsx` — hero "BUY RALPH STUFF", category tabs (The Mag / Merch / Random S**t), 4-col grid, fetches 3 collections in parallel

### Decisions made
- Shopify client returns null on any error — shop page renders "Products coming soon" placeholder when credentials unset
- Webhook timing-safe HMAC compare prevents signature forgery timing attacks
- cartId in localStorage only (no DB persistence for guest carts) — Shopify owns cart state
- 5min revalidation on /shop (product updates propagate fast)

### Known issues (awaiting config)
- Shopify webhook must be manually registered in Shopify admin → `/api/webhooks/shopify` with topics: orders/paid, subscriptions/create, subscriptions/cancelled
- Shopify collections `ralph-magazine`, `ralph-merch`, `ralph-random` must exist in the store
- SHOPIFY_STOREFRONT_URL, SHOPIFY_STOREFRONT_TOKEN, SHOPIFY_WEBHOOK_SECRET required in Railway env

---

## 2026-04-14 — FRONTEND mode (Phase 5: Events)

**Session goal:** Events hero with creature system, multi-state flyouts, past events grid, RSVP flow

### Added
- `lib/animation/events.ts` — creature bob, flyout stage variants, past event scroll reveal, CROWD_PARALLAX_FACTOR
- `lib/data/events.ts` — getActiveEvents, getPastEvents (filtered by is_past flag)
- `components/events/EventCreature.types.ts` — prop interfaces for EventCreature + CrowdBackground with `illustration` slots for Duffy assets
- `components/events/EventCreature.tsx` — positioned wristband/arm placeholder at creature_x/y, accent colour styling, badge, idle bob animation
- `components/events/CrowdBackground.tsx` — 60vh container with teal curved arch top, mouse-opposite parallax via useMotionValue + useSpring (damping 30, stiffness 100)
- `components/events/EventFlyout.tsx` — 3-stage flyout: minimal pill → expanded card → full modal with flyer/address/ticket CTA
- `components/events/EventsHero.tsx` — "LET'S MEET UP" heading with planet/satellite/globe placeholders
- `components/events/PastEvents.tsx` — 2-col grid with MISSED diagonal ribbon, thumbnail + content + verdict button
- `components/events/EventsClient.tsx` — state machine for creature selection + flyout stage, backdrop for stage 3, subscribe modal integration
- `components/events/README.md` — Duffy asset slot documentation for Josh
- Seeded 2 past events for testing

### Access gating
- Guest clicks "Subscribe for ticket access" → subscribe modal (free tier)
- Logged-in user clicks "Get tickets ↗" → opens external_ticket_url in new tab
- `event_rsvps` table exists but not wired in MVP (tickets external only)

### Decisions made
- Parallax uses Framer Motion useMotionValue/useSpring (smoother than raw state updates)
- Stage 3 flyout is a centered modal (not anchored to creature) with backdrop — better for full content
- All three flyout stages share the same AnimatePresence key to avoid stale mount flash

---

## 2026-04-14 — ARCHITECT mode (Phase 4: Ralph TV)

**Session goal:** Broadcaster integration, TV set component, live player, teletext overlays, access gating

### Added
- `lib/broadcaster/client.ts` — server-side Broadcaster API client with 3s timeout, graceful failure (never throws, returns safe defaults when BROADCASTER_BACKEND_URL not set)
- `lib/broadcaster/types.ts` — RelayStatus, ScheduleItem, BroadcasterAsset types
- `lib/animation/tv.ts` — screen state transitions, static flicker, teletext header reveal
- `hooks/useLiveStatus.ts` — polls /api/broadcaster/relay-status every 30s, returns isLive
- `hooks/useHls.ts` — HLS playback with native Safari + hls.js fallback
- Broadcaster proxy routes: `relay-status` (public), `schedule` (public), `assets` (session), `vod-url` (paid only, with subscriptionStatus gate)
- `components/tv/LivePlayer.tsx` — HLS video player with volume control, play/pause overlay
- `components/tv/TVStatic.tsx` — canvas-based TV static effect (animated noise)
- `components/tv/SubscribeGate.tsx` — purple card overlay on static for guest users
- `components/tv/TeletextShowInfo.tsx` — RALPHFAX 100 overlay with blocky RALPH logo, show info, progress bar
- `components/tv/TeletextSchedule.tsx` — RALPHFAX 101 overlay with full schedule, current show highlighted
- `components/tv/TVControls.tsx` — right panel: Show Info / Schedule / Fullscreen / Volume slider
- `components/tv/TVSet.tsx` — main TV frame with bezel, screen, character placeholders, status bar, 5 screen states
- `components/tv/RalphTVClient.tsx` — page shell with heading + TV + subscribe modal
- `components/tv/README.md` — Duffy asset slots and component intent
- `hls.js` package

### Access gating
- Guest (no session) + stream live → SUBSCRIBE GATE with static
- Free/paid user + stream live → LIVE player
- Stream offline → OFFLINE fallback (all users)
- VOD endpoint requires paid subscription (not surfaced in MVP UI)

### Decisions made
- TV set uses illustrated bezel via CSS until Duffy SVG arrives — structure ready for drop-in
- Graceful degradation: no Broadcaster credentials = OFFLINE state on TV page, no errors
- Volume persisted to localStorage
- Schedule only fetched when user opens an overlay (no unnecessary polling)

---

## 2026-04-13 — FRONTEND mode (Phase 3: Design alignment)

**Session goal:** Align magazine layout to Tim's designs and wireframes

### Changed
- Article grid: image-only cards by default (no text), tight edge-to-edge layout with dark borders. Info reveals as overlay on hover with yellow dashed border frame + gradient text overlay
- Magazine hero: stays on dark site background, character placeholder left, "Got coin? Get mag" starburst right, centered copy
- Cover story: pink tinted background section, bordered card with HOT badge, squared CTA button
- Category tabs: removed "All" tab, dotted separator above, centered layout, click active tab to deselect
- Removed claw mechanic positioning code — hover reveal handles interaction until Duffy delivers claw SVG. Claw animation variants retained in lib/animation/magazine.ts for future use

### Decisions made
- Grid cards show no text by default per designs — info only on hover/interaction
- Claw mechanic deferred to asset delivery — current hover overlay matches the "reveal" intent from wireframes
- Category tabs toggle (click active to clear) rather than requiring "All" button

---

## 2026-04-13 — FRONTEND mode (Phase 3: Magazine)

**Session goal:** Magazine listing, category filtering, claw mechanic, article overlay, block renderer

### Added
- `lib/animation/magazine.ts` — Framer Motion variants for claw mechanic (descend/retract, card lift, preview tilt), grid stagger, overlay transitions
- `lib/data/magazine.ts` — fetch published articles from Postgres with category filter, get article by slug, cover story detection
- `components/magazine/MagazineHero.tsx` — dark hero with heading, reading character placeholder, "Got coin? Get mag" starburst, pink arch transition
- `components/magazine/CoverStory.tsx` — full-width cover story card with access-gated CTA (guest: "Sign up to read", subscriber: "Read now")
- `components/magazine/CategoryTabs.tsx` — Comedy / Music / Food / Film & TV horizontal tabs, URL-driven filter
- `components/magazine/ArticleGrid.tsx` — 3-column grid with claw mechanic hover interaction (card lifts, claw descends, preview card appears tilted)
- `components/magazine/BlockRenderer.tsx` — renders 7 block types: ArticleText, ArticleImage1Col, ArticleImage2ColLeft/Right, ArticleVideo, ArticleQuote, RalphSignoff
- `components/magazine/ArticleOverlay.tsx` — full-screen overlay with URL update via pushState, badge pills, bylines, lead image, block content, guest access gate (blur after ~200 words)
- `components/magazine/MagazineClient.tsx` — client shell wiring hero, cover story, tabs, grid, overlay, subscribe modal
- `app/api/articles/[slug]/route.ts` — fetch single article for overlay
- `components/magazine/README.md` — claw mechanic animation intent for Josh
- Magazine page now server-fetches from Postgres with 1hr revalidation

### Decisions made
- Article overlay uses pushState (not parallel routes) for URL update — simpler, back button works
- Claw mechanic is desktop-only hover interaction — on mobile, cards just click through
- Guest access gate counts words across ArticleText blocks, triggers blur at ~200 words

---

## 2026-04-13 — FRONTEND mode (Phase 2: Polish)

**Session goal:** Visual polish — starfield, parallax fix, readability

### Added
- `components/layout/Starfield.tsx` — canvas-based 200-star field with twinkling and multi-plane scroll parallax (near stars drift faster). Fixed behind all content at z-0.

### Fixed
- Planet parallax now relative to each section's viewport position (was using global scrollY, causing sections to fly off the further down the page)
- Lab flyout card: dark text on yellow background for readability. Auto-detects light accent colours and switches text/badge/CTA colours accordingly.

---

## 2026-04-13 — FRONTEND mode (Phase 2: Homepage)

**Session goal:** Build homepage planet scroll, module flyouts, hero, mobile layout

### Added
- `lib/animation/homepage.ts` — all Framer Motion variants (hero stagger, planet section reveal, module card scale+fade, floating character bob, mobile card fade-in)
- `hooks/useParallax.ts` — scroll-driven Y offset at configurable factor
- `hooks/useScrollReveal.ts` — IntersectionObserver-based one-shot reveal
- `components/home/Hero.tsx` — staggered heading + body text with gradient bg (black → teal)
- `components/home/PlanetSection/` — full component with types, parallax planet, scroll reveal, hover/click flyout cards, README for Josh
- `components/home/FloatingCharacter.tsx` — subtle vertical bob animation, Duffy asset slot
- `components/home/MobileHome.tsx` — linear card layout (TV, Magazine carousel, Shop grid, Events, Lab) with staggered fade-in
- `lib/data/homepage.ts` — server-side data fetch from Postgres (articles, events, lab_items) with fallback placeholder data
- Homepage wired: Hero → 4 PlanetSections (Magazine/Events/Shop/Lab) with floating chars between → Footer (desktop). MobileHome for mobile.
- `revalidate = 3600` on homepage (1 hour cache)

### Decisions made
- Shop items are Shopify products (not in DB yet) — placeholder data for now, Phase 6 will fetch from Storefront API
- Data fetching gracefully falls back to placeholder content if DB has no published rows
- Mobile layout has no parallax/planets — linear cards per spec

---

## 2026-04-13 — SCAFFOLDER mode (session 2: pivot + design)

**Session goal:** Pivot from Supabase to Railway Postgres + Auth.js + Drizzle. Redesign nav to match brand.

### Changed
- **Stack pivot**: removed Supabase entirely, replaced with Railway Postgres (Drizzle ORM) + Auth.js (NextAuth v5)
- Auth: Google OAuth via Auth.js with JWT sessions, DrizzleAdapter for user/account/session tables
- DB: Drizzle schema covers all 12 tables (auth + app), pushed to Railway Postgres
- AuthContext now wraps next-auth `SessionProvider` instead of Supabase client
- SubscribeModal uses `signIn('google')` instead of Supabase OAuth
- LanguageModal calls `/api/profile/language` server route instead of Supabase client
- Health check pings Postgres directly
- Nav redesign to match Tim's designs: utility bar (circle logo left, Theme dropdown + actions right), main bar (hamburger left, ralph wordmark center, basket right), nav items in brand pink
- Brand pink updated to #FF2098 (matched from logo), background to black
- ScrollIndicator fades on scroll
- Apple OAuth removed from MVP scope

### Added
- `lib/auth.ts` — NextAuth config with Google provider, DrizzleAdapter, JWT callbacks, auto profile creation
- `lib/db/schema.ts` — full Drizzle schema (users, accounts, sessions, profiles, articles, events, event_rsvps, tv_vod, lab_items, homepage_config, webhook_log, verification_tokens)
- `lib/db/index.ts` — lazy-init Drizzle client
- `drizzle.config.ts` — Drizzle Kit config for migrations
- `app/api/auth/[...nextauth]/route.ts` — Auth.js route handler
- `app/api/profile/language/route.ts` — language preference update
- `components/home/ScrollIndicator.tsx` — fades on scroll
- Real logo assets: `ralph-logo.png` (circle), `ralph-wordmark.png` (script)

### Removed
- `@supabase/ssr`, `@supabase/supabase-js` packages
- `lib/supabase/client.ts`, `lib/supabase/server.ts`
- `app/auth/callback/route.ts` (replaced by Auth.js route)
- Apple OAuth provider (deferred to post-MVP)

### Decisions made
- Railway Postgres over Supabase: fewer moving parts, DB in same Railway project, no vendor lock-in
- Auth.js over Supabase Auth: works with any Postgres, mature ecosystem
- Google-only OAuth for MVP: Apple requires $99/yr developer account
- JWT sessions over database sessions: faster, no DB round-trip per request

---

## 2026-04-13 — SCAFFOLDER mode (session 1: initial scaffold)

**Session goal:** Scaffold ralph-world and build the global shell (Phase 1)

### Added
- Next.js 16 App Router project with TypeScript strict, Tailwind v4
- Theme system: CSS custom properties for `cosy-dynamics` (dark) and `light` themes, scaffolded `8-bit-nostalgia` and `1980s-fever-dream` as empty blocks
- `ThemeContext` with localStorage persistence, `data-theme` on `<html>`, `BackgroundLayer` placeholder for immersive themes
- `ThemeToggle` dropdown with gradient colour swatches per theme
- Supabase Auth: browser client (`lib/supabase/client.ts`), server client (`lib/supabase/server.ts` with cookies), `AuthContext` with user/profile/subscriptionStatus
- `CartContext` placeholder with full interface (Shopify integration in Phase 6)
- Two-bar desktop navigation: utility bar (theme toggle, Play with Ralph, Get started/login, language) + main nav bar (hamburger, logo, basket, nav items with coloured underlines, mascot placeholder)
- Mobile navigation: hamburger, three-dot, basket row + logo + nav items + full-screen overlay menu
- `LanguageModal` dropdown: English / Japanese / Hindi with localStorage + Supabase profile sync
- `SubscribeModal` full-screen 3-page flow: tier selection (free/paid) → social signup (Google/Apple/email) → account completion
- `Footer` with dark variant (pink arch + characters + logo) and light variant (social links + sign up)
- `CartDrawer` slide-from-right panel
- Health check API route at `/api/health` (Supabase ping)
- Auth callback route at `/auth/callback` (OAuth code exchange)
- Providers wrapper (`app/providers.tsx`): ThemeProvider → AuthProvider → CartProvider
- Placeholder SVGs: `ralph-logo.svg`, `mascot-nav.svg`
- Stub pages for all sections: TV, Magazine, Events, Shop, Lab, Play
- `.env.example` with all required environment variables
- `railway.toml` with healthcheck config

### Decisions made
- Used Next.js 16 (latest) instead of 14 — App Router API fully compatible, benefits from latest React features
- Tailwind v4 CSS-first config (`@theme inline`) instead of `tailwind.config.ts` — matches scaffolded project setup
- Playfair Display as display font placeholder — to be replaced when brand fonts confirmed
- Cart context fully typed but methods stubbed — awaiting Phase 6 Shopify integration
- Subscribe modal paid tier button present but not wired to Shopify yet — Phase 6

### Known issues
- No `.env.local` — Supabase, Broadcaster, and Shopify credentials needed before auth works
- Google OAuth and Apple OAuth must be configured in Supabase dashboard
- Supabase redirect URL (`/auth/callback`) must be allowlisted in Supabase dashboard
- ralph logo SVG is placeholder — Duffy to provide final asset
- Nav mascot SVG is placeholder — Duffy to provide
- Third social login provider in subscribe modal is placeholder ("####")

<!-- Add new sessions above this line using the template below -->
