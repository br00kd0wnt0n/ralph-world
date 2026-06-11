# Pre-launch security sweep — 2026-06-11

Three parallel read-only audits (auth/accounts · APIs/webhooks/payments ·
frontend/gating/headers) across ralph-world + ralph-cms. Findings below;
the two BLOCK-LAUNCH items were independently confirmed by hand.

## Punch list

### ❌ BLOCK LAUNCH
1. **Paid/premium content leaks to anyone.** `GET /api/articles/[slug]`
   returns the full article — every `contentBlocks` entry, any `access_tier`
   — with no auth and no tier filter (`app/api/articles/[slug]/route.ts`;
   `getArticleBySlug`/`getPublishedArticles` in `lib/data/magazine.ts` both
   `select()` everything). The paywall is enforced **only client-side** in
   `ArticleOverlay.tsx` (`visibleBlocks = blocks.slice(0, gateIndex)`), so the
   full paid body is already in the RSC payload AND any guest can
   `curl /api/articles/<paid-slug>`. Defeats Tasks 3.2/3.3.
   **Fix:** gate server-side — in the API route + the data layer (or page
   loader), when `accessTier` is gated and the caller isn't entitled
   (`canCurrentUserAccess`), truncate `contentBlocks` to the ~200-word preview
   before it leaves the server, and 403/trim in the route. Lab items
   (`lib/data/lab.ts`) share the pattern but only expose title/thumbnail/
   external link — lower impact, same fix.

2. **Stored XSS via unsanitized rich-text HTML.** `BlockRenderer.tsx` renders
   `block.text` (Tiptap HTML) raw via `dangerouslySetInnerHTML` for both
   `ArticleText` and the new `ArticleImageTextWrap`. No sanitizer dependency
   exists in either repo and nothing sanitizes on write (`saveArticle` stores
   `contentBlocks` verbatim) or read. Any editor — or a hijacked editor
   session — can store `<img onerror=…>`-style payloads that execute for every
   reader (session theft, admin-action forgery).
   **Fix:** sanitize on render with `isomorphic-dompurify`/`sanitize-html`,
   allowlisting only Tiptap's tags (`p br strong em ul ol li a[href]`) and
   forcing `href` through `safe-url`. Sanitize on write too. CSP (#8) is
   defense-in-depth.

### ⚠️ FIX BEFORE LAUNCH
3. **No rate limiting on auth/account endpoints.** signup, reset-password,
   set-password, verify-email, marketing-opt-in, and Credentials login are
   unthrottled → password-spray, reset-email bombing, token brute-force.
   `/api/consent` is anonymous AND unthrottled → unbounded `consent_log`
   inserts with no DELETE path to clean up. Add a per-IP/per-email fixed-window
   limiter (reuse the pattern in `internal/magazine-fulfilment/route.ts`).
4. **Password floor inconsistent** — `set-password` accepts 8 chars, signup
   requires 10 (`lib/auth/passwords.ts` MIN=10). Use `validatePassword()` in
   set-password so reset can't downgrade.
5. **Shopify HMAC compare not reliably timing-safe** — `lib/shopify/verifyHmac.ts`
   compares the base64 header as UTF-8 bytes with a length short-circuit
   (leaks length, can mis-handle malformed input). Decode both sides from
   base64 and `timingSafeEqual`, mirroring `lib/stripe/verifySignature.ts`.
6. **`/api/revalidate` accepts arbitrary paths/tags** — bearer check is
   timing-safe, but no allowlist or length cap; if the shared
   `REVALIDATE_SECRET` leaks, an attacker can force mass cache regeneration
   (DoS) or targeted invalidation. Allowlist known tags/path-prefixes + cap
   array length.
7. **Health endpoints open a fresh unpooled PG connection per hit** (both
   repos: `app/api/health/route.ts` → `postgres(url,{max:1})` + `SELECT 1`).
   Unauthenticated flood can exhaust `max_connections`. Use the pooled
   `getDb()`.
8. **No security headers / CSP** in either repo (no `headers()` in
   `next.config.ts`, no middleware in ralph-world). Missing CSP,
   X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy,
   HSTS. Add `headers()`; a CSP also blunts #2.

### 🔵 MONITOR / low
9. `scripts/db-roles-phase-1.sql` has a latent self-contradiction: step 6
   grants `ralph_world` UPDATE on `stripe_events`, while the step-10 assertion
   lists `stripe_events` among tables that must NOT have UPDATE/DELETE — a
   **fresh** re-apply would `RAISE EXCEPTION` and roll back. **Prod is
   correctly configured** (verified live: audit_log/consent_log =
   INSERT+SELECT only; stripe_events = INSERT+SELECT+UPDATE; profiles UPDATE
   excludes `role`). Fix the file (drop `stripe_events` from the assertion) so
   re-provisioning doesn't abort.
10. Resend webhook has no idempotency — replays create duplicate `email_events`
    rows only (cosmetic).
11. Own-user `stripeCustomerId`/`stripeSubscriptionId` are serialized into the
    client session (`SessionProfile` → AuthContext). User's own data, low risk;
    trim — the browser never needs them.
12. `broadcaster-signin` echoes missing env-var names in an error page (to an
    already-authenticated admin/editor) — minor info disclosure.
13. `saveHomepageConfig(key, value)` writes an arbitrary key (admin/editor
    only) — consider a key allowlist.
14. Verification/reset tokens aren't revoked on re-issue — acceptable given
    24h/1h TTLs.

## Verified solid (no action)
- **DB role separation is live in prod** (verified by querying actual grants):
  append-only audit_log/consent_log; `ralph_world` cannot UPDATE
  `profiles.role` (escalation defense holds); strongest control in the system.
- Session role/tier read fresh from DB each request, never trusted from the JWT.
- No IDOR on account endpoints — export/delete/marketing/portal/upgrade all
  scoped to `session.user.id`; no caller-supplied id trusted. DSAR export omits
  the password hash.
- Stripe: price id server-fixed (no tampering), customer bound to session user,
  webhook signature timing-safe + 5-min replay window + `stripe_events`
  idempotency genuinely prevents replay.
- R2 signed uploads: admin/editor-gated, content-type allowlist, 10MB
  server-side cap, UUID keys (no path traversal).
- Cart: HMAC cart-token gates every read/write (no IDOR).
- Internal/admin endpoints (magazine-fulfilment, mailchimp-backfill): timing-safe
  bearer, fail-closed, input validation, rate limit, DB run-lock — sound.
- No live SSRF (every outbound fetch uses env-fixed base URLs).
- Open-redirect guards present (`safeCallback`), Sentry gated behind cookie
  consent, no password-hash leak.

## Suggested fix order
1. Server-side content gate (#1) + sanitize rich text (#2) — the two blockers.
2. Rate limiting (#3) + password floor (#4) + Shopify HMAC (#5) — one PR.
3. revalidate allowlist (#6) + health pooled conn (#7) + security headers/CSP (#8).
4. Fix the role-SQL assertion (#9) + trim session fields (#11) — housekeeping.
