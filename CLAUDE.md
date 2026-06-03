# Project: ralph-world

## Global context
~/context-base/CLAUDE.md

## Persona files
~/context-base/personas/

## Project brief
~/context-base/projects/ralph-world.md

## Current persona
SCAFFOLDER — ~/context-base/personas/scaffolder.md
(SOW work on Ralph World 2.0 unified accounts. Builds against
`~/ralph-cms/docs/ralph-world-2-accounts-architecture.md` v7 and
`~/ralph-cms/docs/sow-ralph-world-2.md`.)

## Session goal (last updated 2026-06-03)
**Phase 1 live + applied to prod DB. Phase 2 (Stripe subscriptions)
is 5/6 tasks shipped to `main` mock-driven, waiting only on Brook's
Stripe dashboard setup (Task 2.1) for live acceptance.**

Next session priorities:
1. Resend smoke test (if Dany's DNS records landed overnight)
2. Stripe account + product creation (Task 2.1, ~15-30 min)
3. Live Stripe + Resend integration tests
4. Then Phase 3 (content gating + email templates + magazine
   fulfillment) — SOW §Phase 3 has the breakdown

### Resume tomorrow with
1. **Resend status check** — `dig TXT resend._domainkey.send.ralph.world +short`.
   If non-empty, Dany's done their bit. Then either click "Verify"
   in Resend dashboard or curl the domains API. Once verified, run
   `docs/resend-smoke-test.md` Smoke Test 1 with a real inbox + the
   Playwright E2E.
2. **Task 2.1 — Stripe setup** in dashboard:
   - Create product "Ralph Magazine Subscription"
   - One price: £3 GBP/month recurring (Test + Live modes)
   - Enable Customer Portal (Settings → Billing → Customer Portal):
     cancel + update payment + view invoices
   - Webhook endpoint pointing at
     `https://ralph-world-production.up.railway.app/api/webhooks/stripe`,
     subscribed to: checkout.session.completed,
     customer.subscription.updated, customer.subscription.deleted,
     invoice.payment_failed, invoice.paid
   - Copy 4 env vars into Railway → ralph-world:
     STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_PRICE_ID,
     STRIPE_WEBHOOK_SECRET
3. **Stripe live test** — `stripe listen --forward-to
   ralph-world-production.up.railway.app/api/webhooks/stripe`,
   then subscribe via /account → confirm tier=paid, period end shown,
   Customer Portal accessible. Cancel via portal → confirm tier=free.

### Parked
- Resend domain verification — awaiting Dany's DNS update
- Google OAuth consent screen branding — Brook initiated Google
  verification; cosmetic propagation delay
- ralph-cms second OAuth Client ID + env var swap — 5 min task
- Live Stripe acceptance — blocks on Task 2.1

See `changelog.md` 2026-06-02 entry for the live-apply outcome and
`PRE_DEPLOY.md` for the lingering pre-cutover checklist.

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

### Phase 1 — Ralph World 2.0 (unified accounts)
- Entitlements (pure): `lib/entitlements.ts`
- Entitlements (server bridge): `lib/entitlements-server.ts`
- Audit log helper: `lib/audit.ts`
- Consent log helper: `lib/consent.ts`
- Credentials provider passwords: `lib/auth/passwords.ts`
- Credentials provider tokens: `lib/auth/verification-tokens.ts`
- Credentials provider signup flow: `lib/auth/signup.ts`
- Transactional email service: `lib/email/send.ts`
- Resend webhook signature verifier: `lib/email/verifyResendSignature.ts`
- Email template registry: `components/emails/EmailVerification.tsx` + see `docs/email-templates.md`
- Shopify customer auto-create: `lib/shopify/customer.ts` + `lib/shopify/admin-client.ts`
- Login page + form: `app/login/page.tsx` + `app/login/LoginForm.tsx` + `app/login/actions.ts`
- Signup API route: `app/api/auth/signup/route.ts`
- Verify email API route: `app/api/auth/verify-email/route.ts`
- Resend webhook intake: `app/api/webhooks/resend/route.ts`
- Member portal (extended): `app/account/page.tsx`

### Phase 1 — DB ops scripts
- Schema delta (Phase 1 additive): `scripts/apply-phase-1-schema.sql`
- Data migration (access_tier rename + tier backfill): `scripts/migrate-phase-1-access-tier.sql`
- DB role separation grants: `scripts/db-roles-phase-1.sql`
- Runbook: `docs/db-role-separation.md`
- Resend smoke-test runbook: `docs/resend-smoke-test.md`

### Phase 1 — E2E tests
- Credentials signup acceptance: `e2e/credentials-signup.spec.ts`
- Vitest config: `vitest.config.mts`
- Vitest setup + server-only stub: `vitest.setup.ts` + `vitest.server-only-stub.ts`
- Tests TS config: `tsconfig.test.json`

### Phase 2 — Stripe subscriptions
- Plan: `docs/phase-2-plan.md`
- Stripe SDK client (lazy + test seam): `lib/stripe/client.ts`
- Checkout session builder + creator: `lib/stripe/checkout.ts`
- Customer Portal session: `lib/stripe/portal.ts`
- Webhook signature verifier: `lib/stripe/verifySignature.ts`
- 5 event handlers: `lib/stripe/webhook-handlers.ts`
- Checkout API route: `app/api/checkout/subscribe/route.ts`
- Webhook intake: `app/api/webhooks/stripe/route.ts`
- Customer Portal API route: `app/api/account/portal/route.ts`
- /account server actions (subscribe + portal): `app/account/actions.ts`
- Repurposed legacy entry (Shopify→Stripe): `app/api/account/upgrade/route.ts`
- Shopify webhook verifier + new handlers (Task 2.6):
  `lib/shopify/verifyHmac.ts` + `lib/shopify/webhook-handlers.ts`
- Stripe address sync to Shopify (Task 2.4): `lib/shopify/customer.ts`
  (`updateCustomerAddress` + `mapStripeAddressToShopify`)

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

### Utilities / shared logic
- Route error boundary: `app/error.tsx`
- Section theme palette: `lib/section-themes.ts` (hero bg/text pairs)
- Article theme palette: `lib/article-themes.ts` (article canvas)
- Event accent palette: `lib/event-themes.ts`
- URL sanitiser: `lib/safe-url.ts` (outbound link validation)
- Safe localStorage: `lib/safe-storage.ts`
- Cart HMAC tokens: `lib/cart-token.ts`
- Focus trap hook: `hooks/useFocusTrap.ts`
- Case study resolver: `lib/data/case-studies.ts`
- Homepage data (picks + fallback): `lib/data/homepage.ts`

## Environment variables
```
# Core
DATABASE_URL=                       # Railway Postgres — uses ralph_world role since 2026-06-02 cutover
AUTH_SECRET=                        # openssl rand -base64 32
AUTH_URL=                           # http://localhost:3000 or https://ralph.world
AUTH_GOOGLE_ID=                     # Google OAuth client ID (new "Ralph World" project as of 2026-06-02)
AUTH_GOOGLE_SECRET=                 # Google OAuth client secret
NEXT_PUBLIC_APP_URL=                # https://ralph-world-production.up.railway.app (until DNS cutover, then https://ralph.world)

# Broadcaster (Ralph TV)
BROADCASTER_BACKEND_URL=            # Ralph TV backend Railway URL
BROADCASTER_RELAY_URL=              # Ralph TV relay Railway URL
BROADCASTER_SERVICE_TOKEN=          # X-Service-Token for Broadcaster API auth

# Shopify Storefront (consumer cart proxy)
SHOPIFY_STOREFRONT_URL=             # Shopify Storefront GraphQL endpoint
SHOPIFY_STOREFRONT_TOKEN=           # Shopify Storefront API token
SHOPIFY_WEBHOOK_SECRET=             # For HMAC verification of Shopify webhooks
SHOPIFY_SUBSCRIPTION_VARIANT_ID=    # gid://shopify/ProductVariant/... for the £3/month subscription

# Shopify Admin API (Task 1.6 customer auto-create + Phase 3 synthetic orders)
SHOPIFY_STORE_DOMAIN=               # store.myshopify.com (no protocol)
SHOPIFY_ADMIN_ACCESS_TOKEN=         # shpat_... Admin API access token
SHOPIFY_ADMIN_API_VERSION=          # optional, defaults to 2024-01

# Resend (transactional email — Task 1.4)
RESEND_API_KEY=                     # re_... Resend API key
RESEND_FROM=                        # Ralph.world <hello@send.ralph.world>
RESEND_WEBHOOK_SECRET=              # whsec_... Svix webhook secret
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
