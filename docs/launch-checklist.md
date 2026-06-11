# Ralph.world — pre-launch checklist (final consolidation)

_Compiled 2026-06-11 at the end of Phase 9._

Everything code-wise that can be done is done. What's left splits into three
buckets: (1) **pre-launch tasks** to finish in the days before cutover,
(2) the **cutover-day runbook** (lives in
`~/.claude/projects/-Users-BD-ralph-cms/memory/dns-cutover-checklist.md`),
and (3) **post-launch follow-ups** that aren't blockers but should land in
the first week.

For full security audit details see `docs/audits/`:
- `prelaunch-security-sweep-2026-06.md` — what was found and what's deferred
- `magazine-fulfilment-security.md` — hardening detail for the Shopify-order job
- `schema-drift-2026-06.md` — proof prod schema matches schema.ts

---

## A. Pre-launch (do this week)

### A1. Solicitor pass on legal copy ⚠️ HARD GATE
- Pages: `/legal/terms`, `/legal/privacy`, `/legal/cookies`. Search the
  source for `[LEGAL: review]` markers and fill them all.
- Specifically wrong today and **must** be corrected: the terms draft says
  "charged quarterly via Stripe" — billing is monthly (£3 / month). Mismatch
  vs the corrected subscribe smallprint and the actual Stripe price is a
  consumer-rights/chargeback risk.
- Once the copy lands, bump `POLICY_VERSION` in `lib/consent.ts` (currently
  `'2026-06-v1'`) so consent rows from this point on are stamped against the
  new version. Old rows stay valid; the bump means we have a record of
  *which* version each user consented to.
- Confirm trading entity name, registered office, jurisdiction (defaulting
  to England & Wales in the draft), and DSAR contact email (currently
  `hello@ralph.world`).

### A2. Railway env vars to set / verify

**ralph-world** (Variables tab):
- `SHOPIFY_STORE_DOMAIN` — `store.myshopify.com` (no `https://`). Required.
  **Was unset** at last check — without it, signup's Shopify customer
  auto-link silently no-ops, so paid subscribers don't get
  `shopify_links` rows and the magazine fulfilment job finds zero eligible
  subscribers. Verify the absence with one signup → check Railway logs for
  `[signup] shopify customer auto-link failed`. After setting, smoke a new
  signup and confirm a `shopify_links` row appears for that user.
- `SHOPIFY_ADMIN_ACCESS_TOKEN` — `shpat_…`. Scopes needed: customers (r/w),
  orders (write). Shopify admin → Settings → Apps and sales channels →
  Develop apps → [your app] → API credentials.
- `INTERNAL_API_TOKEN` — `openssl rand -base64 32`. Must be **byte-identical**
  on both services (used for the magazine fulfilment + Mailchimp backfill
  internal endpoints).
- `MAILCHIMP_DRY_RUN=true` — leave on through cutover. Flip off only after
  §C2 (post-launch backfill).
- `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID` — real values can land at any
  time; while `DRY_RUN=true` they're inert.
- Existing vars to verify present: `DATABASE_URL` (ralph_world DSN),
  `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`/`SECRET`,
  `STRIPE_SECRET_KEY`/`PRICE_ID`/`WEBHOOK_SECRET`, `SHOPIFY_WEBHOOK_SECRET`,
  `RESEND_API_KEY`, `R2_*`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_APP_URL`,
  `SENTRY_DSN`.

**ralph-cms** (Variables tab):
- `INTERNAL_API_TOKEN` — same value as ralph-world. **Currently TBC.**
- `RALPH_WORLD_INTERNAL_URL` — `https://ralph-world-production.up.railway.app`
  until cutover, then `https://ralph.world`. **Currently TBC.**
- `PUBLIC_SITE_URL` — same flip pattern. Used by `revalidatePublicSite()`
  to bust the public-site cache on saves. If this points at `ralph.world`
  pre-cutover (DNS still on the old site), CMS edits won't propagate to the
  Railway public site for up to 300s (natural TTL) instead of immediately.
- `REVALIDATE_SECRET` — must match the ralph-world value.
- `DATABASE_URL` (ralph_cms DSN), `AUTH_SECRET`, `AUTH_GOOGLE_ID`/`SECRET`,
  `RESEND_API_KEY`, `R2_*`, etc.

### A3. Smoke-test the CSP on the next deploy ⚠️ HIGHEST CODE-RISK
The pre-launch hardening added a Content-Security-Policy. The script policy
is permissive (`unsafe-inline`/`unsafe-eval` — Next requires it) so the
**real risk** is `frame-src`/`connect-src`/`img-src` being too tight.

After the ralph-world deploy lands, click through:
- TV page (HLS, Sentry connect) — DevTools → Console + Network filter
  "blocked:csp"
- A magazine article with a **YouTube embed**, and one with a **Vimeo embed**
- The **subscribe → checkout** flow (Stripe.js iframe)
- Images loading from R2, Shopify, Google avatars

If anything's blocked, add the offending host to the relevant `*-src` and
redeploy. CSP fixes are one-liners; the only reason this is highlighted is
that an over-tight CSP fails silently in production until a user hits the
broken page.

### A4. One-time DB grant (optional but recommended)
Run **once as the Postgres superuser**:

```sql
GRANT CREATE ON SCHEMA public TO ralph_cms;
```

Closes the gap where `ralph_cms` couldn't actually run `db:push` despite the
runbook claiming it could. Until applied, future schema changes have to go
through the superuser. Idempotent and safe; the SQL is already in
`scripts/db-roles-phase-1.sql` for future re-provisioning.

### A5. Lock down Mailchimp UI (belt-and-braces)
Even with `MAILCHIMP_DRY_RUN=true` blocking outbound calls from our side,
sanity-check the audience UI so a future-you can't accidentally trigger
sends post-cutover:
- **Audience → Settings → Defaults**: "from" name + email match
  `hello@ralph.world` (or chosen sender).
- **Signup forms → Form settings**: double opt-in **disabled** unless you
  specifically want it. With double opt-in on, the first real PUT triggers
  Mailchimp's confirmation email regardless of our flag.
- **Customer Journeys / Classic Automations**: none active on "subscribes
  to list" trigger until you're ready to send.

### A6. CMS custom domain
If `cms.ralph.world` (or chosen subdomain) is the plan, set the Railway
custom domain on the ralph-cms service now so DNS records propagate before
cutover.

### A7. DNS TTL drop
Set the ralph.world A-record TTL to ~300s the day before cutover. Lets
rollback (§B5 of cutover checklist) take effect in minutes, not hours.

### A8. Final pre-cutover smoke (against the Railway URLs)
On the live Railway URLs, do one end-to-end run of:
- Sign up via email/password with the marketing-tick on → Railway log shows
  `[mailchimp:dry-run] would PUT…` (proves wiring works, no real send)
- Verify email → log in → `/account` renders
- Sign in with Google → `/account` renders, consent screen shows correct app
  name (NOT "CareBears" — see `oauth-carebears-rebrand` memory)
- Read a free article → guest upsell strip appears at end
- Read a paid_subscribers article as a guest → only the preview is in the
  network response (curl `/api/articles/<paid-slug>` and confirm
  `contentBlocks` is truncated + `gated: true`)
- `/legal/terms`, `/legal/privacy`, `/legal/cookies` — render in light text
  on dark bg, no `[LEGAL:` markers visible
- Cookie banner appears on first visit, persists choice, footer "Cookie
  preferences" reopens it

---

## B. Cutover day

Full runbook: `~/.claude/projects/-Users-BD-ralph-cms/memory/dns-cutover-checklist.md`

Headline sequence (refer to the runbook for detail):
1. Final env vars flipped (`NEXT_PUBLIC_APP_URL`, `AUTH_URL`,
   `PUBLIC_SITE_URL`, `RALPH_WORLD_INTERNAL_URL` → `https://ralph.world`).
2. Webhook endpoints updated in third-party dashboards: Resend, Stripe (new
   `whsec_…` — copy to Railway before deleting old endpoint), Shopify
   (`customers/update` + `fulfillments/create`).
3. Google OAuth: add `https://ralph.world/api/auth/callback/google` to both
   clients (ralph-world + ralph-cms); keep Railway URLs for safety net.
4. DNS A-record swap.
5. Walk the **20 smoke tests in §7 of the cutover runbook**. Don't skip the
   TV freeview persistence test (refresh mid-countdown) — that one caught a
   four-layer cache bug this session.
6. Tag the commit: `git tag -a cutover-2026-XX-XX -m "DNS cutover"`.

---

## C. Post-launch (first week)

### C1. Trim session payload (security sweep #11)
The NextAuth session currently serialises `stripeCustomerId` and
`stripeSubscriptionId` into the client via AuthContext. Own-user data only,
but the browser never needs them — strip from `SessionProfile`.

### C2. Mailchimp backfill
Once §A8 smoke + §B smoke tests pass:
1. Lock down Mailchimp UI (§A5) confirmed.
2. Set `MAILCHIMP_DRY_RUN=false` (or remove) on ralph-world Railway.
3. Wait for redeploy.
4. Preflight:
   ```bash
   curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
        https://ralph.world/api/admin/mailchimp-backfill
   # → {"eligibleCount":N, "mailchimpConfigured":true, "envDryRun":false}
   ```
5. Run:
   ```bash
   curl -X POST -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
        -H "Content-Type: application/json" -d '{"limit":500}' \
        https://ralph.world/api/admin/mailchimp-backfill
   ```
   Paginate via `offset` if `eligibleCount > 500`. Idempotent.

### C3. Strict-nonce CSP (security hardening)
The launch CSP allows `script-src 'unsafe-inline' 'unsafe-eval'` because Next
needs them without nonce injection. Post-launch, set up `headers()` with a
per-request nonce + middleware, and drop those two — biggest CSP win you can
get short of going Trusted Types. Plan for a quiet week, not the first few
days.

### C4. Magazine fulfilment first-run prep
Whenever you're ready to ship Issue 04 (the first one through Stripe-driven
fulfilment):
1. Issue has `status='published'` and `shopifyVariantId` set.
2. Run the dry-run via the CMS panel (or curl). Confirm the eligible
   subscriber count matches your billing-side count.
3. Run the real fulfilment. Watch the `audit_log` for the
   `magazine_fulfilment_batch_started` row.
4. If any rows end up `failed`, write the small reconciliation script noted
   in `docs/audits/magazine-fulfilment-security.md` §8 (find Shopify orders
   that were created post-error and repair `magazine_shipments` rows).

### C5. Smaller deferred items
- Resend webhook idempotency table (duplicates are cosmetic, not a security
  issue — `email_events` rows are reference data, not source of truth)
- Lab items server-side gate (currently `accessTier` is on the schema but
  the lab listing doesn't filter; impact is title/thumbnail/external link
  only — no paid content there yet)
- `saveHomepageConfig` key allowlist (admin/editor only — defence in depth)
- Revoke prior live tokens on email-verification re-issue (acceptable given
  short TTLs)

---

## D. Standing operational rules (don't forget)

- **Never run `drizzle-kit push` as `ralph_world`.** It produces dangerous
  false-positive prompts (the "truncate articles" scare on 2026-06-10 was
  caused by this). Run as `ralph_cms` (after §A4) or superuser, in a TTY.
- **Schema changes are NOT applied on Railway deploy.** `npm run build` is
  the only build step. Any new column/table must be applied manually first
  via `db:push` (as ralph_cms in a TTY) or targeted superuser SQL — see
  the lesson learned via `magazine_fulfilment_runs` and `card_image_url`.
- **Stripe webhook secret rotates on URL change.** When the cutover updates
  the Stripe endpoint URL, Stripe issues a **new** `whsec_…`. Copy to Railway
  BEFORE deleting the old endpoint — keeps replay protection unbroken across
  the transition window.
- **Code is the truth — DB matches it as of 2026-06-11.** Confirmed against
  prod. Future drift means a forgotten manual DDL step.

---

## E. Snapshot — what's complete at the end of Phase 9

All code work is done across both repos: every Phase 9 task (3.1–3.10),
the TV freeview fixes, the magazine batch (cardthumbnail + carousel +
text-wrap + video embeds), Mailchimp + dry-run safety, the magazine
fulfilment security hardening (DB-locked, audited, admin-only,
timing-safe), the GDPR/DSAR/cookie/legal stack, and the post-sweep
hardening (server-side content gate, DOMPurify sanitization, rate
limiting, Shopify HMAC fix, /api/revalidate allowlist, pooled health
endpoints, security headers + CSP).

The only remaining engineering items are the post-launch follow-ups in
§C. Everything else is configuration, legal copy, and the cutover itself.
