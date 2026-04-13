# Project: ralph-world

## Global context
~/context-base/CLAUDE.md

## Persona files
~/context-base/personas/

## Project brief
~/context-base/projects/ralph-world.md

## Current persona
SCAFFOLDER — ~/context-base/personas/scaffolder.md

## Session goal
Phase 1 complete — global shell scaffolded. Next: Phase 2 (Homepage)

---

## Foundation documents
- [architecture.md](architecture.md) — system structure, data flow, decisions
- [changelog.md](changelog.md) — session-by-session change history

## Quick start
```bash
npm install
npm run dev
# Requires .env.local — copy from .env.example and fill in values
```

## Key files
- Entry point: `app/layout.tsx`
- Providers: `app/providers.tsx`
- Root page: `app/page.tsx`
- Auth context: `context/AuthContext.tsx`
- Theme context: `context/ThemeContext.tsx`
- Cart context: `context/CartContext.tsx`
- Nav component: `components/layout/Nav.tsx`
- Subscribe modal: `components/layout/SubscribeModal.tsx`
- Theme toggle: `components/layout/ThemeToggle.tsx`
- Language modal: `components/layout/LanguageModal.tsx`
- Mobile menu: `components/layout/MobileMenu.tsx`
- Footer: `components/layout/Footer.tsx`
- Cart drawer: `components/layout/CartDrawer.tsx`
- Supabase server client: `lib/supabase/server.ts`
- Supabase browser client: `lib/supabase/client.ts`
- Health check: `app/api/health/route.ts`
- Auth callback: `app/auth/callback/route.ts`

## Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=          # Service role (server-side only, never expose)
BROADCASTER_BACKEND_URL=            # Ralph TV backend Railway URL
BROADCASTER_RELAY_URL=              # Ralph TV relay Railway URL
BROADCASTER_SERVICE_TOKEN=          # X-Service-Token for Broadcaster API auth
SHOPIFY_STOREFRONT_URL=             # https://store.myshopify.com/api/2024-01/graphql.json
SHOPIFY_STOREFRONT_TOKEN=           # Shopify Storefront API token
SHOPIFY_WEBHOOK_SECRET=             # For HMAC verification of Shopify webhooks
NEXT_PUBLIC_APP_URL=                # https://ralph.world (or Railway URL in staging)
```

## Project-specific conventions

### Stack specifics
- Next.js 16 App Router throughout — no Pages Router patterns
- Server components by default, `'use client'` only when needed (interactivity, hooks, browser APIs)
- All Supabase queries that need auth context: use `lib/supabase/server.ts` (cookies-based)
- All Broadcaster API calls: proxied through `app/api/broadcaster/` — never call Broadcaster directly from the browser
- All Shopify mutations: proxied through `app/api/cart/` — Storefront token never exposed to browser
- TypeScript strict mode on — no `any` without a comment explaining why

### Railway deployment
- See `~/context-base/skills/railway-deploy-v2.md` for hard-won gotchas
- Lazy-init all SDK clients — no top-level `const supabase = createClient(...)` in server modules
- `railway.toml` present with healthcheck at `/api/health`
- All env vars set in Railway dashboard before first deploy

### Animation / handoff conventions
- Animation variants live in `lib/animation/[section].ts` — never inline in components
- Every complex component has a `README.md` describing intended animation in plain English
- Prop interfaces in `ComponentName.types.ts` alongside the component
- Duffy's SVG illustrations: accepted as `illustration?: React.ComponentType` prop — placeholder rendered if not provided
- Josh owns the frontend layer; Brook owns everything in `lib/`, `app/api/`, `context/`, `supabase/`

### Access gating pattern
```typescript
// Standard pattern for all gated content:
const { user, subscriptionStatus } = useAuth()
// subscriptionStatus: null (guest) | 'free' | 'paid'
// Check against the access matrix in the project brief
```

### Theme system
- CSS custom properties on `:root`, toggled by `data-theme` on `<html>`
- Tailwind v4 — theme tokens defined in `@theme inline` block in `globals.css`
- V1 themes: `cosy-dynamics` (default dark), `light`
- Future themes: `8-bit-nostalgia`, `1980s-fever-dream` — in THEMES config array, BackgroundLayer scaffolded
- All Tailwind classes use CSS var references: `bg-background`, `text-primary`, etc.
