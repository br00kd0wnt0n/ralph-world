# Shopify Subscriptions setup

This is the admin-side work Brook needs to do in Shopify once, so the paid-tier
button in `SubscribeModal` actually takes money. The app-side plumbing is
already wired up and will start working as soon as these steps are done.

## What the app expects

1. A single product variant that represents the **£3/month paid subscription**.
2. A Shopify-hosted checkout that collects card details and recurring billing
   consent.
3. Webhooks firing back to `/api/webhooks/shopify` so we can flip
   `profiles.subscriptionStatus` from `free` → `paid` when the first payment
   clears, and back to `free` when a subscription is cancelled.

## Shopify admin steps

### 1. Install a subscriptions app

Shopify does not support recurring billing natively via the Storefront API.
Pick one of:

- **Shopify Subscriptions** (free, by Shopify) — the default choice.
- **Recharge**, **Bold Subscriptions**, etc. — more features, more money.

Install from the Shopify App Store. Any of them will let you attach a
subscription plan (billing frequency + discount) to a normal product variant.

### 2. Create the subscription product

- **Product name:** Ralph World membership (or whatever Brook wants)
- **Price:** £3.00
- **Variant:** single variant is fine — we only need one variant ID.
- Attach a subscription plan: **every 1 month**, no trial, no discount.
  (Copy in `SubscribeModal` says "£3 a month" but billed quarterly — if that's
  still the intent, set the plan to **every 3 months at £9** and update the
  modal copy. Right now the storefront says one thing and the setup doc
  assumes another — pick one and make them match before launch.)

### 3. Grab the variant ID

In the Shopify admin, open the product → variants → copy the GID. It looks
like:

```
gid://shopify/ProductVariant/44123456789012
```

Set this as `SHOPIFY_SUBSCRIPTION_VARIANT_ID` in both local `.env.local` and
the Railway environment for the ralph-world service.

### 4. Register the webhooks

Shopify admin → Settings → Notifications → Webhooks. Add:

| Topic                   | URL                                            | Format |
| ----------------------- | ---------------------------------------------- | ------ |
| `orders/paid`           | `https://ralph.world/api/webhooks/shopify`     | JSON   |
| `subscriptions/create`  | `https://ralph.world/api/webhooks/shopify`     | JSON   |
| `subscriptions/cancelled` | `https://ralph.world/api/webhooks/shopify`   | JSON   |

The webhook handler uses `SHOPIFY_WEBHOOK_SECRET` (set in Railway) to verify
the HMAC header. Shopify shows the secret once when you create the first
webhook — copy it into Railway then.

Note: depending on which subscriptions app you install, the topic names may
vary (e.g. Recharge sends its own events). If that's the case, point the
Recharge webhook at the same endpoint and open an issue to extend
`app/api/webhooks/shopify/route.ts` to recognise those topics.

### 5. Test the flow

1. Sign into ralph.world with a Google account.
2. Open the subscribe modal → "Join for £3 per month".
3. Google OAuth completes, you land on `/account?upgrade=paid`.
4. Account page redirects to `/api/account/upgrade`.
5. That route creates a Shopify cart with your email pre-filled and redirects
   to the Shopify-hosted checkout.
6. Complete checkout with a test card (in Shopify's test mode).
7. `orders/paid` webhook fires → `profiles.subscriptionStatus` flips to
   `paid`. Refresh `/account` to confirm.

## Env checklist

```
SHOPIFY_STOREFRONT_URL=https://<store>.myshopify.com/api/2024-01/graphql.json
SHOPIFY_STOREFRONT_TOKEN=shpat_...
SHOPIFY_WEBHOOK_SECRET=<from Shopify admin>
SHOPIFY_SUBSCRIPTION_VARIANT_ID=gid://shopify/ProductVariant/...
```

All four must be set in **both** local `.env.local` and Railway before the
paid-tier button will work.

## Related files

- `lib/shopify/client.ts` — `createSubscriptionCheckout(email)`
- `lib/shopify/queries.ts` — `CREATE_SUBSCRIPTION_CART` mutation
- `app/api/account/upgrade/route.ts` — auth'd redirect into Shopify checkout
- `app/account/page.tsx` — handles `?upgrade=paid` and shows the upgrade CTA
- `app/api/webhooks/shopify/route.ts` — flips subscription status on payment
