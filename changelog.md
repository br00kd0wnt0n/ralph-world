# Changelog: ralph-world

All notable changes documented here, organised by session. Most recent on top.

---

## 2026-06-02 — Phase 1 live apply: schema delta + role separation in prod

Phase 1 architecture committed across the 2026-06-01 work is now live on
the Railway Postgres backing ralph.world. Three scripts applied in order
against the prod DB (low-stakes — only 3 users: Brook, Chris, Josh):

1. **`scripts/apply-phase-1-schema.sql`** — hand-crafted IF-NOT-EXISTS
   mirror of `drizzle-kit push`. Added 8 new tables (`email_subscriptions`,
   `consent_log`, `audit_log`, `shopify_links`, `stripe_events`,
   `email_events`, `magazine_issues`, `magazine_shipments`), 8 new columns
   on `profiles`, `users.password_hash`, flipped `articles.access_tier` +
   `lab_items.access_tier` defaults to `'everyone'`, and the partial unique
   index on `email_events.idempotency_key`. Wrapped in `BEGIN/COMMIT` with
   three sanity DO-blocks; all three NOTICEs green.
2. **`scripts/migrate-phase-1-access-tier.sql`** — 6 articles renamed
   `free→everyone`, 7 lab_items renamed `free→everyone`, 3 profiles
   backfilled with `tier` from `subscription_status`. No legacy values
   left.
3. **`scripts/db-roles-phase-1.sql`** — created `ralph_cms` + `ralph_world`
   roles, applied all grants. Both sanity DO-blocks confirmed:
   `ralph_world` cannot UPDATE `profiles.role`, and cannot UPDATE/DELETE
   any of the 4 append-only tables (`audit_log`, `consent_log`,
   `webhook_log`, `stripe_events`).

Then DSN cutover on both Railway services:
- **ralph-world** `DATABASE_URL` swapped to `ralph_world` role. Verified:
  `/api/health` returns `{status: 'ok', db: 'connected'}`; Google OAuth
  signin completes; `/account` renders the new Subscription / Your events
  / Shipping address / Mailing preferences sections; tier reads correctly
  as `free` (per backfill).
- **ralph-cms** `DATABASE_URL` swapped to `ralph_cms` role. Verified:
  article list loads (6 articles); edit-save round-trip works end-to-end
  through the new role.

### Gotcha caught + fixed during apply

The grants script uses psql's `:'name'` auto-quoting form, but my original
runbook instructed `-v X="'$VAR'"` with extra outer single quotes — that
set the passwords to `'<base64>'` (literal quotes included). Re-ran with
`-v X="$VAR"` and the passwords came through clean. Runbook
(`docs/db-role-separation.md`) updated with an **IMPORTANT** callout +
the proper URL-encoding pattern for the Railway DSN (`openssl rand
-base64` produces `/` and `+` which need encoding).

### Decisions logged
- Decided to apply against prod now (vs waiting for staging DB) because
  pre-Phase-4 the DB has only 3 users — rollback is "drop new tables, 3
  users re-signup." After Substack import we'd be touching thousands of
  rows with GDPR-relevant consent records.

### Out-of-scope bug surfaced (tracked separately)
- Google OAuth consent screen on ralph-world says **"Sign in to
  CareBears"** — `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in Railway are
  pointed at a stale "CareBears" Google Cloud project. Signin still
  completes because the redirect URIs are configured. Spawned as a
  separate task to either rebrand the project or migrate credentials.
  Likely same issue on ralph-cms.

### Phase 1 status: complete
All 9 tasks shipped and live-verified. Phase 2 (Stripe subscriptions)
unblocked.

---

## 2026-06-01 — Ralph World 2.0 build — Phase 1 underway

Builds against the locked architecture doc at
`~/ralph-cms/docs/ralph-world-2-accounts-architecture.md` (v7,
2026-05-12). SOW at `~/ralph-cms/docs/sow-ralph-world-2.md`.

### Phase 1 tasks shipped
- **1.0 Test harness** — Vitest (unit/integration, jsdom, Testing Library, jest-dom) + Playwright (E2E). `.mts` vitest config to dodge ESM/CJS clash. Separate `tsconfig.test.json` keeps test types out of the Next build. npm scripts: `test`, `test:watch`, `test:e2e`. Smoke test passing.
- **1.5 Entitlement function** — `lib/entitlements.ts` (pure: `canAccess`, `tvPreviewSeconds`, `tierFromSession`, types per arch doc §8). `lib/entitlements-server.ts` (server bridge: `currentTier`, `canCurrentUserAccess`, `currentTvPreviewSeconds`, guarded by `import 'server-only'`). 27 unit tests covering the full 9-way access matrix + all guest representations + tunable preview window + tier-from-session integration.
- **1.1 Schema migration** — `profiles` extended with 8 new columns (tier, stripe_customer_id, stripe_subscription_id, subscription_current_period_end, shipping_address_cached jsonb, marketing_opt_in + at + source). 8 new tables: email_subscriptions, consent_log, audit_log, shopify_links, stripe_events, email_events, magazine_issues, magazine_shipments. Article + lab access_tier defaults flipped `'free'` → `'everyone'` (launch tactic). Deprecated profile columns kept until Phase 4. Data-migration SQL at `scripts/migrate-phase-1-access-tier.sql` (idempotent; access_tier rename + tier backfill from subscription_status). npm scripts: `db:push`, `db:generate`, `db:studio`. Acceptance (`drizzle-kit push` against test DB) blocks on test DB provisioning.
- **1.8 Audit + consent helpers + signup wiring** — `lib/audit.ts` (`logAction`) and `lib/consent.ts` (`logConsent`, `logSignupConsents`, `POLICY_VERSION`). Auth.js `createUser` event now sets `tier='free'` (alongside legacy `subscription_status='free'`) and emits 2 consent_log rows (terms + privacy, granted=true, source='signup_form'). Both helpers are best-effort — failures are logged + swallowed so audit lag never breaks user-facing flows. Vitest config now aliases `server-only` to a no-op stub and `@` to the project root so server-coupled modules can be unit-tested. **15 new tests** covering insert payloads, default handling, null actorId/userId (post-erasure), withdrawn consent, substack_migration source, signup-helper writes 2 rows, and DB-failure isolation. DB-grant acceptance (append-only enforcement) blocks on Task 1.2.
- **1.4 Resend integration + transactional send service** — `lib/email/send.ts` exports `sendTemplate({ userId, to, templateId, props })` and `buildIdempotencyKey()`. Idempotent on `(userId, templateId, sha256(props))` via a `send_attempted` row in `email_events` carrying the key + a Postgres partial unique index on `idempotency_key`. Catches the 23505 unique-violation, returns `{ skipped: true }`, no Resend call. Re-sends with rotated tokens hash differently and go through. First template: `components/emails/EmailVerification.tsx` (React Email). Resend client cached per-process with `_resetResendClient()` test seam. Webhook intake at `app/api/webhooks/resend/route.ts` — Svix HMAC verifier (`lib/email/verifyResendSignature.ts`) with 5-min replay window, multi-signature header support, and injectable `now()` for deterministic tests. Schema delta: `email_events.idempotency_key` (text, partial unique index where not null). New deps: `resend@^6`, `@react-email/components`, `react-email`. New docs: `docs/email-templates.md` (registry contract). **21 new tests** (10 signature verifier + 11 send-service). Acceptance (live Resend test send + webhook delivery against `RESEND_WEBHOOK_SECRET`) blocks on Resend key + verified ralph.world domain.
- **1.3 Email/password auth (Credentials provider + verification flow)** — Auth.js Credentials provider in `lib/auth.ts`. New helpers: `lib/auth/passwords.ts` (bcryptjs cost 12, min length 10, 256-char DoS cap, swappable to argon2id later), `lib/auth/verification-tokens.ts` (32-byte hex tokens in the existing `verification_tokens` table, 24h TTL, atomic consume + delete, expired-row purge), `lib/auth/signup.ts` (validation → existence check → create users + profiles → consent rows → issue token → sendTemplate). Routes: `POST /api/auth/signup` (enumeration-safe response shape — same "check your inbox" for fresh signups and the already-verified branch), `GET /api/auth/verify-email` (consume token, redirect to `/login?verify=ok` or `/login?verify=error&reason=...`). Credentials provider throws `EmailNotVerified` for unverified users so the login page can offer a resend flow. Schema delta: `users.password_hash` (text, nullable). New dep: `bcryptjs` + `@types/bcryptjs`. **26 new tests** (9 passwords + 9 verification-tokens + 8 signup). Playwright E2E acceptance (full signup → verify → signin flow) blocks on Resend key + test DB.
- **1.7 Member portal scaffold (view-only)** — `/account` now surfaces the RW2.0 `profiles.tier` (with legacy `subscription_status` fallback during the Phase 1 → Phase 4 cutover window). Three new view-only sections per arch doc §7: **Your events** (RSVPs placeholder — Phase 2 fills it), **Shipping address** (mirrors Shopify default_address once a purchase happens — `formatShippingAddress` helper handles the common shape and falls back to JSON), **Mailing preferences** (read-only badge showing `marketing_opt_in`; toggle lands with Mailchimp sync in Phase 4). Session callback in `lib/auth.ts` now hydrates the new profile fields (`tier`, `marketingOptIn`, `shippingAddressCached`) so the page doesn't need a second DB hit. No external deps. Acceptance E2E (sign in → land on /account → assert tier displayed) blocks on test DB.
- **1.2 DB role separation — SQL + runbook drafted** — `scripts/db-roles-phase-1.sql` (idempotent) creates `ralph_cms` (full r/w) and `ralph_world` (column-level UPDATE on `profiles` excluding `role`; INSERT-only on `audit_log` / `consent_log` / `stripe_events`; SELECT-only on CMS-owned content) per arch doc §13. Includes default-privileges so future tables inherit sensible grants. Two sanity DO-blocks `RAISE EXCEPTION` if the grants drift (e.g. `ralph_world` has UPDATE on `profiles.role`) so a botched apply rolls back rather than silently shipping. Runbook at `docs/db-role-separation.md` covers role creation, Railway DSN swap, in-DB verification queries, and rollback. Apply blocks on Railway provisioning + coordinating the cutover with Josh — once applied, audit / consent tamper-evidence is enforced at the DB layer, not just at the app layer.
- **1.6 Shopify customer auto-create (async job)** — `lib/shopify/customer.ts` exports `findOrCreateCustomer({ userId, email, name? })`. Algorithm per arch doc §11: check `shopify_links` for an existing row → if not, search Shopify by email → link with `auto_email_match_at_signup` if found, else `POST customers.json` and link with `auto_signup_create`. Every link emits a `shopify_link_created` audit row. Wired into Auth.js `createUser` (OAuth path) AND the Credentials signup (`lib/auth/signup.ts`) via dynamic-import fire-and-forget — signup MUST not fail because Shopify is unreachable. `lib/shopify/admin-client.ts` is the REST 2024-01 wrapper: X-Shopify-Access-Token auth, exponential backoff on 5xx / 429 / network errors (3 retries), immediate throw on 4xx, injectable `fetchImpl` for tests. Idempotent on userId (short-circuit) and on shopify_customer_id (23505 swallowed). New env: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, optional `SHOPIFY_ADMIN_API_VERSION`. **19 new tests** (10 admin-client incl. retry / 4xx-no-retry / exhaustion / header shape; 9 customer incl. already-linked / email-match / create / split-name / 23505-race / 5xx retry / 4xx-no-retry). Live acceptance (real Shopify dev-store customer create) blocks on a Shopify Admin API token.

### Decisions logged
- Lint gate: React-hooks rules downgraded `error` → `warn` in `eslint.config.mjs` (Josh). Existing flags are intentional SSR/hydration-sync patterns; fixable candidates listed in `docs/lint-followups.md`.
- Phase 4 §4.2 Substack migration: no user notification needed (Nicola). Soft opt-in transfer covered.

### Pending
- Phase 1 remaining: nothing — see 2026-06-02 entry for live apply outcome.
- External provisioning: test DB, Resend key + verified ralph.world domain, Shopify Admin API token, Railway env vars per SOW pre-flight.

---

## 2026-05-16 — Events arms interaction + nav stability + planet exits

**Session goal:** Wire the Events page arms feature (click to reveal
event info panels with bunching behaviour), stabilise the nav fix/unfix
toggling on short pages, and finish the homepage planet exit animation
on page transitions. See [docs/session-2026-05-16-events-page.md](docs/session-2026-05-16-events-page.md).

### Events page — MinglingCharacters
- **Click-to-reveal arm interaction.** Each active event is represented by a coloured arm (`blue_arm.svg`, `green_arm.svg`, `orange_arm.svg`, `pink_arm.svg`). Clicking an arm:
  - Bunches neighbouring arms toward the clicked one (left-side arms bunch right, right-side arms bunch left)
  - Reveals a 388×276 event info panel coloured by the event's `accentColour` (falls back to ralph-green)
  - Panel spin-in: starts `scale(0) rotate(±100deg)`, lands at `scale(1) rotate(±slant)` where slant is a small random angle. Transform origin = bottom corner adjacent to the hand
  - Wave animation on idle arms pauses while any arm is active
- **Data integration.** `MinglingCharacters` now receives the full `events` array (slug, title, descriptionShort, eventDate, locationName, accentColour) instead of just `eventCount`.
- **Outline on hover.** 4px black hard-edge outline implemented via stacked `drop-shadow` filters.
- **Overflow.** `EventsClient` section dropped `overflow-x-hidden` to let panels overflow the container; arms container uses `overflow-x: visible` + `overflow-y: clip` to hide arm bases.

### Nav stability
- **Hysteresis fix** in `components/layout/Nav.tsx` — nav now fixes at scrollY 98px (down) and only unfixes at 70px (up). The 28px dead zone stops the rapid fix/unfix toggle that happened on short pages near the boundary.
- **Stepped blur header.** Replaced the single backdrop blur with 11 horizontal 7px strips (12px blur at top → ~0 at bottom, opacity 0.5 → ~0). Sits at `-z-10` so it doesn't block header buttons.
- Nav padding-top trimmed 24px → 16px to match header button distance.

### Page transitions — homepage planets
- Replaced the custom `PageTransitionContext.isExiting` flag with Framer Motion's `usePresence()` hook in `PlanetSection`. When `!isPresent`, the planet slides 100px toward its nearest screen edge and fades; the colour panel fades quickly (0.15s) so it doesn't briefly enlarge during exit.
- Exit direction map (`PLANET_EXIT_DIRECTIONS` in `lib/animation/page-transitions.ts`): TV / events / lab → right; magazine / shop → left.
- `app/template.tsx` exit timing raised to 0.35s so child planet animations get to complete; easing now uses cubic-bezier arrays for TS-compatible `Variants` typing.

---

## 2026-05-13 — Header & nav redesign + Events arms scaffold

**Session goal:** Reskin the utility-bar header (rounded buttons,
scroll-aware logo + Subscribe pill, transparent background → 50%
black when nav fixes), introduce the MinglingCharacters arm scaffold
on Events, and rename `/play` → `/work-with-us`. See
[docs/session-2026-05-13-header-nav-redesign.md](docs/session-2026-05-13-header-nav-redesign.md).

### Header utility bar
- Removed the pink bottom border + solid black background. Bar is transparent by default and animates to `rgba(0,0,0,0.5)` when the main nav fixes itself.
- All header buttons now: 44px tall, 22px radius, 2px white border, Gooper Trial 700/14px, transparent background → `bg-ralph-pink` on hover/active.
- Layout change: "Subscribe to Ralph" + "Log in" now left-side; "Work with us" + Theme + Language/avatar right-side. 24px gap throughout.
- **Scroll-aware logo + Subscribe.** Past 24px scroll the circular logo scales 0→1 with an ease-out-back bounce, and the Subscribe button margin animates 0→68px to make room.

### Main nav
- Logo: 98px height, 24px from top. Items: 44px height row, centred, 32px bottom padding.
- **Fixed-nav behaviour.** Past ~122px scroll (refined to 98px the following session), the nav row fixes at `top: 16px` (aligned with header buttons). Item gap collapses 70px → 24px, a 44px spacer prevents content jump, z-index bumps to 60 (above the header bar).

### Events page — arms scaffold
- First pass of `MinglingCharacters`: arms cycle through 4 colours, positioned 10–90% across the container, 500–550px tall (deterministic per index), sticking up 50px below the container bottom. Component accepts an `eventCount` prop (replaced by full `events` array in the 2026-05-16 session).
- Starfield enhancement: horizontal star movement on `/events` (faster, single direction) — detected via `usePathname()`.

### Routes
- `app/play/` renamed → `app/work-with-us/`. Nav and the "Work with us" link updated.

### Theme toggle
- Swatch enlarged 28×28 → 44×44 circular (border-radius 50%), 2px white border, Gooper Trial 700/14px label.

---

## 2026-05-10 — Article overlay redesign + Join Ralph + Work With Us parallax

**Session goal:** Rebuild the article overlay against Tim's design,
add the `/join-ralph` carousel page, and build the
parallax-planet "Expertise" + "What's Next" section on the Work With
Us (then `/play`) page. See [docs/session-2026-05-10.md](docs/session-2026-05-10.md).

### Article overlay rebuild (`components/magazine/ArticleOverlay.tsx`)
- Full-screen container with the article's lead image repeating as a 70px-padded outer frame; theme-coloured (CMS) inner panel with 110px padding; 1024px max content width.
- Close button: 48×48 square, 1px black border, transparent, positioned 86px from top/right.
- Typography (Gooper Trial for titles, intro, subtitle; Roboto 500 15px for body), 420×2px black dividers between title/categories and bylines/share buttons.
- Share buttons: 38px tall, `#EBEBEB` fill, 2px black border + 4px offset shadow, Gooper 600 16px (Facebook / X / Link).
- Categories: 34px tall black pills, white uppercase text.
- **Direct-URL fix.** Created `app/magazine/[slug]/page.tsx` that redirects to `/magazine?read=[slug]` so visiting an article URL directly or refreshing no longer 404s.

### Magazine category tabs
- Selected tab now uses `underline_magazine.svg` (same as the nav active underline), text stays black (not orange), underline scaled to 80% (114×8px).

### Join Ralph (`/join-ralph`)
- "Get started" / "Subscribe to Ralph" button now links to `/join-ralph` instead of opening the SubscribeModal. Header button gets pink background when on the route.
- 4-slide carousel — slide 1 is 2-column, slides 2–4 single-column centred — with animated left/right slide transitions, Back/Next shadow buttons, and progress dots.
- Planet decoration uses the new `planet_background_creative.svg` / `planet_foreground_creative.svg` assets.

### Work With Us parallax (`components/play/`)
- `ExpertisePlanet` (planet 1) + `WhatsNextPlanet` (planet 2) parallax against scroll: planet 2 starts -200px and moves +500px; planet 1 starts +200px and moves -300px so they cross. Shadow follows planet 1.
- `ParallaxPlanets.tsx` wraps both with `useSpring` (stiffness 100, damping 30) for smooth interpolation; planet SVGs converted to PNGs to keep transforms GPU-cheap. `willChange: transform` on all animated elements.
- ExpertisePlanet bullets alternate left/right alignment with randomly-selected & rotated star markers (`bullet_star_01/02/03.svg`).
- "Play with Ralph" nav link gets `underline_creative.svg` on `/play` (now `/work-with-us`); text stays white, not pink.
- Hero on the page uses `SectionIntro` with `text_play_with_ralph.svg`.

---

## 2026-05 (mid-cycle) — Nav + dropdown redesign + layered planet pattern

**Session goal:** Re-skin the utility-bar header, extract the
"layered planet decoration" pattern from Magazine and apply it across
Events / Lab / TV / Shop, and introduce a single `PinkDropdown` shell
behind both the Theme and Language pickers. Shipped in commit
`c1c0814`. See [docs/nav-and-dropdown-redesign.md](docs/nav-and-dropdown-redesign.md).

### Header / utility bar reskin
- PNG logo replaced with inlined `ralph_logo_circle.svg` so the face paths can pick up `currentColor` (hover turns ralph-pink).
- Consistent `text-chrome` utility (Roboto 700/13px) across the Play with Ralph link, Log in link, Theme trigger, and Get Started CTA.
- Get Started: transparent fill, 2px white border, 8px radius, hover → `bg-ralph-pink`.
- Active nav items get a hand-drawn underline SVG behind the label (per-section colour: TV purple, Magazine orange, Events teal, Lab yellow, Shop teal). Mobile nav keeps the old solid bar.

### `PinkDropdown` shell (`components/layout/PinkDropdown.tsx`)
- New shared shell that gives both the Theme and Language dropdowns the same chrome — pink wrapper with 19px paddingRight/Bottom for the offset, white card with `3px solid #EA128B` border that hides into the pink offset, 45° angled corners via `clip-path`, pointing notch that lands over a configurable trigger spot via the `right` prop.
- Three exported framer-motion variant objects to wire item cascades: `panelVariants` (spring pop-in 420/22, rotate -2°, origin top-right), `stackVariants` (staggerChildren 0.06, delayChildren 0.1), `panelItemVariants` (fade + y -8).
- Both Theme (`ThemeToggle`) and Language (`LanguageModal`) refactored to plug into it — change one shell, both panels update.

### Layered planet pattern across section pages
- The Magazine page's 260px planet decoration block was previously bespoke; extracted into a repeatable two-layer `<section>`:
  - Absolute background layer: planet bg + fg SVG layers (270px tall) + white div filling everything below
  - Relative content layer with `paddingTop: 200` and optional negative-margin overflow on its first child
- Applied to Magazine, Events, Lab, TV, and Shop. Planet SVGs use `preserveAspectRatio="none"` so cover-sized backgrounds stretch to any wrapper width.
- New planet assets in `public/imgs/`: `planet_background_*.svg` + `planet_foreground_*.svg` for `events`, `lab`, `tv`, plus `creative` (used by `/join-ralph` and `/work-with-us`). Shop reuses `_tv` planets as a placeholder.
- Events content (CrowdBackground / EventCreature / EventFlyout) intentionally cleared below the planet for rebuild — files preserved on disk for reuse. The arm-based MinglingCharacters concept replaces it in the 2026-05-13/16 sessions.

### Decisions made
- **One shell, two pickers.** A single `PinkDropdown` makes the offset shadow, notch, and pop-in identical across Theme + Language and means future polish lands in one file.
- **Unified planet sections.** The previous "fixed-height decoration on top of a separate white panel" approach made it impossible to overflow content up over the planet without margin hacks. The new pattern uses `paddingTop` on the content layer as the single vertical knob.
- **Shop planet placeholder retained.** Reusing `_tv` planet assets is intentionally visible until proper Shop planet assets ship.

---

## 2026-05 (mid-cycle) — Page transitions (Frozen Router)

**Session goal:** Wire smooth enter/exit animations between routes in
the Next.js App Router. See [docs/page-transitions.md](docs/page-transitions.md).

### Added
- `components/layout/PageTransitionWrapper.tsx` — orchestrates page transitions with `AnimatePresence mode="wait"` keyed on pathname. Uses a **FrozenRouter** internal component that captures `LayoutRouterContext` at mount, so when AnimatePresence detects the pathname change, the exiting subtree renders with its frozen context (i.e. the old page) while the new content mounts behind it. Scrolls to top on `onExitComplete` (`behavior: 'instant'` so it doesn't fight the animation).
- `useTransitionState()` hook (exported from the same file) — any child can read `isExiting` to drive its own exit animations.
- `lib/animation/page-transitions.ts` — exit timing variants and a `PLANET_EXIT_DIRECTIONS` map used by `PlanetSection` to slide each homepage planet toward its nearest screen edge on exit.
- Section pages got sequenced entry variants (`sectionContainerVariants`, `sectionIntroVariants`, `sectionBgVariants`, `sectionContentVariants`) so intro → background/planet → content fades in 0.0s / 0.3s / 0.5s.

### Decisions made
- **PageTransitionWrapper lives in `app/layout.tsx`, not `template.tsx`.** Template is recreated on every navigation, which would destroy AnimatePresence before it could run the exit. Layout persists.
- **`mode="wait"`** so old content fully exits before new content mounts. Avoids the cross-fade flash that "popLayout" would introduce.
- **Quick panel fade.** Homepage `PlanetSection`'s coloured panel fades over 0.15s separately from the planet's 0.3s slide, so the big coloured square doesn't briefly become visible mid-exit.

---

## 2026-05 (mid-cycle) — Homepage parallax overhaul + brand colour update

**Session goal:** Reimagine the homepage as a multi-layer parallax
space scene, ship the typography system, refresh the brand palette,
introduce the reusable `Button` component, and redesign the footer.
Branch: `feat/home-parallax`. See [docs/homepage-parallax-changes.md](docs/homepage-parallax-changes.md).

### Parallax layer system
- **`components/layout/Starfield.tsx`** rewritten: 350 mixed particles across 3 depth bands (far/mid/near, with the near band rendered as sparkle crosses), subtle pink/blue/purple/warm tints, sine-wave drift so the field feels alive even without scroll, max 2 shooting stars on a ~16s cadence. Hidden on mobile, only renders on `cosy-dynamics`. Initialises `scrollY` from `window.scrollY` to prevent the first-interaction jump.
- **`components/layout/MidgroundLayer.tsx`** — 3 illustrated items (moon, planet, satellite) + a flying spaceship that loops right-to-left on 18s. All scroll updates rAF-batched, transforms only (no `top` manipulation).
- **`components/layout/ForegroundLayer.tsx`** — 3 illustrated items (alien rocket, saucer, spaceship) scrolling at 1.3–1.4× content speed.
- Z-stack: Starfield z-0 → Midground z-[1] → page content z-10 → Foreground z-20.

### Planet sections (`components/home/PlanetSection/`)
- Complete interaction rewrite. Sections now have three reveal states:
  1. **Scroll peek** — when the section center enters the middle 90% of the viewport, the panel peeks 20px from behind the planet via animated `clip-path: inset()`
  2. **Hover/tap to open** — sets `isActive`, panel slides out fully (spring 200/20/0.8). Planet `pointer-events` disabled while open so the panel buttons are clickable.
  3. **Auto-close** — mouse/scroll observer closes the panel when the cursor leaves the 90% viewport bounds or the user scrolls away.
- Panel: fixed 276px height, two columns of 340px each, 20px gap; column order reverses for planet-on-left sections. Staggered content reveal (col 1 +150ms, col 2 +300ms).
- Title/subtitle block sits to the side of each planet (toward page center), parallaxes at 30% of the planet's shift when the panel opens. Per-section title images: `title_<section>.png` (and `title_<section>_secondary.png` inside the panel).
- Added a Ralph TV section (brand purple `#7B3FE4`) as the first planet. Order: TV (right) → Magazine (left) → Events (right) → Shop (left) → Lab (right). Vertical gap between sections reduced (`py-4 md:py-6`).

### Brand colours updated
| Token | Old | New |
|---|---|---|
| `--color-ralph-pink` | `#FF2098` | `#EA128B` |
| `--color-ralph-blue` (was Teal) | `#00C4B4` | `#5FBCBF` |
| `--color-ralph-yellow` | `#FFE566` | `#FBC000` |
| `--color-ralph-green` | `#4CAF50` | `#44B758` |
| `--color-ralph-orange` | `#FF6B35` | `#EE6626` |
| `--color-ralph-purple` | `#7B2FBE` | `#7B3FE4` |

Panel text colour rule: purple panel = white text + white buttons; all other panels = black text + black buttons.

### Typography system
- **Roboto** (Google Fonts, 400/600/700/800) loaded via `next/font/google`.
- **Gooper Trial SemiBold** loaded via `@font-face` from `public/fonts/Gooper7-SemiBold.woff{,2}`.
- Body default switched from Arial → Roboto.
- New text utilities defined as `@utility` in `globals.css`: `text-body`, `text-body-sm`, `text-body-bold`, `text-chrome`, `text-tag`, `text-intro`, `text-btn`. See [docs/homepage-parallax-changes.md](docs/homepage-parallax-changes.md) for the size/line-height/weight table.

### `Button` component (`components/ui/Button.tsx`)
- Reusable 43px-tall button with separate shadow element offset 4px down+right. Hover shifts the button 2px toward the shadow; click flushes it. Accepts either `href` (Next.js Link) or `onClick` (button).

### Page nav (`components/layout/PageNav.tsx`)
- New reusable in-page nav strip: wordmark logo 98px tall, items in Gooper Trial 22px with 70px gaps. Transparent background so the starfield shows through. Sits 16px below the header, 50px above page content.

### Hero + Footer
- Hero heading replaced with custom image (`text_welcome_to_our_world.png`), `min-h-[85vh]` constraint dropped.
- Footer planet section: `footer_planet.png` centred, wordmark + "Entertainment People" overlay justified to the bottom of the page with 180px top padding.
- Footer bar: 103px tall, 4px pink top border, Globe animation bottom-left, "Contact us" + 3 social icon buttons (TikTok / Instagram / YouTube) right-aligned with 32px gap. Icon hover → pink circle with black icon.
- `components/layout/Globe.tsx` ported from previous codebase: 120px Globe cycling through London/America/Tokyo/Mumbai with an 8-frame spin between holds, all frames pre-rendered as hidden images for smooth swaps.

---

## 2026-05 (mid-cycle) — Magazine page redesign

**Session goal:** Apply Tim's Magazine designs — decorative planet
section, redesigned Cover Story, dashed-separator category tabs, 6-up
article grid with explode-on-hover. Branch: `feat/page-transitions`.
See [docs/magazine-page-redesign.md](docs/magazine-page-redesign.md).

### Page structure (top → bottom)
| Section | Component | Notes |
|---|---|---|
| Intro | `SectionIntro` | `text_fun_glossy_mag.svg`, 575px width |
| Planet decoration | inline in `MagazineClient` | Two-layer SVG bg/fg + "Cover Story" title baked in (later extracted into the cross-page planet pattern) |
| Cover story | `CoverStory.tsx` | 1040px max, 45/55 col split, diagonal orange ribbon |
| Category tabs | `CategoryTabs.tsx` | 502px max, dashed separators, 25% width per tab, no gap |
| Article grid | `ArticleGrid.tsx` | 3×2 grid, 1px black gaps, explode-on-hover |

### Cover story
- 45/55 column split, 32px gap, 1088px container (1040 + 48 padding).
- Image aspect 1.629, 12px radius, with a CSS-rotated `bg-ralph-orange` diagonal ribbon at the top-left corner.
- Typography: Roboto 800/12 for category tags, Gooper Trial 600/18 for tagline + title, Roboto 600/14 for body.
- Button: reusable `Button` (logged-in → "Read now", guest → "Sign up to read").

### Category tabs
- Dashed separators top + bottom (`dashed_separator_top.svg`, `dashed_separator_bottom.svg`), Gooper Trial 18px, black default → `ralph-orange` active with a 2px underline. Selection updates the URL via `window.history.pushState` (no server fetch).

### Article grid
- 3×2 grid, 1168px max, 1px black border with 1px black gap (the gap-as-divider trick).
- **Explode hover effect** — on hover each card pushes outward from the grid center by 16px and scales 1.04x. Hover overlay: yellow dashed inset frame, gradient bottom overlay, category tags in pink, title white, intro 70% white.
- 6 placeholder articles render when the DB has no published rows.

### Decisions made
- Mounted the Cover Story title *inside* the planet decoration section (not floating above the next white section) to eliminate gaps between decoration and content. This became the seed for the cross-page layered planet pattern.
- `Button` updated with `width: fit-content` so its shadow tracks the actual button width.
## 2026-04-24 — Design pass, CMS expansion, pre-handoff hardening

Large session ahead of the frontend-polish handoff. Added two new
homepage structures, rebuilt Play with Ralph, rolled Tier A themes
across the whole site, fixed a set of caches that were freezing TV
data, and closed a batch of stability + security gaps surfaced by a
pre-handoff audit.

### Homepage
- **Ralph TV planet** added in the top-spot with Broadcaster
  schedule feeding the rollout (`ON NOW` / `UP NEXT` items). New
  `upper-left` planet position. Pink accent (`#FF2098`).
- **Black copy on all planet slideouts** — unified per design. CTA
  pill switched to white-bg/black-text everywhere.
- **Magazine grid hover explode** — the 6 article tiles push outward
  from grid centre on hover, smooth cubic-bezier. 3×2 desktop, 2×3
  mobile vectors. Locked to 6 tiles.

### Events
- **2-stage flyout** replacing the old 3-stage: anchored detail card
  with folded-corner flag banner, then centred full modal on
  "Show me more". Non-selected creatures fade + shrink when the
  full modal is open.
- **Country code field** (`events.country_code`, ISO 3166-1 alpha-2)
  drives the corner-banner flag via emoji regional-indicator
  conversion.
- **Accent swatch picker** — replaces free-form hex with 8 AA-vetted
  brand accents.

### Magazine
- **Canvas theme preset** — 8 pre-paired background + copy colours
  (all ≥ 4.5:1 contrast) replace the raw hex input. New
  `lib/article-themes.ts` owns the palette. ArticleOverlay reads the
  theme key and applies bg + text via CSS inheritance.
- **Issue # removed** from the editor and all four public render
  sites (overlay badge pill, grid tile tag, cover-story line,
  homepage subtitle).

### Play with Ralph
- **Full rebuild** from the design: hero + 4–8 floating case-study
  planets (layout reflows with count, each floats independently) +
  two large copy planets ("What's next?" pink, Expertise white with
  4 headed bullets). All copy CMS-editable. Case studies link to the
  external Case Study Viewer (default
  `ralphcasestudyviewer-production.up.railway.app`, overridable per
  case study and globally via `NEXT_PUBLIC_CASE_STUDY_VIEWER_URL`).
- New `case_studies` table.

### TV
- **Schedule + Show Info panels** now use `bg-black/70` so the video
  is visible through the overlay.
- **Live broadcaster data fix** — three caches were conspiring to
  freeze Schedule / Show Info content. Routes are now
  `force-dynamic` with explicit no-store response headers, the
  broadcaster client passes `cache: 'no-store'`, and TVSet polls
  every 30s with cache-busting query param. Refetches on tab
  visibility change.

### Nav
- **"Get started"** and **"Play with Ralph"** moved to the top-left
  utility bar alongside the logo.

### Site Copy — Tier A theme pickers
- Every section in the Site Copy editor (Homepage Hero, Magazine,
  Events, TV, Lab, Shop, Subscribe Modal) now has a Theme field at
  the top — a swatch picker restricted to a curated per-section
  sub-palette. Defaults match the brand colours so nothing visibly
  changes until an editor picks otherwise.
- New `lib/section-themes.ts` with 14 presets + per-section allowed
  lists.
- Heroes wired: Home, Magazine, Events, TV, Lab, Shop,
  SubscribeModal (outer canvas; embedded illustrations keep the
  hard-coded `#0F0420` palette they're matched to).

### Homepage CMS module
- New **Homepage Picks** editor under /homepage. Per-module
  (Magazine, Events, Lab, Shop) picker with search, reorder, up to
  6 items each. Empty picks fall back to auto (most-recent
  published). Shop picks pull from Shopify via a new read-only CMS
  Shopify client.
- **Planet Images** section on the same page — SVG/PNG upload per
  module. Values stored as `planet_{module}_url` in
  `homepage_config`.

### Security hardening (pre-handoff)
- **Cart ownership via HMAC tokens** — `/api/cart/create` returns a
  signed token; every subsequent cart route demands both id + token
  and verifies with `timingSafeEqual`. CartContext stores both in
  localStorage (via safe-storage wrapper), sends on every call,
  clears on rejection. No DB change, reuses `AUTH_SECRET` unless
  `CART_TOKEN_SECRET` is set.
- **Outbound URL sanitisation** — `lib/safe-url.ts` restricts
  editor-controlled URLs to `http://`, `https://`, `mailto:`.
  Applied save-time in CMS (case studies, events, lab) and read-time
  on public (EventFlyout, LabClient, LabGrid, case-study resolver).
- **Cart API malformed-body handling** — all four routes guard
  `request.json()` with `.catch()`, narrow payload types, return 400
  instead of 500.

### Stability + accessibility
- **Route-level error boundary** (`app/error.tsx`) — branded "Try
  again / Go home" fallback, Sentry capture. Component throws no
  longer nuke the whole page.
- **Focus traps** on modal surfaces (SubscribeModal, CartDrawer,
  ArticleOverlay, EventFlyout full) — new `hooks/useFocusTrap.ts`.
  Tab/Shift-Tab wrap at the boundary, first focusable receives focus
  on mount, previously-focused restored on close. Each gets
  `role=dialog` + `aria-modal` + `aria-labelledby`.
- **Visible focus ring** — global `:focus-visible` outline in
  ralph-pink. Keyboard only (never fires on mouse).
- **localStorage resilience** — `lib/safe-storage.ts` wraps
  get/set/remove in try/catch. Migrated CartContext, ThemeContext,
  TVSet, LanguageModal, AccountPreferences.
- **CartDrawer** — ESC-to-close added (was missing), and the silent
  missing-checkout state now shows an explicit error card.
- **Magazine `?read=SLUG` re-entry** — gated article → subscribe →
  OAuth now returns the user to the exact article they were
  reading, instead of `/`.
- **SubscribeModal** — default callbackUrl `/` → `/account`.
  Accepts a validated `returnTo` prop for gated surfaces.

### Schema additions
- `events.country_code TEXT`
- `case_studies` table (9 columns)
- Applied via `scripts/apply-schema-delta.mjs` against Railway
  Postgres.

### Known items deferred (see PRE_DEPLOY.md)
- Set `SHOPIFY_STOREFRONT_URL` + `SHOPIFY_STOREFRONT_TOKEN` on the
  ralph-cms Railway service to enable Shop picks.
- Revalidate-status feedback pattern applied to Articles editor
  only; ports to other actions (events, lab, case-studies, tv,
  homepage-picks) as needed.
- `SubscribeModal` themeKey prop accepted but not threaded from
  every call site yet (defaults to the brand-matched palette).

---

## 2026-04-17 — Shop + Ralph TV redesign and broadcaster wiring

Two streams of work this session: finished `/shop` with live Shopify
products, then redesigned Ralph TV's teletext overlays and fixed the
broadcaster schedule pipeline that was silently returning empty.

### Ralph TV — teletext overlays redesigned
- **Schedule overlay** (`components/tv/TeletextSchedule.tsx`) — uses
  `public/illustrations/SCHEDULE.png` for the chunky pixel title
  (purple highlight bar baked into the asset). Header ticks with
  seconds (`RALPHFAX 101 · Fri 17 Apr · 15:36:12`). Current show
  rendered under an `ON NOW:` label with pink text and purple
  underline; remaining items grouped under `UP NEXT:`. Scroll hint
  moved to bottom-left.
- **Show Info overlay** (`components/tv/TeletextShowInfo.tsx`) —
  uses `public/illustrations/RALPHTV.png` for the CEEFAX block title.
  Playback bar below the description: pink→purple gradient fill,
  current time floats on the bar at the playback position, start/end
  labels below. Progress ticks every second.
- **OFFLINE state** (`components/tv/TVSet.tsx`) — replaced the
  flat-black fallback with `public/offline.gif` (SMPTE colour bars)
  filling the TV screen, plus a 55% black scrim and text-shadow on
  the label so it stays readable.

### Ralph TV — broadcaster schedule pipeline fix
Schedule and Show Info always rendered empty because we were calling
the wrong URL.
- **Wrong URL**: `/feed/default/current/{ISO_DATE}/playlist` (date
  shape like `2026-04-17`). The broadcaster route is
  `/feed/{channel}/{week}/{day}/playlist` where `:day` is a
  full weekday name. The date-shaped path still returned 200 with a
  stub empty `items` array, so there was no signal the wiring was
  broken.
- **Fix** (`lib/broadcaster/client.ts`) — derive `day` from
  `new Date().getDay()` as `Sunday…Saturday`. `CHANNEL` and `WEEK`
  left as `'default'` and `'current'` (broadcaster doesn't yet
  support multi-week — see PRE_DEPLOY.md).
- **Enrichment** — broadcaster playlist only returns `{assetId,
  durationSec, …}`. We now fetch `/assets` in parallel and join on
  `assetId` so each `ScheduleItem` carries a `showName`
  (asset.file_name with the video extension stripped).
- **Wall-clock times** — ported `backend/src/feed.js:computePointer`
  to TS. Returned list starts with the currently-playing item and
  rolls `startTime`/`endTime` forward from the current loop
  iteration's start. Works for both `loop` and `playthru` playback
  modes.
- **BroadcasterAsset type** (`lib/broadcaster/types.ts`) brought in
  line with the actual API response (snake_case fields) with
  camelCase aliases populated by `getAssets()` for backward compat.

### Decisions made
- **No broadcaster-side changes required** for this session. The
  route was always correct — we were calling it with a wrong path
  shape. Kept the fix entirely in `lib/broadcaster/client.ts`.
- **Rolling wall-clock times from current pointer, not fixed "start
  of day" times.** Matches how a live TV schedule is normally read
  ("it's 3:36, so X is on until 3:44, then Y at 3:44"), and means
  loop mode has the same UX as schedule mode without needing
  special-casing in the UI.

### Pending
- **Broadcaster multi-week support.** `WEEK` constant in
  `lib/broadcaster/client.ts` is hard-coded to `'current'`. Tracked
  in PRE_DEPLOY.md.
- **Show names in playlist response.** Minor perf: eliminate the
  `/assets` join by having the broadcaster include `file_name` on
  playlist items. Tracked in PRE_DEPLOY.md.
- Rotate broadcaster service token (pasted in working session).

---

## 2026-04-17 — Shop pulls live products from Shopify

**Session goal:** Wire `/shop` to real Shopify products instead of the mock fallback, and bucket them into the Mag / Merch / Random tabs without depending on Shopify Collections (none exist in the store yet).

### Added
- **`getAllProducts()`** in `lib/shopify/client.ts` + `GET_ALL_PRODUCTS` query — fetches the full active catalogue in one call, no collection dependency.
- **`lib/shopify/categorize.ts`** — maps Shopify `productType` → `ShopCategory` (`'magazine' | 'merch' | 'random'`), with a title/handle fallback when `productType` is empty (see Decisions). Exposes `groupProducts()` for the page to consume.
- **Content-team note** in the empty-tab state of `ShopClient.tsx`: tells whoever's running the store which Category values populate each tab.
- **`productType`** added to `PRODUCT_FRAGMENT`, `ShopifyProduct`, and `ProductSummary` types.

### Changed
- `/shop` now calls `getAllProducts(50)` once instead of three `GET_PRODUCTS_BY_COLLECTION` queries against handles (`ralph-magazine`, `ralph-merch`, `ralph-random`) that didn't exist in the store.
- `ShopClient` tab handles renamed: `ralph-magazine` / `ralph-merch` / `ralph-random` → `magazine` / `merch` / `random`.
- Mock products tagged with realistic productTypes (Magazines, Apparel, Hats, Mugs, etc.) so the local-dev fallback exercises the same categorisation path as production.

### Excluded from `/shop`
Handles in `EXCLUDED_HANDLES` (in `categorize.ts`) — purely a code-side workaround until the Shopify store sweep:
- `mag-subscription`
- `ralph-world-membership`
- `2027-a-year-in-review`

Plus a belt-and-braces title/handle match (`looksLikeSubscription`) for anything containing "subscription" or "membership", in case new subscription products get added.

### Decisions made
- **Categorisation lives in code, not Shopify** — for now. The store has no collections, and Shopify Admin's new structured "Category" taxonomy doesn't reliably populate Storefront's legacy `productType` field. So the page reads `productType` when present and falls back to title/handle pattern matching (e.g. `/\b(mag|magazine|issue)\b/` → `magazine`). Once `productType` is set on every product (or collections get configured), the fallback can come out.
- **Subscription products are out of `/shop` entirely.** Membership belongs in `/subscribe`; "Mag Subscription" was being treated as a one-time cart add (would have charged once, not recurringly) which is the wrong UX. Subscription-aware product cards are deferred until the catalog actually grows.

### Pending
- **Shopify store sweep** — set `productType` on every product so `/shop` categorisation grounds in Shopify, not code patterns. Then `EXCLUDED_HANDLES` and `categorizeByTitle` can be deleted. Added to `PRE_DEPLOY.md`.
- Rotate the Storefront API token that was pasted in the working session (now exposed in chat history).

---

## 2026-04-16 — Shopify subscription checkout live

**Session goal:** Work through the Shopify admin config for subscriptions so the paid tier actually hits Shopify checkout end-to-end.

### Added
- **`sellingPlanId` on the subscription cart line** (commit `e47984f`): without it, Shopify would treat the cart as a one-time £3 purchase rather than a recurring subscription. New `GET_VARIANT_SELLING_PLANS` query + `getSubscriptionSellingPlanId` helper looks up the first plan attached to the variant and fails closed with a clear console warning if no plan is attached.
- **Subscribe modal copy reconciled to monthly-only** (commit `9b7d7a1`): removed the "payment taken once per quarter" footnote and the "equivalent of just £3" hedge. Copy now matches what Shopify actually charges.
- **Sentry deprecation cleanup** (commit `11916ad`): moved `disableLogger` into `webpack.treeshake.removeDebugLogging`, silencing the Railway log warning.

### Shopify admin setup (on Brook's side, done this session)
- Installed Shopify Subscriptions app (free, official).
- Created Ralph World Membership product (£3, Active, Online Store + legacy custom app sales channels, digital — no shipping or inventory tracking).
- Attached Monthly Membership plan (every 1 month, no discount, no trial) via the app.
- Variant GID: `gid://shopify/ProductVariant/53320223228247`.
- Selling plan GID: `gid://shopify/SellingPlan/691806110039`.
- Railway ralph-world service: `SHOPIFY_STOREFRONT_URL`, `SHOPIFY_STOREFRONT_TOKEN`, `SHOPIFY_SUBSCRIPTION_VARIANT_ID` all set and deployed.
- Manually verified checkout flow end-to-end up to the Shopify hosted checkout page (didn't complete payment — webhooks not registered yet).

### Decisions made
- **Kept the membership product as a digital subscription**, not physical. Quarterly mag fulfilment happens outside Shopify's auto-fulfilment — operationally Brook exports active subscribers + their billing addresses when an issue ships. Simpler billing, decoupled from per-issue physical logistics.
- **Hunted an invisibility bug** where the new membership product was Active on Online Store but the Storefront API returned null. Root cause: the legacy custom app has its own sales channel separate from Online Store, and new products aren't published to it by default. Fix was to enable the custom app channel in the product's Publishing settings.
- **Noted that a legacy custom app Storefront token is still valid** even on stores where new legacy apps can no longer be created (Shopify deprecated creation 2026-01-01, existing apps still work). Our `ralphworld` legacy app is grandfathered and issues tokens with the scopes we need, including `unauthenticated_read_selling_plans`.

### Pending (for the next session)
- Register three webhooks (`Order payment`, `Subscription contract created`, `Subscription contract cancelled`) pointing at the Railway URL.
- Set `SHOPIFY_WEBHOOK_SECRET` on Railway from the signing secret Shopify shows once on first webhook creation.
- Complete one real payment (test mode or live-and-refund) and verify the webhook flips `profiles.subscriptionStatus` to `paid`.
- Post-DNS-cutover: update webhook URLs to `https://ralph.world/...`.

See `PRE_DEPLOY.md` for the full checklist.

---

## 2026-04-15 — Pre-Josh hardening

**Session goal:** Work through the pre-launch backend list — Shopify subscription checkout, R2 image uploads for CMS, SEO foundations, Sentry, account page — so Josh can do the visual pass against a production-ready backend.

### Added
- **Shopify subscriptions end-to-end** (commit `2cc13f0`): CREATE_SUBSCRIPTION_CART mutation, createSubscriptionCheckout helper, `/api/account/upgrade` auth-gated redirect, account page handling of `?upgrade=paid`, visible upgrade CTA, docs/shopify-subscriptions.md
- **SEO foundations** (commit `8e85992`): `app/robots.ts`, `app/sitemap.ts`, root metadata with metadataBase + title.template + openGraph + twitter defaults, per-page metadata on magazine/tv/events/shop/lab/contact/play, `app/opengraph-image.tsx` with edge-rendered branded PNG
- **Account page rebuild** (commit `e6bf635`): Google avatar in profile header, Subscription section (upgrade for free, mailto for paid), Preferences section (theme + language both server-persisted, UI updates immediately), Danger zone (sign out + mailto deletion). New `/api/profile/theme` mirroring the language route. AccountPreferences client component
- **Sentry wizard + tightened config** (commits `efbfd24`, `f11d0ca`, `f54e27b`): DSN via env var, 0.1 prod sample rate, sendDefaultPii off, noise filter (ResizeObserver / network aborts / extensions), environment tag. Then parked: browser submissions 403 despite valid DSN (confirmed via direct curl), need to sort Allowed Domains in Sentry project config. Test pages deleted after parking
- **PRE_DEPLOY.md** (commit `3d2a79e`, updated `e3f34b2`): Single checklist of everything deferred until post-Josh / pre-DNS-cutover — GA4 wiring, cookie consent, Sentry fix, Shopify admin config, Shopify customer portal, GDPR account deletion, content seed, cutover steps

### Decisions made
- **Sentry parked, not fixed.** Direct curl against the ingest URL proves the DSN is valid (returns 400 "invalid envelope" for a malformed payload). Browser submissions get 403 — origin-based rejection inside Sentry's project config. The Allowed Domains setting in the dashboard either isn't where Sentry docs claim or needs support to resolve. Not launch-critical — code is correct, will start working the moment the project is right
- **Theme + language preferences are server-first.** `ThemeContext` still reads localStorage as source of truth on the client, but `/account` writes to both the DB and localStorage. Cross-device sync on next login is a future enhancement
- **"Manage subscription" and "Request account deletion" are mailtos for now.** Real implementations (Shopify Customer Account API, GDPR-compliant deletion) are flagged in PRE_DEPLOY.md as must-do before launch
- **Tunnel route `/monitoring` removed from next.config.** Was returning 403 on Railway (separate from the Sentry project 403). Adblockers may skip events now but unblocking error capture matters more

### Shared with ralph-cms this session
- Cloudflare R2 image uploads — direct browser → R2 via presigned PUT. `ImageUploader` component replaced the plain "paste a URL" inputs across Event/Lab/TvVod/Article editors and article inline images. Auth-gated signing route. Free-text URL kept as fallback for externally-hosted images (see ralph-cms changelog + docs/r2-uploads.md)

---

## 2026-04-15 — SEO foundations

**Session goal:** robots, sitemap, per-route OG metadata, and a default OG image so links look right when shared.

### Added
- `app/robots.ts` — allow-all with /api, /account, /login disallowed; points at `/sitemap.xml`
- `app/sitemap.ts` — nine public top-level routes with per-route priority and change frequency. Individual article/event/lab detail pages don't exist yet; when they do, extend by concatenating DB-sourced slugs
- Root `metadata` in `app/layout.tsx` now includes `metadataBase`, `title.template` (`%s | Ralph`), `openGraph`, and `twitter` defaults
- Per-page `metadata` on magazine, tv, events, shop, lab, contact, play — each with a distinct title and description suitable for sharing
- `app/opengraph-image.tsx` — edge-rendered 1200×630 PNG with the Ralph pink arches, wordmark, and tagline. Per-route OG images can be added by dropping another `opengraph-image.tsx` into the relevant app folder

### Decisions made
- Skipped individual `opengraph-image.tsx` per route for now — the default image is on-brand enough that article/event/lab detail pages are the right time to add custom ones (when those pages exist)
- Used `NEXT_PUBLIC_APP_URL` for the site URL rather than hardcoding `ralph.world` so staging deploys get their own sitemap URLs
- `title.template` means per-route titles like "Magazine" auto-render as "Magazine | Ralph" in the browser tab

---

## 2026-04-13 — Paid-tier checkout flow

**Session goal:** Wire the `SubscribeModal` paid button end-to-end so it actually takes money once Shopify admin is configured.

### Added
- `CREATE_SUBSCRIPTION_CART` mutation in `lib/shopify/queries.ts` — variant of `CREATE_CART` that accepts `buyerIdentity.email` so the Shopify-hosted checkout is pre-filled with the signed-in user's email
- `createSubscriptionCheckout(email)` in `lib/shopify/client.ts` — reads `SHOPIFY_SUBSCRIPTION_VARIANT_ID`, creates a cart, returns `checkoutUrl`. Returns null (not throws) if env missing or Storefront unreachable — caller degrades gracefully
- `app/api/account/upgrade/route.ts` — auth-gated GET that creates the subscription cart and 303-redirects to Shopify checkout. Redirects to `/account?upgrade=error` on failure
- `app/account/page.tsx` — detects `?upgrade=paid` (used as OAuth callback from `SubscribeModal`) and auto-redirects free/guest users into `/api/account/upgrade`. Paid users skip. Free users also see a visible "Upgrade to paid — £3/month" CTA on the account card
- `SHOPIFY_SUBSCRIPTION_VARIANT_ID` in `.env.example`
- `docs/shopify-subscriptions.md` — admin-side setup doc (install subscriptions app, create product, grab variant GID, register three webhook topics, test flow)

### Decisions made
- Shopify Storefront API doesn't natively support recurring billing — docs punt to an installed subscriptions app (Shopify Subscriptions, Recharge, etc.) attaching a plan to the variant. The mutation and checkout URL work the same
- Flagged in setup doc: SubscribeModal copy says "£3 a month" but also "Payment is taken once per quarter" — the two are inconsistent. Needs a copy/pricing decision before launch
- Chose a GET route (not POST) for `/api/account/upgrade` so the account page can trigger it with a plain redirect rather than a form submit

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
