# Resend smoke-test runbook

End-to-end manual test of the transactional email pipeline once Resend
is wired up. Confirms:

- API key works (email actually leaves the building)
- Sending domain is verified (no spam-folder issues)
- Template renders correctly
- Verification link points at the right host
- Click-through marks `users.email_verified`
- Webhook signing secret is valid (delivery event lands in `email_events`)

## Prerequisites

In Railway → ralph-world → Variables:

| Var | Value |
|---|---|
| `RESEND_API_KEY` | `re_…` from Resend dashboard → API Keys |
| `RESEND_FROM` | `Ralph.world <hello@send.ralph.world>` (or whatever sending address you chose) |
| `RESEND_WEBHOOK_SECRET` | `whsec_…` from Resend → Webhooks → endpoint config |
| `NEXT_PUBLIC_APP_URL` | `https://ralph-world-production.up.railway.app` (until DNS cutover) |

In Resend dashboard:

1. **Domains** → add `send.ralph.world` (subdomain) or `ralph.world` (direct) → add the TXT/DKIM records to your DNS provider → wait for verification (usually <5 min, sometimes up to a few hours)
2. **Webhooks** → add endpoint:
   - URL: `https://ralph-world-production.up.railway.app/api/webhooks/resend`
   - Events: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`
   - Copy the `whsec_…` signing secret

## Smoke test 1 — signup triggers email

```bash
TEST_EMAIL="your-personal-email@gmail.com"  # an inbox you can check

curl -sS -X POST \
  https://ralph-world-production.up.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"correct horse battery staple\",\"name\":\"Smoke Test\"}"
```

**Expected response:**

```json
{"ok":true,"message":"Check your inbox to verify your email."}
```

**Verify the email actually sent:**

1. Resend dashboard → **Logs** tab → most recent entry should be:
   - To: `your-personal-email@gmail.com`
   - Subject: `Verify your Ralph.world email`
   - Status: `delivered` (or `sent` while in flight)
2. Check your inbox — the email should land within 5–30 seconds. If it goes to spam, the sending domain isn't fully verified yet.
3. The email contains a "Verify email" button. Hover over it — the URL should look like:
   ```
   https://ralph-world-production.up.railway.app/api/auth/verify-email?email=…&token=…
   ```

**Common failures:**
- `RESEND_API_KEY is not set` — env var didn't propagate, redeploy Railway service
- Email arrives but goes to spam → domain DKIM not propagated, wait or check DNS
- Link points at `ralph.world` instead of Railway → `NEXT_PUBLIC_APP_URL` env var is wrong

## Smoke test 2 — clicking the link verifies the email

In a private browser window, click the link from the email. You should be redirected to:

```
https://ralph-world-production.up.railway.app/login?verify=ok
```

To confirm `users.email_verified` was actually set, in psql:

```sql
SELECT email, email_verified
FROM users
WHERE email = 'your-personal-email@gmail.com';
```

Expected: `email_verified` is a recent timestamp.

## Smoke test 3 — idempotency holds

Run the curl from Smoke test 1 a second time with the **same email**. Two scenarios:

**Before verifying:** the unverified-existing-user branch fires. New token issued, new email sent (different content hash because the token rotates). Logs show a second entry.

**After verifying:** enumeration-safe branch fires. Response is still `{ok: true, message: 'Check your inbox...'}` but **no email is sent**. Resend Logs shows no new entry. This is intentional — we don't reveal account existence.

## Smoke test 4 — webhook signature verification

Trigger a webhook by sending an email (Smoke test 1) and waiting for Resend to deliver. Resend will POST `email.delivered` to our webhook endpoint.

**Verify the row landed in `email_events`:**

```sql
SELECT event_type, email, idempotency_key, resend_event_id, at
FROM email_events
WHERE email = 'your-personal-email@gmail.com'
ORDER BY at DESC
LIMIT 10;
```

Expected rows (most recent first):

| event_type | idempotency_key | resend_event_id |
|---|---|---|
| `email.delivered` | NULL | `<resend id>` |
| `sent` | NULL | `<resend id>` |
| `send_attempted` | `<userId>:email-verification:<hash>` | NULL |

The `send_attempted` row carries the idempotency key. The `sent` row is our post-Resend bookkeeping. The `email.delivered` row is from the webhook.

**Verify signature rejection works** — try to POST garbage to the webhook:

```bash
curl -sS -X POST \
  https://ralph-world-production.up.railway.app/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{"fake":"payload"}'
```

Expected: `401 signature rejected`. If you get `200`, the signature verifier is broken and we have a security problem.

## Run the Playwright E2E

Once everything above passes manually:

```bash
PLAYWRIGHT_BASE_URL=https://ralph-world-production.up.railway.app \
DATABASE_URL='postgresql://ralph_world:<encoded-pw>@metro.proxy.rlwy.net:37125/railway' \
npm run test:e2e
```

`e2e/credentials-signup.spec.ts` covers:
- Signup → verify token → `users.email_verified` is set
- Verify is one-shot (second use of same token returns `verify=error&reason=not_found`)
- Enumeration safety (already-verified email returns the same response shape)
- 400 validation errors for bad email / short password

Note: the test reads `verification_tokens` directly from the DB — this is fine for E2E because we don't depend on actually parsing the inbox. The email channel is incidental to the protocol.

## Rollback

If Resend is misbehaving and you need to disable transactional email
temporarily without breaking the app:

1. Remove `RESEND_API_KEY` from Railway env vars and redeploy.
2. `sendTemplate()` will throw on every call. Caller catches and logs
   per the failure-mode docs (`docs/email-templates.md`).
3. Signup endpoints will return 500 on the email-sending step.

There's no "soft mute" for transactional email — by design. If you
need to keep signups working during a Resend outage, the right move is
a temporary feature flag at the call site, not config-level muting.
