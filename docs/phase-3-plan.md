# Phase 3 plan — content gating + email + magazine fulfillment

Drafted 2026-06-03 (during Phase 2 Stripe-setup). Source: SOW §Phase 3
(tasks 3.1–3.10) + architecture doc §4 (tier matrix), §11.5 (magazine
fulfillment), §12 (TV config), §14 (GDPR). This is the phase where the
3-tier machinery built in Phases 1–2 becomes user-visible across TV,
magazine, events, and email.

## What Phases 1 + 2 left ready

| Piece | Status | Used by |
|---|---|---|
| `canAccess(user, content)` + `tvPreviewSeconds()` pure fns | ✅ Task 1.5 | 3.1 TV gating, 3.2 article/lab gating |
| `tier` on session + AuthContext (`tier === 'paid'`) | ✅ Tasks 1.7 + 2.5 | every gating surface |
| `sendTemplate()` transactional email service | ✅ Task 1.4 | 3.4 RSVP email, 3.7 all templates |
| `email_events` idempotency ledger | ✅ Task 1.4 | 3.7 send dedupe |
| `event_rsvps` table (UNIQUE on event+user) | ✅ Task 1.1 | 3.4 RSVP |
| `email_subscriptions` table | ✅ Task 1.1 | 3.6 Mailchimp |
| `magazine_issues` + `magazine_shipments` tables | ✅ Task 1.1 | 3.8 + 3.9 fulfillment |
| Shopify Admin client (retry/backoff) + `findOrCreateCustomer` | ✅ Task 1.6 | 3.9 synthetic orders |
| Shopify `fulfillments/create` webhook handler | ✅ Task 2.6 | 3.9 status reconciliation |
| `logAction` / `logConsent` (DB-enforced append-only) | ✅ Tasks 1.8 + 1.2 | 3.10 audit/consent throughout |
| TV components (LivePlayer, SubscribeGate, TVStatic, useHls) | ✅ partial (pre-2.0) | 3.1 needs gating wired |

So Phase 3 is mostly "wire the gates + send the emails + ship the mags"
on top of foundations that already exist. The genuinely-new external
integration is Mailchimp (3.6).

## Task breakdown

### 3.1 TV native HLS player + tier gating — ralph-world
- TV components already exist (LivePlayer, SubscribeGate, TVStatic,
  useHls hook). **Work:** wire the gating. Signed-in users (free+) get
  unlimited playback; guests get a `tvPreviewSeconds()` countdown
  (default 600s from `homepage_config.tv_preview_seconds`). At expiry,
  swap player for TVStatic + dual-CTA modal ("Sign up free" primary,
  "Get magazine £3/mo" secondary).
- Pointed at `homepage_config.tv_relay_hls_url` per §12.
- **Effort:** ~half day (components exist, gating + countdown is the work).
- **Tests:** Playwright with mock HLS — guest countdown, signed-in unlimited.

### 3.2 Article + lab item access_tier gating — ralph-world
- Listing: render every item; lock-card overlay where `!canAccess`.
  LabGrid already has the lock overlay from Phase 2 — extend to articles,
  ensure it reads `canAccess(user, item)`.
- Detail view: unauthorized → title + lead image + first 2 paragraphs +
  upgrade wall (per §4, "assumed — confirm" with design).
- **Launch caveat:** all content ships as `everyone` at launch (§4 launch
  tactic), so walls don't fire for anyone until editorial moves content
  to `members`/`paid_subscribers`. Code path must exist + be tested.
- **Effort:** ~1 day (ArticleOverlay has no teaser/wall yet — that's new).
- **Tests:** unit per tier + Playwright (set article to members, guest
  sees locked card, free sees content).

### 3.3 Guest subscription banner on `everyone` articles — ralph-world
- `user === null` reading an `everyone` article → persistent bottom-of-
  viewport CTA banner, dismissable per session, reappears next visit.
  Links to /join-ralph.
- **Effort:** ~half day.
- **Tests:** Playwright guest vs free.

### 3.4 Event RSVP flow (free events) — ralph-world
- Greenfield (events RSVP UI doesn't exist yet). Authenticated user
  clicks RSVP → INSERT `event_rsvps` row → sends confirmation email via
  `sendTemplate`. Capacity enforced (`events.rsvp_capacity`), sold-out
  state shown. Concurrency-safe (two simultaneous RSVPs at capacity edge).
- **Effort:** ~1 day (UI + server action + capacity logic + email + the
  concurrency test).
- **Tests:** concurrency (2 RSVPs racing capacity), email render.

### 3.5 Eventbrite link-through for paid events — ralph-world
- Paid events link out (no on-site transaction). Paid subscribers see a
  discount code alongside the external link; free/guest see link only.
- **Effort:** ~half day (mostly render-per-tier).
- **Tests:** render test per tier.

### 3.6 Mailchimp newsletter integration — ralph-world *(external: Mailchimp API key)*
- Greenfield. `lib/mailchimp/client.ts` (retry/backoff like the Shopify
  Admin client). On signup with marketing opt-in → POST
  `/lists/{id}/members` + write `email_subscriptions` row + `consent_log`.
  Portal opt-out → PATCH to `unsubscribed`. Mailchimp `unsubscribe`
  webhook → reflect locally. Idempotent on email.
- **Blocker:** Mailchimp API key + list ID. Reuse existing `ralphandco`
  account, configure "Ralph Mag" audience (arch doc §3 decision 2).
- **Effort:** ~1 day (client + opt-in/out flows + webhook + tests).
- **Tests:** mock Mailchimp API, opt-in / opt-out flows.

### 3.7 Resend templates — all transactional emails — ralph-world
- Six new React Email templates in `components/emails/`: subscription
  receipt, subscription cancelled, payment failed, event RSVP
  confirmation, magazine shipped, password reset. Register each in
  `lib/email/send.ts` TEMPLATES + wire into triggers:
  - receipt + cancelled + payment_failed → Stripe webhook handlers
    (Task 2.3 left a hook for this — payment_failed currently logs only)
  - RSVP confirmation → 3.4
  - magazine shipped → 3.9 fulfillment webhook
  - password reset → needs a password-reset request flow (may be new
    surface; confirm scope — Task 1.3 shipped verification but not reset)
- **Effort:** ~1–1.5 days (6 templates + wiring + snapshot tests).
- **Tests:** render snapshot per template + trigger integration tests.

### 3.8 Magazine issue editor — **ralph-cms** *(work in ~/ralph-cms)*
- New `/issues` route mirroring the article editor. Issue list,
  create/edit (number, title, cover, `shopify_variant_id`, status,
  `postage_pence_cached`). "Ship to subscribers" action on a `published`
  issue → confirmation modal → triggers the 3.9 batch job. Shipment
  status view (queued / shopify_order_created / fulfilled / failed) with
  per-user retry.
- **Effort:** ~1.5 days (CMS editor + status view).
- **Cross-repo:** lives in ralph-cms; the "Ship" action calls into
  ralph-world's batch job (3.9) — needs a service-to-service trigger
  (shared secret or internal endpoint). **Design decision needed.**

### 3.9 Magazine fulfillment batch job — ralph-world
- Triggered by 3.8's "Ship to subscribers". Iterates `active` + `paid`
  subscribers, creates a synthetic Shopify order each (§11.5 shape:
  customer.id, variant_id from `magazine_issues.shopify_variant_id`,
  address from `profiles.shipping_address_cached`, financial_status=paid,
  send_receipt=false, tags=subscription,stripe-billed). Idempotent via
  `UNIQUE (user_id, issue_id)`. 15-min backoff retry. Status reconciles
  via the Task 2.6 `fulfillments/create` webhook (already built).
- **POSTAGE — open decision:** store rate on
  `magazine_issues.postage_pence_cached` (editorial sets), pass via
  `shipping_lines`. If Newsstand confirms "static" → final. If "dynamic
  per shipment" → refactor to call Newsstand at order time. Track in
  decisions-runtime.
- **Effort:** ~1.5 days (batch job + idempotency + retry + the §11.5
  order shape + tests).
- **Tests:** mocked Shopify, idempotency (run twice → one order),
  address validation.

### 3.10 Audit + consent throughout — ralph-world
- Sweep: ensure every state-changing action writes `audit_log` (role,
  sub tier, email change, deletion, shipment events) and every marketing
  opt-in/out + terms accept writes `consent_log`. Most already done in
  Phases 1–2; this is the gap-closing pass + verification.
- **Effort:** ~half day (audit + fill gaps).

## Recommended order

```
Independent / parallelisable first:
  3.7 Resend templates    — unblocks 3.4 (RSVP email) + closes the
                            payment_failed email TODO from Task 2.3
  3.1 TV gating           — self-contained, components exist
  3.2 Article/lab gating  — self-contained
  3.3 Guest banner        — small, depends on 3.2's article surface

Then:
  3.4 Event RSVP          — needs 3.7's RSVP template
  3.5 Eventbrite links    — small, independent
  3.6 Mailchimp           — needs Mailchimp API key (external)

Magazine fulfillment (the big cross-repo piece, do last):
  3.8 CMS issue editor    — ralph-cms
  3.9 Fulfillment job     — ralph-world; 3.8 triggers it
  (Task 2.6 fulfillments/create webhook already reconciles status)

Throughout:
  3.10 Audit/consent sweep — verify as each task lands
```

Magazine fulfillment (3.8 + 3.9) is gated on Phase 2 being live (need
real paid subscribers with addresses to ship to) + the Shopify Admin
token + the Newsstand postage decision. Everything else can proceed
without those.

## External blockers

- [ ] **Mailchimp API key + "Ralph Mag" audience/list ID** (3.6) — reuse
      ralphandco account per arch §3
- [ ] **Shopify Admin API token** (3.9) — same token Task 1.6 needs;
      shared blocker
- [ ] **Newsstand postage model confirmation** (3.9) — static vs dynamic;
      Brook coordinating with Newsstand
- [ ] **Stripe live + paid subscribers** (3.9 acceptance) — needs Phase 2
      live (Task 2.1) and at least one test paid subscriber

## Env vars to add

```
# Mailchimp (Phase 3.6)
MAILCHIMP_API_KEY=                  # …-usXX (datacenter suffix matters)
MAILCHIMP_SERVER_PREFIX=            # e.g. us21 (from the API key suffix)
MAILCHIMP_AUDIENCE_ID=              # the "Ralph Mag" list id
MAILCHIMP_WEBHOOK_SECRET=           # for unsubscribe webhook verification

# Magazine fulfillment trigger (Phase 3.8 → 3.9 cross-repo)
MAGAZINE_SHIP_TRIGGER_SECRET=       # shared secret CMS uses to call the batch job
```

## Open decisions to resolve before starting

1. **3.8↔3.9 cross-repo trigger mechanism.** How does ralph-cms's "Ship
   to subscribers" button invoke ralph-world's batch job? Options:
   (a) internal HTTP endpoint on ralph-world guarded by a shared secret;
   (b) a row in a shared `jobs` table that ralph-world polls;
   (c) the batch job lives in ralph-cms and writes synthetic orders
   directly (both services share the DB + could share the Shopify client).
   **Recommend (a)** — explicit, debuggable, no polling.
2. **Password reset scope (3.7).** Task 1.3 shipped email verification
   but not password reset. Does 3.7's "password reset" template imply
   building the full reset flow (request → email → token → new password),
   or just the template? **Likely the full flow — confirm + size.**
3. **Article teaser/wall UX (3.2).** Arch doc marks "title + lead image +
   first 2 paragraphs" as "assumed — confirm". Needs design input before
   building the detail-view wall.
4. **Guest banner copy + design (3.3)** — needs design.
5. **Newsstand postage (3.9)** — static vs dynamic, as above.

## Out of scope for Phase 3 (→ Phase 4)

- Substack subscriber migration (4.2)
- DSAR/erasure cascade runbook (4.1)
- Security review + soak test (4.3)
- Production cutover + DNS (4.4)
- Privacy policy update (4.6)

## Why this phase is bigger than Phase 2

Phase 2 was "consume foundations" — schema + idempotency + webhook
patterns all existed. Phase 3 adds genuinely new surfaces (Mailchimp
integration, 6 email templates, RSVP flow, the cross-repo magazine
fulfillment pipeline) AND spans both repos. Budget ~8–10 working days
of code vs Phase 2's ~3. The cross-repo magazine piece (3.8 + 3.9) is
the riskiest — it's the first time the two services actively coordinate
at runtime rather than just sharing a DB.
