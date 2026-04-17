# Pre-deploy checklist (Ralph.World v2)

Things to sort **after Josh finishes his visual/animation pass** and **before DNS
cuts over to the Railway deploy**. Deferred until then because each item
interacts with real URLs, final visual design, or live analytics.

## Tracking

- [ ] **Google Analytics (GA4)** — get Measurement ID from existing
      ralph.world property (Admin → Data Streams), wire via
      `@next/third-parties/google` in `app/layout.tsx`. Property and
      historical data persist automatically — only the tag needs re-embedding.
- [ ] **Cookie consent banner** — UK/EU law requires consent before
      GA cookies drop. Needs design from Josh. Wire GA behind a
      consent check so it only initialises after user opts in.

## Sentry (parked from 2026-04-15 session)

- [ ] **Fix Sentry Allowed Domains / origin rejection.** DSN is valid
      (confirmed via direct curl), but browser submissions 403 from
      the project. Either hunt the right setting in Project Settings →
      Security & Privacy → Allowed Domains, or delete and recreate the
      project. Config in the codebase is already correct.
- [ ] Set `SENTRY_AUTH_TOKEN` in Railway for source-map upload at build
      time. Rotate the token that was shared in chat first.
- [ ] Run the Sentry wizard in ralph-cms (pending a clean project) —
      `npx @sentry/wizard@latest -i nextjs --saas --org ralph-ck --project ralph-cms`
      (create the second project first).

## Shopify subscriptions

Admin config partly done 2026-04-16.

- [x] Install Shopify Subscriptions app, create Ralph World Membership
      product (£3, Active, Online Store + custom app sales channels),
      attach Monthly Membership plan (1 month, no discount, no trial).
      Variant: `gid://shopify/ProductVariant/53320223228247`. Selling
      plan: `gid://shopify/SellingPlan/691806110039`.
- [x] Set `SHOPIFY_STOREFRONT_URL`, `SHOPIFY_STOREFRONT_TOKEN`,
      `SHOPIFY_SUBSCRIPTION_VARIANT_ID` on Railway.
- [x] Reconcile SubscribeModal copy to monthly-only (commit `9b7d7a1`).
- [x] Checkout flow tested — customer hits the modal → OAuth → Shopify
      checkout renders "£3.00 every month". Payment itself not yet
      completed end-to-end.
- [ ] Register `Order payment` webhook pointing at
      `https://ralph-world-production.up.railway.app/api/webhooks/shopify`.
      **Update URL to `https://ralph.world/api/webhooks/shopify` after
      DNS cutover** or Shopify will keep firing at the Railway domain.
      (Subscription-specific topics like `subscription_contracts/cancel`
      aren't exposed in the standard admin webhook dropdown — they
      require programmatic Admin API registration. Flagged as a
      post-MVP task below.)
- [ ] Copy the webhook signing secret (shown once on first webhook
      create) into Railway as `SHOPIFY_WEBHOOK_SECRET`.
- [ ] Complete one real payment (test mode via Shopify Payments, or
      live £3 refunded within a minute) and confirm:
      - Webhook reaches `/api/webhooks/shopify` (check Railway logs)
      - `profiles.subscriptionStatus` flips to `paid`
      - `/account` tier badge updates from free → paid on refresh

## Subscription lifecycle (post-MVP)

- [ ] **Cancellation handling.** `orders/paid` keeps flipping to `paid`
      on renewal, but nothing fires when a customer cancels their
      Shopify subscription contract. Right now: cancelled customers
      keep `paid` access forever. Two options when we get to this:
      (a) register `subscription_contracts/cancel` via the Admin API
      (`POST /admin/api/2024-01/webhooks.json` with topic
      `subscription_contracts/cancel`) — the topic isn't in the admin
      UI dropdown but the API accepts it; or (b) run a daily cron job
      that diffs our `paid` users against Shopify's active contract
      list and flips the delta to `free`. (a) is lower-latency; (b) is
      simpler and more robust to missed webhooks. Pick one closer to
      launch.

## Account management

- [ ] **Shopify customer portal** — paid users currently get a mailto
      when they click "Manage subscription" on /account. Replace with a
      proper flow against Shopify's Customer Account API so they can
      update card, change address, cancel self-serve. See
      `app/account/page.tsx` — the paid-tier branch of the Subscription
      section is where this slots in.
- [ ] **GDPR-compliant account deletion** — "Request account deletion"
      on /account is currently a mailto. Real implementation needs:
      delete from `profiles`, `accounts`, `sessions`; scrub/anonymise
      the Shopify customer record; handle any webhook-delivered orders
      that arrive post-deletion. This is a meaningful piece of work —
      don't underestimate. See `app/account/page.tsx` danger zone.

## Content + data

- [ ] Seed real homepage copy via the CMS (site_copy table)
- [ ] Seed real articles, events, lab items
- [ ] Upload real illustrations / placeholders that Josh signed off
- [ ] **Shopify store sweep** — set `productType` on every product (the
      legacy free-text field, separate from the new "Category" taxonomy
      in Shopify Admin) so `/shop` categorisation runs off Shopify data
      instead of code patterns. Once done, delete `EXCLUDED_HANDLES`
      and `categorizeByTitle()` from `lib/shopify/categorize.ts`.
      Decide whether subscription products (Ralph World membership, Mag
      Subscription) belong in the catalog at all, or only in `/subscribe`.
- [ ] **Rotate Storefront API token** — the one created 2026-04-16 was
      pasted into a working session and should be considered exposed.
      Generate a new one in the legacy `ralphworld` custom app and
      update `SHOPIFY_STOREFRONT_TOKEN` on Railway.
- [ ] **Rotate Broadcaster service token** — the one in Railway was
      pasted into a working session 2026-04-17 while debugging the
      schedule pipeline. Generate a new one in the broadcaster admin
      and update `BROADCASTER_SERVICE_TOKEN` on Railway.

## Visual canvas rebuild (parked)

- [ ] **Rebuild the visual canvas as a bundled, lazy-loaded R3F scene
      inside ralph-world** (currently iframed from the separate
      `visual-canvas-lab` Railway service via the RALPH WORLD theme).
      Full scope, phases, perf budget, and acceptance criteria in
      [`docs/visual-canvas-rebuild.md`](docs/visual-canvas-rebuild.md).
      Blocked on Brook capturing the LANDING reference pack
      (screenshots + MP4 + preset JSON) — Phase 0 in the doc.

## Ralph TV

- [ ] **Verify Fullscreen button goes to actual fullscreen.** The
      handler in `components/tv/TVSet.tsx:handleFullscreen` calls
      `el.requestFullscreen()` on the TV container div. Needs a live
      test across Chrome + Safari + Firefox. Safari historically
      requires `webkitRequestFullscreen`; add a fallback if the
      standard API doesn't fire. Also verify the overlay dashboards
      (Schedule / Show Info) render correctly in fullscreen — the
      absolute-positioned inner panels may need a stacking fix.
- [ ] **Multi-week broadcaster scheduling.** `lib/broadcaster/client.ts`
      hard-codes `WEEK = 'current'` because the broadcaster only
      supports one "current" week at a time. When the broadcaster
      adds real week keys (likely ISO week strings, e.g. `2026-W16`),
      swap the constant for a computed value derived from today's
      date. No other changes needed on the ralph-world side — the
      schedule pipeline already handles loop and playthru modes.
- [ ] **Broadcaster-side: expose show names on playlist items.** Today
      `getSchedule()` makes two calls (playlist + full asset list) and
      joins in our process. If the broadcaster adds `file_name` (or a
      proper `show_name`) to the playlist response directly, we can
      drop the `/assets` fetch from `getSchedule()`. Minor perf win,
      not blocking.

## DNS cutover

- [ ] Update ralph.world DNS A/CNAME to Railway
- [ ] Verify Google OAuth callback URLs include the production domain
- [ ] Verify Shopify webhook URL matches
- [ ] Hit `/robots.txt`, `/sitemap.xml`, `/opengraph-image` to confirm
      all render
- [ ] Social share preview test (Twitter/Facebook debugger) — force
      re-scrape of OG tags on the new domain

## Post-cutover

- [ ] First real event through webhook to confirm paid tier flips
- [ ] Confirm GA events show up in the property
- [ ] Confirm Sentry picks up a real prod error
