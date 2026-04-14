# Project: ralph-world

## Global context
~/context-base/CLAUDE.md

## Persona files
~/context-base/personas/

## Project brief
~/context-base/projects/ralph-world.md

## Current persona
FRONTEND — ~/context-base/personas/frontend.md

## Session goal
Phase 6 complete — Shop + Shopify integration. Next: Phase 7 (Lab)

---

## Foundation documents
- [architecture.md](architecture.md) — system structure, data flow, decisions
- [changelog.md](changelog.md) — session-by-session change history

## Quick start
```bash
npm install
npm run dev
# Requires .env.local — copy from .env.example and fill in values
# Minimum needed: DATABASE_URL, AUTH_SECRET, AUTH_URL
```

## Key files
- Entry point: `app/layout.tsx`
- Providers: `app/providers.tsx`
- Root page: `app/page.tsx`
- Auth config: `lib/auth.ts`
- Auth route: `app/api/auth/[...nextauth]/route.ts`
- Auth context: `context/AuthContext.tsx`
- Theme context: `context/ThemeContext.tsx`
- Cart context: `context/CartContext.tsx`
- DB client: `lib/db/index.ts`
- DB schema: `lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Nav component: `components/layout/Nav.tsx`
- Subscribe modal: `components/layout/SubscribeModal.tsx`
- Theme toggle: `components/layout/ThemeToggle.tsx`
- Language modal: `components/layout/LanguageModal.tsx`
- Mobile menu: `components/layout/MobileMenu.tsx`
- Footer: `components/layout/Footer.tsx`
- Cart drawer: `components/layout/CartDrawer.tsx`
- Health check: `app/api/health/route.ts`
- Profile language: `app/api/profile/language/route.ts`

## Environment variables
```
DATABASE_URL=                       # Railway Postgres connection string
AUTH_SECRET=                        # openssl rand -base64 32
AUTH_URL=                           # http://localhost:3000 or https://ralph.world
AUTH_GOOGLE_ID=                     # Google OAuth client ID
AUTH_GOOGLE_SECRET=                 # Google OAuth client secret
BROADCASTER_BACKEND_URL=            # Ralph TV backend Railway URL
BROADCASTER_RELAY_URL=              # Ralph TV relay Railway URL
BROADCASTER_SERVICE_TOKEN=          # X-Service-Token for Broadcaster API auth
SHOPIFY_STOREFRONT_URL=             # Shopify Storefront GraphQL endpoint
SHOPIFY_STOREFRONT_TOKEN=           # Shopify Storefront API token
SHOPIFY_WEBHOOK_SECRET=             # For HMAC verification of Shopify webhooks
NEXT_PUBLIC_APP_URL=                # https://ralph.world (or Railway URL in staging)
```

## Project-specific conventions

### Stack specifics
- Next.js 16 App Router throughout — no Pages Router patterns
- Server components by default, `'use client'` only when needed (interactivity, hooks, browser APIs)
- Auth: Auth.js (NextAuth v5) with Google OAuth, JWT sessions, DrizzleAdapter
- Database: Railway Postgres via Drizzle ORM — all queries server-side
- DB client lazy-init via `getDb()` — never top-level instantiation
- All Broadcaster API calls: proxied through `app/api/broadcaster/` — never call Broadcaster directly from the browser
- All Shopify mutations: proxied through `app/api/cart/` — Storefront token never exposed to browser
- TypeScript strict mode on — no `any` without a comment explaining why

### Railway deployment
- `railway.toml` present with healthcheck at `/api/health`
- Railway Postgres plugin in same project — DATABASE_URL auto-injected
- CMS (Phase 8) will be a second Railway service in the same project, same DB
- All env vars set in Railway dashboard before first deploy

### Animation / handoff conventions
- Animation variants live in `lib/animation/[section].ts` — never inline in components
- Every complex component has a `README.md` describing intended animation in plain English
- Prop interfaces in `ComponentName.types.ts` alongside the component
- Duffy's SVG illustrations: accepted as `illustration?: React.ComponentType` prop — placeholder rendered if not provided
- Josh owns the frontend layer; Brook owns everything in `lib/`, `app/api/`, `context/`

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
- Brand pink: #FF2098, background: black (#000000)
- V1 themes: `cosy-dynamics` (default dark), `light`
- Future themes: `8-bit-nostalgia`, `1980s-fever-dream` — in THEMES config array, BackgroundLayer scaffolded
- All Tailwind classes use CSS var references: `bg-background`, `text-primary`, etc.
