# Architecture: ralph-world

## Overview
Ralph.World is a Next.js 16 App Router application serving a public entertainment platform. It uses Railway Postgres for data, Auth.js for authentication, Shopify for commerce, and the Ralph TV Broadcaster stack for streaming. A separate CMS application (`ralph-cms`) manages content via the same Postgres database.

## System diagram
```
                    ┌─────────────────────────────────┐
                    │   ralph.world (Next.js 16)       │
                    │   Railway — public domain         │
                    └──────────┬──────────────────────┘
                               │
           ┌───────────────────┼──────────────────────┐
           │                   │                      │
    ┌──────▼──────┐   ┌────────▼────────┐   ┌────────▼────────┐
    │  Railway     │   │   Broadcaster   │   │    Shopify      │
    │  Postgres    │   │  Backend (API)  │   │ Storefront API  │
    │  (shared DB) │   │  Relay (HLS)    │   │ Subscriptions   │
    └──────┬──────┘   └─────────────────┘   └─────────────────┘
           │
    ┌──────▼──────┐
    │  ralph-cms  │
    │ (separate   │
    │  Railway    │
    │  service)   │
    └─────────────┘
```

## Tech stack
| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 16 (App Router, TypeScript) | SSR, API routes, image optimisation |
| Styling | Tailwind CSS v4 | CSS-first config, design tokens via custom properties |
| Animation | Framer Motion | Josh's preference, scroll-driven parallax |
| Auth | Auth.js (NextAuth v5) | Google OAuth, JWT sessions, DrizzleAdapter |
| Database | Railway Postgres + Drizzle ORM | Same Railway project as app, low latency, typed queries |
| File storage | Cloudflare R2 | Already live |
| Commerce | Shopify Storefront API (GraphQL) | Products, cart, checkout |
| Subscription billing | Shopify Subscriptions | £3/month quarterly, webhook to Postgres |
| Video streaming | Ralph TV Broadcaster (Railway) | Existing HLS live stream stack |
| Content | ralph-cms (same Postgres DB) | Bespoke CMS — separate Railway service |
| Deploy | Railway | Both services, auto-deploy from GitHub |

## Project structure
```
ralph-world/
├── app/
│   ├── layout.tsx              # Root layout — providers, nav, theme, OG defaults
│   ├── providers.tsx           # Client providers: Theme → Auth → Cart
│   ├── page.tsx                # Homepage
│   ├── robots.ts               # /robots.txt (disallow api/account/login)
│   ├── sitemap.ts              # /sitemap.xml (public top-level routes)
│   ├── opengraph-image.tsx     # Default 1200x630 OG image (edge-rendered)
│   ├── tv/page.tsx             # Ralph TV (Phase 4)
│   ├── magazine/page.tsx       # Magazine listing (Phase 3)
│   ├── events/page.tsx         # Events (Phase 5)
│   ├── shop/page.tsx           # Shop (Phase 6)
│   ├── lab/page.tsx            # Lab (Phase 7)
│   ├── account/page.tsx        # Profile + subscription + preferences + danger zone
│   ├── play/page.tsx           # Play with Ralph (agency)
│   ├── sentry.*.config.ts      # Sentry client/server/edge init (parked — see PRE_DEPLOY.md)
│   ├── instrumentation*.ts     # Sentry instrumentation hooks
│   └── api/
│       ├── auth/[...nextauth]/ # Auth.js route handler
│       ├── health/             # Railway health check
│       ├── profile/language/   # Update language preference
│       ├── profile/theme/      # Update theme preference
│       ├── account/upgrade/    # Auth'd redirect into Shopify subscription checkout
│       ├── broadcaster/        # Broadcaster API proxies (Phase 4)
│       ├── cart/               # Shopify cart proxies (Phase 6)
│       └── webhooks/shopify/   # Subscription webhook (Phase 6)
├── components/
│   ├── layout/
│   │   ├── Nav.tsx             # Two-bar desktop + mobile nav
│   │   ├── Footer.tsx          # Dark (arch) + light variants
│   │   ├── SubscribeModal.tsx  # 3-page signup flow
│   │   ├── ThemeToggle.tsx     # Theme dropdown
│   │   ├── LanguageModal.tsx   # EN/JA/HI selector
│   │   ├── CartDrawer.tsx      # Slide-from-right cart
│   │   └── MobileMenu.tsx      # Full-screen mobile menu
│   ├── home/
│   │   ├── ScrollIndicator.tsx
│   │   ├── PlanetSection/      # Phase 2
│   │   └── ModuleCard/         # Phase 2
│   ├── tv/                     # Phase 4
│   ├── magazine/               # Phase 3
│   ├── events/                 # Phase 5
│   ├── shop/                   # Phase 6
│   ├── lab/                    # Phase 7
│   ├── account/                # AccountPreferences (theme + language)
│   └── ui/
├── context/
│   ├── AuthContext.tsx          # Wraps next-auth SessionProvider
│   ├── ThemeContext.tsx         # CSS theme switching
│   └── CartContext.tsx          # Shopify cart state (Phase 6)
├── lib/
│   ├── auth.ts                 # NextAuth config, providers, callbacks
│   ├── db/
│   │   ├── index.ts            # Lazy-init Drizzle client
│   │   └── schema.ts           # All Drizzle table definitions
│   ├── animation/              # Framer Motion variant configs
│   ├── broadcaster/            # Phase 4
│   └── shopify/                # Phase 6
├── docs/                      # Admin setup guides (shopify-subscriptions, etc.)
├── drizzle.config.ts
├── next.config.ts             # Wrapped with withSentryConfig
├── .env.example
├── railway.toml
├── CLAUDE.md
├── architecture.md
├── changelog.md
├── HANDOVER.md                # Frontend brief for Josh
└── PRE_DEPLOY.md              # Checklist parked until post-Josh / pre-cutover
```

## Database schema (Railway Postgres via Drizzle)

### Auth tables (managed by Auth.js + DrizzleAdapter)
- `users` — id, name, email, emailVerified, image
- `accounts` — OAuth provider links (Google etc)
- `sessions` — session tokens
- `verification_tokens` — email verification

### App tables
- `profiles` — subscription_status, role, theme/language prefs (FK → users)
- `articles` — magazine content with content_blocks JSONB
- `events` — events with creature positioning (x/y)
- `event_rsvps` — RSVP tracking (schema only, not wired in MVP)
- `tv_vod` — TV VOD metadata (schema only, not in public UI MVP)
- `lab_items` — lab content
- `homepage_config` — key/value config for homepage modules
- `webhook_log` — Shopify webhook event log

## Auth flow
```
1. User clicks "Get started" or "Continue with Google"
2. Auth.js redirects to Google OAuth
3. Google callback → Auth.js creates user + account records in Postgres
4. createUser event → auto-creates profile row (subscription_status: 'free')
5. JWT session with userId → AuthContext provides user + profile to components
6. Profile data (subscription_status, role) attached to session via callback
```

## API endpoints

### Auth (Auth.js)
| Method | Path | Purpose |
|---|---|---|
| GET/POST | /api/auth/* | Auth.js handlers (signin, callback, signout, session) |

### Profile
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/profile/language | JWT session | Update language preference |

### Broadcaster proxies (Phase 4)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/broadcaster/relay-status | none | Live stream status |
| GET | /api/broadcaster/assets | session | Video library |
| GET | /api/broadcaster/vod-url | paid | Presigned MP4 URL |

### Shopify cart (Phase 6)
| Method | Path | Purpose |
|---|---|---|
| POST | /api/cart/create | Create Shopify cart |
| POST | /api/cart/add | Add line items |
| PATCH | /api/cart/update | Update quantities |
| DELETE | /api/cart/remove | Remove line items |
| GET | /api/cart/[cartId] | Fetch cart |

### Webhooks (Phase 6)
| Method | Path | Purpose |
|---|---|---|
| POST | /api/webhooks/shopify | Subscription events → update profiles |

### Utility
| Method | Path | Purpose |
|---|---|---|
| GET | /api/health | Railway health check (Postgres ping) |

## Key boundaries
- Browser → DB: never directly. All DB queries server-side via API routes or server components
- Browser → Broadcaster: never directly. Always via /api/broadcaster/* proxy
- Browser → Shopify: never directly. Always via /api/cart/* proxy
- Auth secrets (AUTH_SECRET, Google credentials): server-side only
- ralph-cms: writes to same Postgres DB, separate Railway service

## Decision log
| Date | Decision | Rationale |
|---|---|---|
| Apr 2026 | Next.js App Router, not Pages Router | Server components reduce client JS, better for auth SSR |
| Apr 2026 | Railway Postgres + Drizzle, not Supabase | One fewer service, DB in same Railway project, simpler stack |
| Apr 2026 | Auth.js (NextAuth v5), not Supabase Auth | Works with any Postgres, no vendor lock-in, mature ecosystem |
| Apr 2026 | Google OAuth only for MVP | Apple requires $99/yr developer account, add post-MVP |
| Apr 2026 | JWT sessions, not database sessions | Faster, no DB hit per request, profile attached via callback |
| Apr 2026 | TV on-demand excluded from MVP | Design spec incomplete, Broadcaster VOD endpoint not built |
| Apr 2026 | Broadcaster proxied, not iframed | Control over TV set frame styling and access gating |
| Apr 2026 | Physical mag fulfilment via NewsStand (manual) | Not automated through Shopify |
| Apr 2026 | Two themes for MVP: cosy-dynamics, light | 8-bit-nostalgia and 1980s-fever-dream scaffolded for later |
| Apr 2026 | Brand pink #FF2098, black background | Matched from logo asset |

## Known constraints
- Broadcaster VOD: presigned S3 URLs expire in ~10 minutes. VodPlayer must refetch if stale.
- Shopify Subscriptions: webhook must be configured manually in Shopify admin.
- Duffy's SVG illustrations are on the critical path for Homepage, TV, Events, Lab.
- Google OAuth redirect URI must be configured: `{AUTH_URL}/api/auth/callback/google`
