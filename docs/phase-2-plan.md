# Phase 2 plan — Stripe subscriptions

Drafted 2026-06-03 as Phase 1 wrapped. Source: SOW §Phase 2 +
architecture doc §9 (Payment integration). Six tasks (2.1 → 2.6),
spread across pure code, external Stripe setup, and UI on `/account`.

## Where we start from

Phase 1 left these pieces ready to consume:

| Piece | Status | Why it matters for Phase 2 |
|---|---|---|
| `stripe_events` table (idempotency_key UNIQUE on `stripe_event_id`) | ✅ live in prod DB | Webhook intake (2.3) writes here; replays are no-ops |
| `profiles.tier`, `.stripe_customer_id`, `.stripe_subscription_id`, `.subscription_current_period_end` | ✅ columns exist + backfilled | Webhook handlers mutate these (2.3) |
| `profiles.shipping_address_cached` (jsonb) | ✅ | `checkout.session.completed` writes here, then syncs to Shopify (2.4) |
| `lib/shopify/admin-client.ts` (retry-with-backoff) + `findOrCreateCustomer` | ✅ shipped | 2.4 PUT-to-Shopify-customer goes through this — already retry-safe |
| `lib/audit.ts` `logAction` | ✅ + DB-enforced append-only | Every subscription state change writes audit row |
| `audit_log` / `consent_log` append-only grants | ✅ live | Tamper-evidence already enforced via DB role |
| `/account` page rendering tier + Subscription section | ✅ shipped Task 1.7 | 2.5 swaps the placeholder buttons for real Stripe flows |
| `lib/email/send.ts` (sendTemplate) | ✅ shipped | Subscription emails (receipt, payment failed) ride this — but templates land in Phase 3 §3.7 |

## Task breakdown (from SOW §Phase 2)

### 2.1 Stripe product + price setup
- **What:** Create one Stripe product "Ralph Magazine Subscription" with one £3 GBP/month recurring price. Both Test and Live modes.
- **Where:** Stripe dashboard, not code.
- **Code touchpoint:** `STRIPE_PRICE_ID` env var, doc the IDs in `docs/stripe-setup.md`.
- **Blocker:** Brook needs a Stripe account first.
- **Effort:** ~15 min in Stripe dashboard.

### 2.2 Stripe Checkout session creation
- **What:** `POST /api/checkout/subscribe` (auth required). Creates a Stripe Checkout Session per arch doc §9:
  - `mode: 'subscription'`
  - `line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }]`
  - `shipping_address_collection: { allowed_countries: ['GB'] }`
  - `customer`: existing `profiles.stripe_customer_id` if set, else omit (Stripe will create one and we capture it from the webhook)
  - `customer_email`: from session if no customer yet
  - `success_url`: `${appUrl}/account?subscribed=1`
  - `cancel_url`: `${appUrl}/account`
  - `metadata.user_id`: our Ralph.world userId (so the webhook can map back even before stripe_customer_id is on profile)
- **Returns:** `{ url }` — client redirects.
- **Tests:** Unit test the session-builder (mock stripe SDK), assert the input shape.
- **Effort:** ~half day including tests.

### 2.3 Stripe webhook handler
- **What:** `POST /api/webhooks/stripe`. Verifies signature, idempotent via `stripe_events.stripe_event_id` UNIQUE.
- **Events handled** (per arch doc §9):
  - `checkout.session.completed` → set `tier='paid'`, `subscription_status='active'`, write `stripe_customer_id` + `stripe_subscription_id`, write `shipping_address_cached`. Audit row.
  - `customer.subscription.updated` → mirror status / period end to profile. Audit.
  - `customer.subscription.deleted` → set `tier='free'`, `subscription_status='canceled'`. Audit.
  - `invoice.payment_failed` → set `subscription_status='past_due'`, fire "payment failed" email (Phase 3 §3.7 lands the template; Phase 2 just calls `sendTemplate` and accepts the missing-template error for now, OR sends a plaintext fallback).
  - `invoice.paid` → update `current_period_end`. Audit.
- **Idempotency:** INSERT into `stripe_events` first (carrying `stripe_event_id`). On 23505 unique violation → already processed → 200 OK no-op. Same pattern as `email_events.idempotency_key`.
- **Failure:** Non-23505 DB error → 500 so Stripe retries.
- **Tests:** Unit-test each event handler against canned payloads (Stripe fixtures). Integration test via Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` + `stripe trigger checkout.session.completed`.
- **Effort:** ~1 day including all 5 handlers + tests.

### 2.4 Shipping address sync to Shopify customer
- **What:** Inside the `checkout.session.completed` handler from 2.3, after we've written `shipping_address_cached`, PUT the address to the linked Shopify customer.
- **How:** `lib/shopify/customer.ts` already exports `findOrCreateCustomer`. Add `updateCustomerAddress({ shopifyCustomerId, address })` → wraps `PUT /admin/api/.../customers/{id}.json` with `default_address` body. Retries via the existing `shopifyAdminFetch` backoff.
- **Tests:** Mock the Shopify Admin API; assert PUT body shape; assert the call flows from the webhook handler.
- **Effort:** ~half day.

### 2.5 Member portal — subscription management
- **What:** Wire the placeholder buttons on `/account` to real Stripe flows.
- **Free user:** "Subscribe £3/mo" → POST to `/api/checkout/subscribe` (Task 2.2) → redirect to returned `url`.
- **Paid user:** "Manage subscription" → POST to `/api/account/portal` → creates a Stripe Customer Portal session, redirects to its `url`. Portal handles cancel / update card / view invoices.
- **Subscription panel display:** Stripe-fetched data — current_period_end, payment method last4, status. Either fetch server-side on /account load (single Stripe API call) or via a small `/api/account/subscription` endpoint.
- **Tests:** Playwright end-to-end against Stripe test mode — sign in → subscribe → see paid tier → manage → cancel → see free tier within a polling window.
- **Effort:** ~1 day, mostly Playwright + iterating on the panel UI.

### 2.6 Shopify webhook handler (customer.update + fulfillments)
- **What:** `POST /api/webhooks/shopify` handles:
  - `customers/update` → update `shipping_address_cached` on linked profile (matched via `shopify_links.shopify_customer_id`)
  - `fulfillments/create` for magazine SKU → flip `magazine_shipments.status='fulfilled'` (idempotent on `shopify_order_id`). Stays dormant until Phase 3 ships magazine fulfillment but the wiring lands here.
- **Signature:** Shopify HMAC verification — pattern matches what we did for Resend.
- **Tests:** Mock webhook POSTs, assert profile update + ledger update.
- **Effort:** ~half day. Can be built in parallel with 2.2/2.3 (independent surface).

## Recommended order of operations

```
Day 0 (Brook external setup, blocks code work below):
  2.1 — Stripe account + product + price + webhook endpoint setup
        (~15 min in Stripe dashboard once account exists)

Day 1 — Foundation (parallelisable):
  2.3 — Webhook handler + 5 event processors (1 day)
  2.6 — Shopify webhook handler (half day) — fully independent

Day 2 — Checkout + sync:
  2.2 — Checkout session creation (half day)
  2.4 — Shipping address sync to Shopify (half day)
        (depends on 2.3 being merged so the call site exists)

Day 3 — Portal + E2E:
  2.5 — /account UI swap, Customer Portal redirect, Playwright E2E (1 day)
```

Total: ~3 working days of code + ~half a day of Stripe dashboard work +
~half a day of buffer for fiddling with Stripe test mode quirks.

## External blockers (in Brook's hands)

- [ ] **Stripe account** — create or grab credentials for an existing
      Ralph-owned account. Probably a fresh one since this is a new
      payment path (Shopify Subscriptions is being replaced).
- [ ] **Stripe Customer Portal config** — Stripe Dashboard → Settings →
      Billing → Customer Portal → enable Cancel + Update payment +
      Invoices. Done in dashboard.
- [ ] **Stripe webhook endpoint** — Dashboard → Developers → Webhooks
      → Add endpoint:
      - URL: `https://ralph-world-production.up.railway.app/api/webhooks/stripe`
      - Events: the 5 listed under 2.3
      - Copy the `whsec_…` signing secret
- [ ] **Stripe CLI** for local webhook testing — `brew install stripe`
      then `stripe login` once. Lets us run
      `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
      during dev. Not blocking for shipping, just nice-to-have.

## Env vars to add (Railway → ralph-world)

```
# Stripe (Phase 2)
STRIPE_PUBLISHABLE_KEY=             # pk_test_… (or pk_live_…)
STRIPE_SECRET_KEY=                  # sk_test_… (or sk_live_…)
STRIPE_PRICE_ID=                    # price_… — the £3/mo subscription
STRIPE_WEBHOOK_SECRET=              # whsec_… — Webhook endpoint signing secret
```

Pattern matches Resend: test vs live keys are swapped at the env-var
level, no app code change needed when going live.

## Dependency on Phase 1 items still pending verification

- **Resend domain `send.ralph.world` verified** — Phase 2's
  `invoice.payment_failed` handler wants to send an email. If the
  template isn't ready (Phase 3 §3.7), we either accept the failure
  or send a minimal inline template (recommended: minimal template
  shipped in 2.3 alongside the webhook handler, replaced by the proper
  React Email template in Phase 3).
- **Google OAuth consent screen branding** — purely cosmetic, doesn't
  block Phase 2.

## Why this is a clean phase

- Schema is already in place (Phase 1 Task 1.1 covered it).
- Idempotency pattern is already proven (`email_events.idempotency_key`
  in Phase 1.4 maps 1:1 to `stripe_events.stripe_event_id` for 2.3).
- HMAC webhook verifier pattern is already proven
  (`lib/email/verifyResendSignature.ts` is the template for
  `lib/stripe/verifySignature.ts`).
- Audit + consent log pattern is already proven and DB-enforced.
- The `/account` page renders the tier and has placeholder buttons
  already — we just wire them up.

So Phase 2 is more "consume the foundations" than "build new
foundations." Lower risk than Phase 1.

## Decisions to make before starting

1. **One Stripe product line or several?** Arch doc says one. Confirm.
2. **Trial period?** Arch doc says no annual term, no trial. Confirm.
3. **Promotion codes?** Arch doc doesn't mention. Default = off in
   Checkout, can flip later via `allow_promotion_codes: true`.
4. **Multi-currency?** Deferred per arch doc §3 — GBP only at v1.
5. **Existing < 10 Shopify subscribers migration** (arch doc §9.5):
   they get notified and manually migrated. Probably Phase 4 work,
   not Phase 2. Confirm.

## Out of scope for Phase 2

- Magazine fulfillment (synthetic Shopify orders triggered by subscription) — that's Phase 3.
- Transactional email templates beyond what 2.3 needs minimally — Phase 3 §3.7.
- Mailchimp opt-in flow — Phase 3 §3.6.
- Cancellation reasons / surveys — defer.
- Failed-payment retry strategy beyond "Stripe handles it" (Stripe Smart Retries are on by default).
