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

## Shopify subscriptions (blocked on admin config)

- [ ] Install Shopify Subscriptions app (or Recharge), create the
      £3/month subscription variant, copy GID to
      `SHOPIFY_SUBSCRIPTION_VARIANT_ID` in Railway.
- [ ] Register `orders/paid`, `subscriptions/create`,
      `subscriptions/cancelled` webhooks pointing at
      `https://ralph.world/api/webhooks/shopify`. Copy the webhook
      secret to `SHOPIFY_WEBHOOK_SECRET`.
- [ ] Reconcile SubscribeModal copy — currently says both "£3 a
      month" and "payment once per quarter". Pick one and update the
      Shopify plan + modal text to match.
- [ ] End-to-end test: join via modal → Google OAuth → Shopify
      checkout → webhook fires → `profiles.subscriptionStatus`
      flips to `paid`.

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
