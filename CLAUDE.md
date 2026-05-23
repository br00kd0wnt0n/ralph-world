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
Frontend visual pass — parallax homepage, page transitions, layered
planet decoration applied across section pages, header/nav redesign,
events page interactive arms, Join Ralph + Work With Us pages
(2026-05-16). See `changelog.md` for what shipped and `PRE_DEPLOY.md`
for the remaining-items checklist (Shopify store sweep, multi-week
broadcaster scheduling, webhook registration, real-payment test,
token rotations, visual-canvas rebuild).

---

## Foundation documents
- [architecture.md](architecture.md) — system structure, data flow, decisions
- [changelog.md](changelog.md) — session-by-session change history
- [PRE_DEPLOY.md](PRE_DEPLOY.md) — checklist of items parked until after Josh's pass / before DNS cutover
- [HANDOVER.md](HANDOVER.md) — one-pager brief for Josh on scope and conventions
- [docs/](docs/) — feature/redesign writeups (parallax, page transitions, nav redesign, magazine redesign, session notes, visual-canvas scoping, shopify subscriptions)

## Quick start
```bash
npm install
npm run dev
# Requires .env.local — copy from .env.example and fill in values
# Minimum needed: DATABASE_URL, AUTH_SECRET, AUTH_URL
```

## Key files

### Core / data layer
- Entry point: `app/layout.tsx`
- Route template (page-transition wrapping): `app/template.tsx`
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
- Shopify client: `lib/shopify/client.ts`
- Shopify queries: `lib/shopify/queries.ts`
- Shop categorisation: `lib/shopify/categorize.ts`

### Layout / chrome
- Nav component: `components/layout/Nav.tsx`
- Page nav (in-page nav bar): `components/layout/PageNav.tsx`
- Section intro (page title block): `components/layout/SectionIntro.tsx`
- Page transition wrapper: `components/layout/PageTransitionWrapper.tsx`
- Page transition variants: `lib/animation/page-transitions.ts`
- Shared pink dropdown shell: `components/layout/PinkDropdown.tsx`
- Subscribe modal: `components/layout/SubscribeModal.tsx`
- Theme toggle: `components/layout/ThemeToggle.tsx`
- Language modal: `components/layout/LanguageModal.tsx`
- Mobile menu: `components/layout/MobileMenu.tsx`
- Footer: `components/layout/Footer.tsx`
- Cart drawer: `components/layout/CartDrawer.tsx`
- Globe animation: `components/layout/Globe.tsx`

### Parallax / visuals (homepage depth layers)
- Starfield (z-0, twinkles + shooting stars): `components/layout/Starfield.tsx`
- Midground (moon/planet/satellite + flying ship): `components/layout/MidgroundLayer.tsx`
- Foreground (alien rocket / saucer / spaceship): `components/layout/ForegroundLayer.tsx`
- Canvas background (RALPH WORLD theme iframe host): `components/layout/CanvasBackground.tsx`
- Planet preloader: `components/layout/PlanetPreloader.tsx`

### Shared UI
- Button (shadow press effect): `components/ui/Button.tsx`

### Pages
- Shop page: `app/shop/page.tsx` — UI: `components/shop/ShopClient.tsx`
- Magazine page: `app/magazine/page.tsx` — UI: `components/magazine/MagazineClient.tsx`
- Magazine article overlay: `components/magazine/ArticleOverlay.tsx`
- Magazine article direct route: `app/magazine/[slug]/page.tsx`
- Events page: `app/events/page.tsx` — UI: `components/events/EventsClient.tsx`
- Events mingling characters (arms + info panels): `components/events/MinglingCharacters.tsx`
- Lab page: `app/lab/page.tsx` — UI: `components/lab/LabClient.tsx`
- TV page: `app/tv/page.tsx` — UI: `components/tv/RalphTVClient.tsx`
- Join Ralph page (signup carousel): `app/join-ralph/page.tsx` — UI: `components/join-ralph/JoinRalphClient.tsx`
- Work With Us page (renamed from `/play`): `app/work-with-us/page.tsx` — UI: `components/play/*`

### API routes
- Health check: `app/api/health/route.ts`
- Profile language: `app/api/profile/language/route.ts`
- Profile theme: `app/api/profile/theme/route.ts`
- Account upgrade (subscription checkout redirect): `app/api/account/upgrade/route.ts`
- Shopify webhook (HMAC-verified): `app/api/webhooks/shopify/route.ts`
- Broadcaster proxy routes: `app/api/broadcaster/`
- Cart proxy routes: `app/api/cart/`

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
- Brand pink: `#EA128B` (was `#FF2098`), background: black (`#000000`)
- Full brand palette (all updated 2026 visual pass):
  - Pink `#EA128B`, Blue `#5FBCBF`, Yellow `#FBC000`, Green `#44B758`, Orange `#EE6626`, Purple `#7B3FE4`
- V1 themes: `cosy-dynamics` (default dark), `light`
- `RALPH WORLD` theme iframes `ralph-visual-canvas-production.up.railway.app` until the bundled 3D canvas ships (see [docs/visual-canvas-rebuild.md](docs/visual-canvas-rebuild.md))
- Future themes: `8-bit-nostalgia`, `1980s-fever-dream` — in THEMES config array, BackgroundLayer scaffolded
- All Tailwind classes use CSS var references: `bg-background`, `text-primary`, etc.

### Typography
- **Roboto** (Google Fonts, 400/600/700/800) for body, chrome, tags
- **Gooper Trial SemiBold** (`@font-face` from `public/fonts/`) for intros, buttons, titles
- Text utilities defined as `@utility` in `globals.css`:
  - `text-body` / `text-body-sm` / `text-body-bold` — Roboto paragraph styles
  - `text-chrome` — Roboto 700 13px, used for header/footer links
  - `text-tag` — Roboto 800 12px, used for tabs/labels
  - `text-intro` — Gooper Trial 600 18px, used for subtitles/article openers
  - `text-btn` — Gooper Trial 600, used for buttons + nav items
- See [docs/homepage-parallax-changes.md](docs/homepage-parallax-changes.md) for the full size/line-height table

### Parallax depth layers (homepage)
- Four superimposed layers scrolling at different speeds: `Starfield` (z-0) → `MidgroundLayer` (z-[1]) → page content (z-10) → `ForegroundLayer` (z-20)
- All scroll updates rAF-batched, animation via `transform: translateY()` only (no `top`) for GPU compositing
- Starfield only renders on `cosy-dynamics` theme, hidden on mobile
- See [docs/homepage-parallax-changes.md](docs/homepage-parallax-changes.md)

### Page transitions
- Framer Motion `AnimatePresence` with a custom **Frozen Router** pattern wired in `PageTransitionWrapper`
- Lives in `app/layout.tsx`, not `template.tsx` (template is recreated on navigation and would destroy the exit animation)
- Components opt into exit-aware behaviour via `usePresence()` from Framer Motion (homepage planets slide outward) — older code may use `useTransitionState()` from PageTransitionWrapper
- Exit direction map for homepage planets: `lib/animation/page-transitions.ts` → `PLANET_EXIT_DIRECTIONS`
- Timings: enter 0.4s easeOut `[0.22, 1, 0.36, 1]`, exit 0.35s easeIn `[0.4, 0, 1, 1]`
- See [docs/page-transitions.md](docs/page-transitions.md)

### Layered planet decoration pattern (section pages)
- Section pages (`/magazine`, `/events`, `/lab`, `/tv`, `/shop`) all use the same two-layer planet decoration block at the top
- Structure: `<section relative>` → absolute background layer (planet bg + fg SVGs at 270px tall, white fills below) + relative content layer with `paddingTop: 200` and optional negative-margin overflow on first child
- Planet assets per section: `planet_background_<section>.svg` + `planet_foreground_<section>.svg` in `public/imgs/`
- All planet SVGs use `preserveAspectRatio="none"` so cover-sized backgrounds stretch cleanly
- Shop currently uses `_tv` planets as placeholders — swap when proper shop planets ship
- See [docs/nav-and-dropdown-redesign.md](docs/nav-and-dropdown-redesign.md) §5

### Shared dropdown shell
- `PinkDropdown` is the shared shell behind both `ThemeToggle` and `LanguageModal` — solid pink offset shadow, 45° angled corners, pointing notch, spring pop-in
- Three exported variant objects to plug item animations into: `panelVariants`, `stackVariants`, `panelItemVariants`
- Position the notch over a trigger via the `right` prop (see [docs/nav-and-dropdown-redesign.md](docs/nav-and-dropdown-redesign.md) §2)
