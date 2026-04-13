# Changelog: ralph-world

All notable changes documented here, organised by session. Most recent on top.

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
