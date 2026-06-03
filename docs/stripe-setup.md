# Stripe setup runbook — Task 2.1

The external prerequisite for Phase 2. Everything is dashboard work.
Aim: ~15-30 min start to finish. Once these env vars land in Railway,
the five code-side Phase 2 tasks (2.2-2.6) can be live-tested end to end.

## Prerequisites

- A Ralph-owned Google account (or whoever holds the company's
  business credentials) to register the Stripe account against. Stripe
  asks for: business legal name, address, VAT/tax number, bank account
  for payouts.
- Decision on Test mode vs Live mode timing. Walkthrough covers Test
  first — flip to Live just before public launch.

## Step 1 — Create the Stripe account

1. Go to https://dashboard.stripe.com/register
2. Sign up with the Ralph business email
3. Activate the account (Stripe will ask for business details + bank
   account). Test mode works without activation — you can build + test
   today and activate when ready to take real payments.
4. Top-left: confirm **Test mode** is on (toggle says "Test mode" with
   an orange indicator). Everything below happens in test mode first.

## Step 2 — Create the product + price

Products → **+ Add product**.

- **Name:** `Ralph Magazine Subscription`
- **Description:** `£3/month — quarterly print magazine + premium digital content`
- **Recurring:** Yes
- **Price:** `£3.00`
- **Billing period:** `Monthly`
- **Currency:** `GBP`
- Tax behaviour: `Inclusive` (UK VAT is included in the £3 — confirm with Nicola/accountant; this is the simplest pattern)
- Image: optional, the Ralph logo

Save. You'll get back:
- **Product ID** — `prod_…` (informational, not used in code)
- **Price ID** — `price_…` ← **THIS** is what goes in Railway

Copy the Price ID. Set aside.

## Step 3 — Get the API keys

Developers → **API keys** (in the left nav).

Two keys you need (Test mode):
- **Publishable key:** `pk_test_…` — used client-side (safe to ship in JS)
- **Secret key:** `sk_test_…` — server-side only. Click "Reveal test key"
  and copy. Stripe shows this once cleanly; rotate if you lose it.

Set aside.

## Step 4 — Enable the Customer Portal

Settings → Billing → **Customer portal**.

Defaults are sensible but confirm:
- **Allow customers to:**
  - ✅ Update payment method
  - ✅ View invoice history
  - ✅ Cancel subscriptions
  - ✅ Update billing details (name, email, address)
  - ❌ Switch plans (we only have one)
  - ❌ Update quantities (single-quantity subscription)
- **Cancellation:**
  - **Effective:** End of billing period (so they don't lose access mid-month after paying)
  - **Mode:** Cancel at period end (not immediately)
  - **Reason collection:** optional — turn on if you want feedback
- **Headline / business info:** "Ralph.World" with the support email
- **Privacy + Terms links:** point at `https://ralph.world/privacy` and `https://ralph.world/terms` (or wherever those live)

Save.

## Step 5 — Register the webhook endpoint

Developers → **Webhooks** → **+ Add endpoint**.

- **Endpoint URL:** `https://ralph-world-production.up.railway.app/api/webhooks/stripe`
  - (Update to `https://ralph.world/api/webhooks/stripe` after DNS cutover — captured in the DNS cutover checklist task)
- **Events to send** — click **+ Select events**, search for and tick:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`

Add endpoint. The newly-created endpoint will show a **Signing secret**
section — click **Reveal** and copy the `whsec_…` value.

Set aside.

## Step 6 — Set 4 env vars in Railway → ralph-world → Variables

| Var | Value |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` from Step 3 |
| `STRIPE_SECRET_KEY` | `sk_test_…` from Step 3 |
| `STRIPE_PRICE_ID` | `price_…` from Step 2 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from Step 5 |

Railway auto-redeploys. Wait ~30-60s.

## Step 7 — Smoke test the wiring

### 7a — confirm env vars propagated

```bash
curl -sI https://ralph-world-production.up.railway.app/api/health | head -3
```

Should still be 200. (No env-var-specific failure mode here, but
confirms the deploy is up.)

### 7b — test webhook signature verifier rejects unsigned requests

```bash
curl -sS -w "\n%{http_code}\n" -X POST \
  https://ralph-world-production.up.railway.app/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"fake":"event"}'
```

Expected: `401` and `signature rejected`. If you get `500 webhook not
configured`, `STRIPE_WEBHOOK_SECRET` didn't propagate — redeploy. If
you get `200`, the verifier is broken (which would be a bug).

### 7c — test Checkout session creation

In a private browser window, sign in to ralph.world, go to /account,
click **Upgrade to paid — £3/month**. Expected:

1. Browser redirects to a `https://checkout.stripe.com/...` URL
2. Stripe Checkout page renders with:
   - "Ralph Magazine Subscription"
   - £3.00 / month
   - GB shipping address required
3. Use a Stripe test card: `4242 4242 4242 4242`, any future expiry,
   any CVC, any UK postcode (e.g. `SW1A 1AA`).
4. Complete checkout. You should land on `/account?subscribed=1`.

### 7d — verify the webhook fired

In Stripe Dashboard → Developers → Webhooks → click your endpoint →
**Webhook attempts** tab. You should see (within ~30s of completing
checkout):

- `checkout.session.completed` — Response 200
- `customer.subscription.created` (we don't subscribe to this so it'll
  show as 200/ignored if Stripe sends it anyway, or skipped if our
  filter excludes it)
- `customer.subscription.updated` — Response 200
- `invoice.paid` — Response 200

In ralph.world `/account`, the Subscription panel should now show:
- Tier: `paid` (pink badge)
- Next billing date (one month from today, formatted nicely)
- "Manage subscription" button (replaces "Upgrade")

In Postgres (via psql with the ralph_world DSN or via Drizzle Studio):

```sql
SELECT
  tier, subscription_status, stripe_customer_id,
  stripe_subscription_id, subscription_current_period_end,
  shipping_address_cached
FROM profiles
WHERE id = '<your-user-id>';
```

Expected: tier='paid', subscription_status='active',
stripe_customer_id='cus_…', stripe_subscription_id='sub_…',
period_end ≈ now + 30 days, shipping_address_cached has the GB
address you entered.

Also check `audit_log` for `sub_status_changed` rows and
`stripe_events` for the corresponding `received`/`processed` records.

### 7e — test the Customer Portal

On `/account` (still signed in as the user who just subscribed), click
**Manage subscription**. Should redirect to a Stripe-hosted
`https://billing.stripe.com/p/session/…` page where you can cancel.

Test cancellation:
1. Cancel the subscription via the portal (cancel at period end is
   default — fine for the test)
2. Return to `/account` — you'll still see paid until the period ends
   (cancel-at-period-end), OR if you chose immediate cancel, the
   webhook will fire `customer.subscription.deleted` and your tier
   drops to `free` within a few seconds

## Step 8 — Local dev with Stripe CLI (optional but recommended)

For iterating on webhook handler changes without redeploying to Railway:

```bash
brew install stripe/stripe-cli/stripe
stripe login                                 # one-time browser flow
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

That prints a `whsec_…` for local — paste it into `.env.local` as
`STRIPE_WEBHOOK_SECRET` (overrides the Railway value for local dev).

Then in another terminal:

```bash
# Triggers a fake checkout.session.completed event
stripe trigger checkout.session.completed
```

Our handler runs; you can iterate.

## Step 9 — Go-Live checklist (when ready for real payments)

Don't do this until launch is imminent.

1. Stripe Dashboard top-left: switch from Test → Live mode
2. Repeat Steps 2-5 in Live mode: create the product + price, get
   live API keys (`pk_live_…`, `sk_live_…`), configure Customer
   Portal in live mode, register a webhook endpoint in live mode (get
   a new `whsec_…` — DIFFERENT from test mode's secret)
3. Update the same 4 Railway env vars with the live values
4. Run a real £3 payment with a real card, refund within a minute via
   the Stripe Dashboard

Test mode + live mode are fully independent — separate products,
prices, webhooks, keys. Stripe doesn't share anything between them.

## Troubleshooting

**Checkout returns "No such price"** → `STRIPE_PRICE_ID` env var is wrong, OR you're using a live key with a test price (or vice versa). Confirm both keys + price ID come from the same mode.

**Webhook signature failures in logs** → `STRIPE_WEBHOOK_SECRET` is from a different endpoint than the one actually delivering. Re-copy from the right endpoint's signing-secret section.

**Subscription doesn't appear on /account after checkout** → check Stripe Dashboard webhook attempts. If 500s are coming back, the handler errored — check Railway logs for the actual stack. If 200s are returning but tier didn't update, run the SQL query above + check `stripe_events.processing_status` for the event id.

**"Customer Portal not configured" when clicking Manage** → Step 4 wasn't completed. Customer Portal must be enabled in the Stripe dashboard for the same mode (test vs live) you're using.

## Related docs

- `docs/phase-2-plan.md` — the full Phase 2 task breakdown
- `docs/email-templates.md` — Resend pattern, similar shape to Stripe
- Architecture doc §9 (Payment integration) — the decisions behind this setup
