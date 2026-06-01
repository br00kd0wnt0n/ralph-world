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
- `profiles` — user metadata + entitlement + payment cache (FK → users)
  - Identity: display_name, role, theme/language prefs
  - Entitlement (RW2.0): `tier` ('guest'|'free'|'paid'), `marketing_opt_in` + timestamp + source
  - Stripe cache (RW2.0): `stripe_customer_id`, `stripe_subscription_id`, `subscription_current_period_end`
  - Shipping cache (RW2.0): `shipping_address_cached` (jsonb, source of truth = Stripe)
  - Deprecated, kept until Phase 4 cutover: `subscription_status`, `subscription_start`, `subscription_end`, `shopify_customer_id`
- `articles` / `lab_items` — content; `access_tier` ∈ {`everyone`, `members`, `paid_subscribers`} (RW2.0; default `everyone` for launch tactic)
- `events` — events with creature positioning (x/y) + country_code
- `event_rsvps` — RSVP tracking (wired up in Phase 3)
- `tv_vod` — deprecated; no per-VOD gating in RW2.0 (live stream only via Broadcaster)
- `case_studies` — Work With Us case study cards
- `homepage_config` — key/value config for homepage modules + RW2.0 runtime config (tv_relay_hls_url, tv_preview_seconds, magazine_*)
- `webhook_log` — generic webhook event log

### RW2.0 additions (Phase 1)
- `email_subscriptions` — Mailchimp list memberships per user
- `consent_log` — append-only GDPR consent audit (terms / privacy / marketing)
- `audit_log` — append-only audit trail for sensitive mutations
- `shopify_links` — Ralph.world ↔ Shopify customer mapping (every user, async-created)
- `stripe_events` — idempotent Stripe webhook intake (unique on stripe_event_id)
- `email_events` — Resend delivery/engagement event log + send-attempt ledger (`idempotency_key` partial-unique index drives send-side dedupe)
- `magazine_issues` — quarterly issue lifecycle (draft → published) with Shopify variant SKU + cached postage rate
- `magazine_shipments` — per-(subscriber, issue) ledger with UNIQUE (user_id, issue_id) for retry idempotency

## Auth flow

### Google OAuth
```
1. User clicks "Continue with Google"
2. Auth.js redirects to Google OAuth
3. Google callback → Auth.js creates user + account records in Postgres
4. createUser event:
   - auto-creates profile row (tier: 'free', subscription_status: 'free')
   - writes 2 consent_log rows (terms + privacy, granted=true, source=signup_form)
5. JWT session with userId → AuthContext provides user + profile to components
6. Profile data (tier, role) attached to session via callback
```

### Email/password (Credentials provider, Task 1.3)
```
1. User POSTs { email, password, name? } to /api/auth/signup
2. signupWithPassword (lib/auth/signup.ts):
   - Validates email + password (min 10 chars).
   - Looks up users by email:
     · Existing + verified  → enumeration-safe "check your inbox" response, no email sent.
     · Existing + unverified → refresh password hash, re-issue verification token.
     · Fresh                → INSERT users (password_hash = bcrypt cost 12),
                              INSERT profiles (tier='free', subscription_status='free'),
                              logSignupConsents (terms + privacy).
   - Issues a 32-byte hex verification token (24h TTL) into verification_tokens.
   - sendTemplate('email-verification') with the verify URL.
3. User clicks the link → GET /api/auth/verify-email?email=&token=
4. consumeVerificationToken: matches the row, sets users.email_verified = now(),
   deletes the token. Redirects to /login?verify=ok.
5. User signs in via Credentials provider — authorize() rejects unverified users
   with throw new Error('EmailNotVerified') so the login page can offer
   "resend verification email".
```

Password storage: `users.password_hash` (text, nullable). bcryptjs cost factor 12 wrapped in `lib/auth/passwords.ts` so callers don't depend on the library directly. OAuth-only users have `password_hash = null` and never hit the Credentials path.

### Audit + consent logs (Phase 1)
- `lib/audit.ts` exports `logAction({ actorId, action, targetType, targetId, before, after, source })` — append-only writes to `audit_log` for sensitive mutations (role changes, subscription state, account deletion, webhook receipt, magazine fulfillment events). Failures are swallowed + logged to stderr so they never break the caller.
- `lib/consent.ts` exports `logConsent({ userId, consentType, granted, source, policyVersion? })` and `logSignupConsents(userId)` (the helper called from createUser). `POLICY_VERSION` constant bumped when terms / privacy copy changes substantively.
- Both tables are append-only — `ralph_world` DB role has INSERT but no UPDATE / DELETE (enforced via DB grants in Task 1.2). On account erasure, rows survive with `user_id` set to null — legal record outlives the user.

### Shopify customer auto-create (Phase 1)
- `lib/shopify/customer.ts` exports `findOrCreateCustomer({ userId, email, name? })` — called fire-and-forget from Auth.js `createUser` (OAuth path) and from `lib/auth/signup.ts` (Credentials path). Algorithm per arch doc §11: short-circuit if a `shopify_links` row already exists for `userId`; else `GET /admin/api/.../customers/search.json?query=email:...`; if matched, link with `auto_email_match_at_signup`; if not, `POST /admin/api/.../customers.json` and link with `auto_signup_create`. Every successful link writes an `audit_log` row (`action='shopify_link_created'`, `source='system'`).
- `lib/shopify/admin-client.ts` is the low-level wrapper: REST 2024-01, X-Shopify-Access-Token auth, retry-with-exponential-backoff (default 3 retries on 5xx / 429 / network errors), immediate throw on 4xx. Accepts an injected `fetchImpl` so unit tests don't touch global state.
- Idempotency: short-circuit on existing link + unique constraint on `shopify_links.shopify_customer_id` (23505 caught and swallowed if a concurrent invocation won the race).
- Failure mode: errors are logged and swallowed at the call sites in `lib/auth.ts` and `lib/auth/signup.ts` — signup MUST complete even if Shopify is unreachable. Future admin-alert pass picks up missing links.
- Env: `SHOPIFY_STORE_DOMAIN` (e.g. `ralph-world.myshopify.com`), `SHOPIFY_ADMIN_ACCESS_TOKEN`, optional `SHOPIFY_ADMIN_API_VERSION`.

### Transactional email (Phase 1)
- `lib/email/send.ts` exports `sendTemplate({ userId, to, templateId, props })` — the single entrypoint for transactional email. Idempotent on `(userId, templateId, sha256(props))`: builds a key, INSERTs a `send_attempted` row carrying that key, lets Postgres' partial unique index on `email_events.idempotency_key` reject duplicates, then calls Resend. A second call with the same inputs returns `{ sent: false, skipped: true }` without hitting Resend. Re-sends with different props (e.g. a fresh verification link) hash differently and go through.
- Templates live in `components/emails/*.tsx` as React Email components and are registered in `lib/email/send.ts`. First template: `EmailVerification`. See [docs/email-templates.md](docs/email-templates.md) for the registry contract.
- `POST /api/webhooks/resend` verifies the Svix HMAC signature (`lib/email/verifyResendSignature.ts`) on every request — 5-minute replay window, multi-signature header support — then records each event in `email_events`. Returns 401 on signature failure, 400 on malformed body, 500 on DB failure (so Resend retries), 200 once written.
- Env: `RESEND_API_KEY`, `RESEND_FROM` (defaults to `Ralph.world <hello@ralph.world>`), `RESEND_WEBHOOK_SECRET` (Svix `whsec_...` secret — prefix optional).

## API endpoints

### Auth (Auth.js)
| Method | Path | Purpose |
|---|---|---|
| GET/POST | /api/auth/* | Auth.js handlers (signin, callback, signout, session) |
| POST | /api/auth/signup | Email/password signup → sends verification email |
| GET | /api/auth/verify-email | Consume verification token, mark email_verified |

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
| POST | /api/webhooks/resend | Resend delivery/engagement events → email_events (Svix HMAC verified) |

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
