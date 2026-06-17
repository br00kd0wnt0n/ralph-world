# Subscription & fulfilment test plan

Pre-launch dress rehearsal across both repos. Designed as **one block you can
do solo from the US in about an hour**, plus **a separate block to hand to
the UK team** for the in-country bits (physical magazine receipt, geography-
sensitive flows).

Companion docs: `subscription-fulfilment-overview.md` (architecture),
`launch-checklist.md` (env vars + cutover), `stripe-setup.md` (test cards +
test-mode setup).

---

## 0. Five decisions to make before anyone tests anything

1. **Stripe mode — test or live?** If **live**, every subscription test is a
   real card charge — you'll need to refund afterwards (Stripe → Customers →
   refund). If **test**, use the test cards below; webhooks still fire and
   the whole pipeline exercises end-to-end. **Recommendation: do this whole
   plan in TEST mode first**, then a single live-mode sanity check with one
   real card the day before cutover.
2. **Mailchimp `DRY_RUN`** must be **`true`** throughout testing. Confirm via
   `curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" https://ralph-world-production.up.railway.app/api/admin/mailchimp-backfill`
   — it returns `envDryRun: true`. If not, set it before continuing.
3. **Test issue or first real issue for the fulfilment dress rehearsal?**
   Recommendation: create a throwaway `magazine_issues` row with a real
   Shopify variant SKU pointing at a **single test product** in Shopify —
   Newsstand fulfills it, we see a magazine arrive, then we delete the row.
   The alternative (use Issue 04 directly) is fine but less reversible.
4. **Brief Newsstand** that a fulfilment test is happening and they'll see
   one or two real Shopify orders against the test variant. So nobody panics.
5. **Two test email addresses** — one US, one UK. Plus-addressing
   (`you+ralphtest@…`) is fine, both fans of and reach the same inbox.

---

## A. From the US — solo, ~60 min, no team needed

Do these in order. Each step is verifiable from your laptop.

### A1. Sidebar build SHA check (30 sec)
Open the CMS, look at the sidebar footer for `build <sha>`. Confirm it
matches the latest commit on `main`. If it's stale, deploys haven't
landed — fix that before testing anything else.

### A2. Email/password signup (5 min)
- Visit ralph.world (Railway URL pre-cutover, ralph.world post), click
  "Sign up." Use `you+sub1@yourdomain.com`. **Tick the marketing
  checkbox.**
- Verification email arrives via Resend. Click the link → redirected to
  `/login?verify=ok` → sign in.
- Open Railway logs for ralph-world. Look for
  `[mailchimp:dry-run] would PUT … status=subscribed tags=signup_form` —
  confirms Mailchimp wiring is correct AND inert.
- Open Railway logs for ralph-world. Look for
  `[signup] shopify customer auto-link` — should succeed (NOT "SHOPIFY_STORE_DOMAIN is not set"). If it errors → the env var is missing on Railway (see launch-checklist §A2).
- DB check (psql as ralph_world): `SELECT id, email FROM users WHERE email='you+sub1@…';` then `SELECT user_id, shopify_customer_id FROM shopify_links WHERE user_id=<that id>;` — both rows should exist.

### A3. Google OAuth signup (3 min)
- Sign out, sign in with Google using a different address (`you+sub2@…`).
- The Google consent screen should NOT say "CareBears" (we migrated it).
  If it does, the OAuth client wasn't switched — flag it.
- `/account` renders, shows free tier.

### A4. Subscribe via Stripe Checkout (10 min)
- On the `+sub1` account, click "Upgrade £3/month" → Stripe Checkout opens.
- Use Stripe test card **`4242 4242 4242 4242`**, any future expiry, any
  CVC, any UK postcode.
- **Use a UK address** (e.g. office), even if you're in the US — so the
  shipping data is realistic. (You can also use a US address; just know
  Newsstand may refuse non-UK postcodes.)
- Stripe redirects back to `/account`. Verify:
  - Pink "PAID" badge in the Subscription section
  - Next billing date shown ~one month out
  - "Manage subscription" button visible
- Open Stripe Dashboard (test mode) → Customers → confirm the customer
  exists with the email + shipping address.
- DB check: `SELECT tier, stripe_customer_id, stripe_subscription_id, subscription_current_period_end FROM profiles WHERE id=<sub1 id>;` — all populated.
- Welcome email arrives via Resend.
- Shopify Admin (test or whichever store you point at) → Customers →
  confirm the shipping address synced to the Shopify customer's default
  address. (This proves the §A2 Shopify Admin env vars work.)

### A5. Manage / cancel (5 min)
- `/account` → "Manage subscription" opens the Stripe Customer Portal.
- Click "Cancel subscription" → Stripe should mark it
  `cancel_at_period_end=true`.
- Webhook fires; back in `/account` the subscription section should now
  say "Cancelled — access continues until [date]."
- Reactivate from the portal. Webhook reverts; `/account` shows the
  normal state again.

### A6. Failed payment scenario (5 min)
- In Stripe (test mode), use card **`4000 0000 0000 0341`** for a new
  subscription. The first charge succeeds; the next renewal will fail.
- Force a renewal via Stripe CLI (or wait until next bill) → webhook fires
  `invoice.payment_failed` → `/account` shows "payment failed" red badge.

### A7. Article paywall — server-side gating (5 min)
This is the security fix from the pre-launch sweep — confirm it holds.
- Identify a `paid_subscribers` article slug (or set one in the CMS).
- Sign out completely.
- `curl https://ralph.world/api/articles/<paid-slug> | jq` →
  response should have `gated: true`, `gateReason: 'guest'`, and
  `contentBlocks` truncated to the preview (NOT the full body).
- Open the article in the UI as a guest → only ~200 words visible + the
  sign-up CTA.
- Subscribe as `+sub1` → reopen the article → full body now visible.

### A8. DSAR + delete (5 min)
- On `+sub1`, `/account` → "Download my data" → JSON file downloads. Open
  it; confirm it includes profile, consents, shopify_links, etc. NOT the
  password hash.
- On the throwaway `+sub2`, `/account` → "Delete my account" → confirm
  twice → redirected to `/`. Try to sign back in → blocked. DB check:
  `SELECT * FROM users WHERE email='you+sub2@…';` returns no rows.
  `SELECT * FROM audit_log WHERE action='account_deleted' ORDER BY at DESC LIMIT 1;`
  shows the row.

### A9. CMS smoke (5 min)
- Sign into the CMS at `cms.ralph.world` as an admin.
- Open any article → "Browse library" on a media field → modal lists R2
  images. Pick one → field updates.
- TV section → toggle freeview OFF → reload → toggle persisted.
- Magazine Issues → open Issue 04 (or test issue) → click "Dry run" on
  the Fulfilment panel → shows the eligible count (should be **1** if
  only `+sub1` is paid).

### A10. Cookie + legal pages (3 min)
- Incognito window. Cookie banner appears.
- "Necessary only" → DevTools Network filter "sentry" → no requests.
- Reload → banner stays closed.
- Footer "Cookie preferences" → banner re-opens.
- `/legal/terms`, `/legal/privacy`, `/legal/cookies` render in white text,
  no `[LEGAL:` markers visible.

---

## B. UK team — ~30 min, after you've done A

Send them this section verbatim.

### B1. Sign up + subscribe (UK address) (10 min)
- Visit ralph.world. Sign up with your work email + UK address.
- Click "Upgrade £3/month." In test mode use Stripe test card
  **4242 4242 4242 4242**; in live mode use a real card (we'll refund).
- Confirm the email arrives.

### B2. Verify shipping address (2 min)
- Visit `/account`. Confirm your name + UK address are shown.
- (Admin will check the Shopify customer record matches.)

### B3. Event RSVP (5 min)
- Visit `/events`. Click into a real upcoming event.
- Click "RSVP" → confirmation email arrives.
- Verify the date + venue + map link in the email look right.

### B4. Magazine receipt (waits a few days) — see §C

### B5. General click-through (10 min)
- Read a free article → upsell strip appears at the end.
- Try a paid article as a paid subscriber → full body visible.
- TV page → if the freeview gate is enabled, confirm the countdown
  badge appears for a signed-out window.
- Search/browse all four "Comedy / Music / Food / Film & TV / Fun" tabs.
- Send a screenshot of anything that looks visually off.

---

## C. Fulfilment dress rehearsal — careful, real-money path

Done by an **admin** in the CMS, ideally with the US user watching the
ralph-world Railway logs in another tab.

### C1. Dry-run preflight (1 min, zero risk)
- CMS → Issues → [the test issue] → Fulfilment panel → **Dry run**.
- Verify the eligible count matches the number of paid subscribers
  you've created (US `+sub1` + UK colleague = 2).
- No `magazine_shipments` rows are created on dry-run; no Shopify
  orders; no emails.

### C2. Real fulfilment (5 min, real Shopify orders)
- Newsstand briefed? (See §0.4.) If not, **stop here.**
- Click "Fulfil Issue N" → confirmation modal → "Yes, fulfil now."
- Railway logs: `[magazine-fulfilment]` lines appear.
- Result panel shows: `N orders created, 0 failed`.
- DB: `SELECT user_id, status, shopify_order_id FROM magazine_shipments WHERE issue_id=<id>;` — N rows, all `shopify_order_created`.
- Shopify Admin → Orders → N new orders against the test variant.
- `audit_log` shows `magazine_fulfilment_batch_started` then
  `magazine_fulfilment_batch_run` rows, both with the admin's
  `actor_id`.

### C3. Confirm the email path triggers correctly (waits for Newsstand)
- When Newsstand marks the order fulfilled in Shopify (could be minutes
  to days):
  - Shopify webhook fires `fulfillments/create`.
  - `magazine_shipments.status` flips to `fulfilled`, `shipped_at` set.
  - Resend sends the "your magazine is on its way" email.
- US user receives the email (if they used a UK address, they won't get
  a parcel but they get the email — proves the trigger).
- UK user receives the parcel a few days later → tests end-to-end.

### C4. Clean-up (if using a throwaway test issue)
- After verification, drop the test issue row + manually refund the
  Stripe charges (test mode = no refund needed; live = use Stripe portal).
- Delete the test paid subscriber profiles or leave them as `+test`
  identifiers for ongoing smoke.

---

## D. What to watch in real time

Have these open in browser tabs throughout testing:
- **Railway logs** — ralph-world AND ralph-cms (deploy SHA, signup
  errors, dry-run logs, webhook signatures)
- **Stripe Dashboard** (Test mode for §A4-A6) — Customers, Webhooks,
  Events
- **Shopify Admin** — Customers, Orders, Webhooks delivery log
- **Resend Dashboard** — sent emails, delivery status, bounces
- **psql** as ralph_world for the DB checks (read-only spot-check)

---

## E. Quick reference — test cards (Stripe test mode)

| Card | Outcome |
|---|---|
| `4242 4242 4242 4242` | Succeeds — happy path |
| `4000 0000 0000 0341` | Succeeds, NEXT renewal fails — tests payment-failed flow |
| `4000 0000 0000 9995` | Declined immediately |
| `4000 0025 0000 3155` | Requires 3DS auth — tests SCA path |

Any future expiry (e.g. 12/30), any CVC, any non-empty postcode.

---

## F. Safety summary

- ✅ Stripe test mode → no real money moves
- ✅ Mailchimp `DRY_RUN=true` → no real audience writes
- ⚠️ Magazine fulfilment is **always live** (no test mode in Shopify
  Admin orders) — orders to Newsstand are real, will print + post real
  copies. **§C2 is the line; everything above it is reversible without
  briefing anyone.**
- ✅ Account deletion truly deletes — make sure you test on throwaway
  `+sub2` and not your real account
- ✅ All sensitive actions write `audit_log` rows — you have full
  forensics

---

## G. Pass / fail criteria

The system is "ready for cutover" when:
- §A1–A10 all pass without surprises
- §B1–B3 all pass for at least one UK colleague
- §C1 (dry-run) passes
- §C2 (real fulfilment) passes with at least one subscriber and Newsstand
  acknowledges receipt of the order
- §C3 (email path on fulfillment) — verified at least once

Anything else found goes to a punch list, prioritised, and either fixed
before cutover or scheduled post-launch (see launch-checklist §C).
