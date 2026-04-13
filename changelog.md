# Changelog: ralph-world

All notable changes documented here, organised by session. Most recent on top.

---

## 2026-04-13 — SCAFFOLDER mode

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
