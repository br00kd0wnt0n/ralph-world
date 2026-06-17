# Subscription & fulfilment test plan

Pre-launch dress rehearsal across both repos. Designed as **one block you can
do solo from the US in about an hour**, plus **a separate block to hand to
the UK team** for the in-country bits (physical magazine receipt, geography-
sensitive flows).

Companion docs: `subscription-fulfilment-overview.md` (architecture),
`launch-checklist.md` (env vars + cutover), `stripe-setup.md` (test cards +
test-mode setup).

---

## 0. Decisions made (2026-06-11)

This plan is written for our actual config:

1. **Stripe is in LIVE mode with live keys.** Every subscription = a real
   £3 charge to a real card. There is **no test-card path** without
   rotating the keys to test ones (don't — that'd require Railway env
   changes + would break any real subs).
2. **Mailchimp `DRY_RUN=true`** stays on through testing. Confirm via
   `curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" https://ralph-world-production.up.railway.app/api/admin/mailchimp-backfill`
   → expect `envDryRun: true`.
3. **No Shopify test variant exists.** The fulfilment rehearsal therefore
   has to run against the real next issue (Issue 04) — which means our
   test subscribers ARE the first real subscribers, and the magazines
   that print + post are real ones going to real addresses. There is no
   throwaway path. This is fine, just means we need to be deliberate.
4. **Newsstand brief** — to be sent **after the UK team has signed off
   on this plan**, not before.
5. **Test subscribers** — 1 US (you), 1–2 UK colleagues. Real names,
   real shipping addresses, real cards. The £3 charge stays — these
   become genuine paying subscribers and the first issue ships to them.
   No refunds, no awkward accounting.

### What we lose in live mode (and how we'll handle it)

- **No payment-failed simulation** — `4000…0341` and the `stripe trigger`
  CLI only work in test mode. In live mode, we'd have to wait for a real
  payment failure or manually cancel a payment method to provoke it. We'll
  **monitor first-month renewals closely** instead and trust that the code
  path was unit-tested in development.
- **No "throwaway test subscribers"** — each is real. So minimize: 2–3 max.
- **First real fulfilment is the launch event.** No safety dry-run with
  fake people; the real run goes to real subscribers who paid real money.
  Mitigated by §C1 (dry-run), the per-issue DB lock, the admin-only gate,
  and the audit trail — all of which were independently audited.

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

### A4. Subscribe via Stripe Checkout (10 min) — REAL CHARGE
- On the `+sub1` account, click "Upgrade £3/month" → Stripe Checkout opens.
- **Use your real card.** This is a live £3 charge. Don't refund — keep
  the subscription active; it becomes the first real subscriber and
  validates the next-issue fulfilment.
- **Use a UK shipping address** — a colleague's office address works. The
  magazine WILL ship there when fulfilment runs.
- Stripe redirects back to `/account`. Verify:
  - Pink "PAID" badge in the Subscription section
  - Next billing date shown ~one month out
  - "Manage subscription" button visible
- Open Stripe Dashboard (live mode) → Customers → confirm the customer
  exists with the email + shipping address. **Charge should show £3.00 GBP.**
- DB check: `SELECT tier, stripe_customer_id, stripe_subscription_id, subscription_current_period_end FROM profiles WHERE id=<sub1 id>;` — all populated.
- Welcome email arrives via Resend.
- Shopify Admin → Customers → confirm the shipping address synced to the
  Shopify customer's default address. (Proves §A2 Shopify Admin env works.)

### A5. Manage / cancel (5 min)
- `/account` → "Manage subscription" opens the Stripe Customer Portal.
- Click "Cancel subscription" → Stripe should mark it
  `cancel_at_period_end=true`.
- Webhook fires; back in `/account` the subscription section should now
  say "Cancelled — access continues until [date]."
- Reactivate from the portal. Webhook reverts; `/account` shows the
  normal state again.

### A6. Failed payment scenario — SKIPPED in live mode
`stripe trigger` and renewal-failure test cards only work in test mode.
In live mode, we monitor real first-month renewals (which won't happen
until ~30 days after the first subscription) and respond to actual
failures via the Stripe Dashboard. The code path was exercised in
development; trust + monitor.

If you really want to exercise it pre-launch, the path is: cancel the
card you used in §A4 with your bank, wait for the renewal in ~30 days,
watch the webhook fire. Not practical for launch timing.

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

## C. Fulfilment — first real run (no throwaway test path)

Because there's no Shopify test variant, **the first fulfilment IS the
launch event**. Test subscribers from §A4/§B1 are the first real cohort.
Done by an admin in the CMS, ideally with the US user watching Railway
logs in another tab.

### C1. Dry-run preflight (1 min, zero risk)
- CMS → Issues → [Issue 04 or whichever the launch issue is] →
  Fulfilment panel → **Dry run**.
- Verify the eligible count = the number of paid subscribers you've
  created (you + UK colleagues = 2 or 3).
- No `magazine_shipments` rows are created on dry-run; no Shopify orders;
  no emails. This is the safest possible smoke test.
- If the eligible count is wrong, **stop**. Common causes: SHOPIFY env
  vars unset so signup auto-link failed → subscribers have no
  `shopify_links` row → invisible to fulfilment. Fix and re-dry-run.

### C2. Real fulfilment — IRREVERSIBLE LINE (5 min)
- **Newsstand briefed?** (See §0.4.) If not, **STOP HERE.**
- **UK team aware?** (Their copies of Issue 04 will ship.)
- Click "Fulfil Issue N" → confirmation modal → "Yes, fulfil now."
- Railway logs: `[magazine-fulfilment]` lines appear.
- Result panel: `N orders created, 0 failed`.
- DB: `SELECT user_id, status, shopify_order_id FROM magazine_shipments WHERE issue_id=<id>;` — N rows, all `shopify_order_created`.
- Shopify Admin → Orders → N new orders against the Issue 04 variant,
  tagged `subscription, magazine-fulfilment`.
- `audit_log` shows `magazine_fulfilment_batch_started` then
  `magazine_fulfilment_batch_run` rows, both with the admin's `actor_id`.
- If anything looks wrong post-run, **don't re-run** — the DB lock + the
  UNIQUE(user, issue) index will refuse, which is correct behaviour.
  Investigate the per-row `error` column on any `status='failed'` row
  before retrying.

### C3. Email path verification (waits for Newsstand action)
- When Newsstand marks the orders fulfilled in Shopify (minutes to days
  depending on their workflow — see `subscription-fulfilment-overview.md`
  §6-7):
  - Shopify webhook fires `fulfillments/create`.
  - `magazine_shipments.status` flips to `fulfilled`, `shipped_at` set.
  - Resend sends the "your magazine is on its way" email.
- Each test subscriber receives the email.
- Each test subscriber receives the parcel a few days later (UK addresses
  only; the email itself fires regardless of geography).

### C4. After-launch
- Test subscribers' subscriptions continue to renew monthly at £3.
- They can cancel from `/account` if/when they're done testing — access
  continues to period-end, then drops back to free tier.
- No clean-up required — these are genuine subscriptions in the live
  system, indistinguishable from any other subscriber post-cutover.

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

## E. Test cards — not applicable (live mode)

We're on live Stripe keys, so test cards don't work. Subscribe with a
real card. The test-card reference is left in `stripe-setup.md` for any
future test-mode rehearsal.

---

## F. Safety summary

- ⚠️ Stripe LIVE — every subscribe = real £3 charge. Plan: 2–3 team
  subscribers, no refunds, treat as first real cohort.
- ✅ Mailchimp `DRY_RUN=true` → no real audience writes during testing.
- ⚠️ Magazine fulfilment is real (Shopify orders → Newsstand → physical
  print + post). **§C2 is the irreversible line.**
- ✅ Account deletion truly deletes — test on throwaway `+sub2`, not your
  real account.
- ✅ All sensitive actions write `audit_log` rows — full forensics.
- ✅ Cancellation runs to period-end; doesn't strand the user mid-issue.

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
