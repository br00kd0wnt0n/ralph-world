# Ralph.world subscription & magazine fulfilment — how it works

Internal one-pager. Top-level enough for non-engineers; assumes ralph.world
is live on production.

## The loop in one paragraph

A user signs up free on ralph.world. They can upgrade to **£3/month** via
Stripe Checkout; when they pay, Stripe tells us via webhook and we flip their
account to **paid**. Billing renews monthly. The magazine ships quarterly:
when a new issue is ready, an admin clicks "Fulfil Issue N" in the CMS, which
loops through every paid subscriber and creates a free Shopify order against
the issue's variant SKU. Newsstand picks up the Shopify order, prints + posts
the magazine, and a confirmation email goes to the subscriber. Every step
writes an audit trail and every external service signs its webhooks.

## Subscription flow (the user's journey)

1. **Sign up** at ralph.world — email/password or Google. Lands as **free** tier.
2. **Verify email** (Resend transactional). Login is blocked until verified.
3. **"Upgrade £3/month"** opens Stripe Checkout (Stripe-hosted page, PCI
   scope stays with Stripe).
4. **Customer pays.** Stripe handles VAT (inclusive in the £3).
5. **Stripe → us via webhook** `checkout.session.completed`:
   - `profiles.tier = 'paid'`
   - Stripe customer + subscription ids cached on the profile
   - Shipping address synced from Stripe onto the profile AND pushed to the
     linked Shopify customer's default address
6. **Welcome email** fires via Resend.
7. **Monthly renewal:** Stripe auto-charges. `invoice.paid` webhook bumps the
   subscription period end. On `invoice.payment_failed`, we flag the profile
   (`past_due`) and the user sees it in `/account`; Stripe retries the card.
8. **Manage / cancel:** the `/account` page has a "Manage subscription" button
   that opens the Stripe Customer Portal (Stripe-hosted — payment method,
   address, cancellation). Cancellations run to the end of the paid period.

## Fulfilment flow (per issue, quarterly)

1. **Editor creates a `magazine_issues` row** in the CMS — issue number, title,
   **Shopify variant SKU** (links to the printed product), postage rate.
   Starts `draft`.
2. **Editor publishes** (`status='published'`).
3. **Admin opens the issue** in CMS → "Fulfilment" panel. (Admin-only — real
   money action.)
4. **"Dry run"** first — counts eligible paid subscribers without doing
   anything. Confirms the population.
5. **"Fulfil Issue N"** triggers a server-to-server call from CMS to
   ralph-world (token-authenticated, rate-limited, **locked per-issue** so it
   can't double-fire). The batch job:
   - Selects paid subscribers with a linked Shopify customer
   - Skips anyone already shipped this issue (UNIQUE `(user, issue)` index)
   - For each remaining subscriber: INSERTs a `magazine_shipments` row
     (`queued`) → POSTs Shopify Admin `/orders.json` (price £0, customer
     bound, line item = issue variant) → flips row to `shopify_order_created`
   - Audit log written at start + summary at end (with admin's user id)
6. **Newsstand picks up the Shopify orders, prints the magazines, and
   posts them** to subscribers.
7. **Newsstand marks each order "fulfilled" in Shopify** — this is the
   action that tells everyone downstream "it's gone." Whether Newsstand
   does this at label-print, at parcel handover, or in an end-of-day batch
   determines how close the email timing is to the physical dispatch.
8. **Shopify → us via webhook** `fulfillments/create` (fired by step 7):
   HMAC verified, the shipment row flips to `fulfilled` (with `shipped_at`
   = the time the webhook arrived), and the "your magazine is on its way"
   Resend email fires to the subscriber.

> **Important:** the customer email is **triggered by Shopify**, not by
> Newsstand directly. In normal operation Newsstand updates Shopify at
> dispatch and the two are simultaneous. If Newsstand ever batches
> fulfillment updates (e.g. end-of-day instead of at hand-over), the email
> will lag the actual dispatch by the same amount. Worth checking with
> Newsstand when they typically mark orders fulfilled so the message tone
> ("on its way") stays accurate.

## Data model at a glance

| Table | Holds | Filled by |
|---|---|---|
| `users`, `sessions`, `accounts` | auth identity | Auth.js |
| `profiles` | tier, Stripe ids, shipping address, marketing opt-in | webhook-driven cache |
| `shopify_links` | user ↔ Shopify customer id | created at signup |
| `magazine_issues` | one row per issue (SKU, postage, status) | CMS editor |
| `magazine_shipments` | one row per (subscriber, issue) — the per-issue ledger | fulfilment job + Shopify webhook |
| `magazine_fulfilment_runs` | per-issue lock for the batch job | the batch job itself |
| `audit_log` *(append-only)* | who did what (role changes, fulfilment runs, account erasure) | every sensitive action |
| `consent_log` *(append-only)* | GDPR consents (terms, privacy, marketing, cookies) | signup + member portal |

## User comms touch points

All transactional emails go through **Resend**. Marketing newsletter is
separate — **Mailchimp**, opt-in only (signup checkbox or `/account` toggle).
Silent if not chosen.

- **Signup:** email verification.
- **Password reset:** one-time reset link.
- **Subscription started:** welcome / receipt.
- **Monthly renewal:** Stripe sends the receipt — we don't double up.
- **Payment failed:** notice; current state surfaced in `/account`.
- **Magazine shipped:** "Issue N is on its way" — one per (subscriber, issue).
  **Triggered by Shopify's `fulfillments/create` webhook**, which fires when
  Newsstand marks the order fulfilled in Shopify (typically at dispatch).
  So this email follows Newsstand-→-Shopify update timing, not the
  physical parcel handover directly.
- **Event RSVP:** confirmation with date + location.
- **Cookie / privacy choices:** logged silently to `consent_log` (the binding
  legal record); no email.

## Money flow

- Subscriber pays **£3/month to Stripe** (VAT inclusive).
- Stripe takes its processing fee and settles to Ralph's bank.
- Shopify orders are recorded at **£0** — they exist only to route fulfilment
  to Newsstand. No second customer charge.
- Ralph pays **Newsstand** for printing + postage. The per-issue postage rate
  is stored on the `magazine_issues` row for accounting reference.

## Guardrails worth knowing

- Every webhook (Stripe, Shopify, Resend) is **signature-verified** server-
  side and **replay-idempotent** (we record event ids and skip duplicates).
- The fulfilment job **can't double-ship**: UNIQUE `(user_id, issue_id)` on
  shipments plus a per-issue run-lock (and the dry-run lets you preview the
  population before any orders are created).
- Real Shopify orders are **admin-only** and logged against the admin's user id
  — "who fulfilled Issue 4?" is answerable from `audit_log`.
- **Paid article bodies are gated server-side.** The API never sends a paid
  article's full content to a non-subscriber — guests get a ~200-word
  preview + a sign-up CTA. (Cover and grid only ever load summary fields.)
- The runtime app **cannot tamper with audit_log or consent_log** — the DB
  role has INSERT but not UPDATE/DELETE on those tables.
- The runtime app **cannot promote a user to admin** — the DB role's UPDATE
  grant on `profiles` deliberately excludes the `role` column.
- Subscriber data is exportable on request (`/account` → "Download my data")
  and deletable on request (`/account` → "Delete my account") — GDPR
  Articles 15 + 17 covered end-to-end.

---

Maintained by engineering. Questions or "what about X?" — drop them on Slack
and we'll fold the answer back into this doc.
