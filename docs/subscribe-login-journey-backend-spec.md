# Backend spec — unified Subscribe / Login journey

**Owner of this work:** backend (Brook) — the front-end reorder is handled separately by Josh.
**Status:** spec for review. Nothing built yet.
**Date:** 2026-07-22

---

## 1. What's changing (context)

The `/join-ralph` ("Subscribe to Ralph") page is being reworked into a single
**email-first auth + subscribe** journey. Instead of choosing a tier first, the
user lands on a login-or-signup step, and the tier choice moves to the **end**
of the signup path.

New slide order:

1. **Landing** — "Log in or sign up to Ralph.World"
   - **Continue with Google**, _or_
   - enter **email** → Continue
2. **Branch on the email** (this is the piece that needs backend):
   - **Account already exists** → **"Welcome back, [first name]"** + password → Continue (log in)
   - **No account** → **"Hey, there…"** signup form (first name, last name, password, newsletter opt-in) → Continue
3. **After a _new_ signup** → **tier selection** slide (Digital Ralph £FREE / Physical Ralph £3/mo)

Google and existing-user login both bypass the tier-selection-first model.

---

## 2. The one hard requirement: an "email exists?" endpoint

The front end cannot decide between the login and signup slides on its own.
There is currently **no** endpoint that, given an email, reports whether an
account exists — and that is deliberate: `signup` and `reset-password` are both
written to **not reveal account existence** (anti-enumeration). This flow
requires exposing that answer, so it needs a new route.

### Proposed endpoint

```
POST /api/auth/check-email
Content-Type: application/json

Request:  { "email": string }

Response 200: {
  "exists":     boolean,   // a users row matches this email
  "hasPassword": boolean,  // users.passwordHash is set (can log in with password)
  "usesGoogle":  boolean,  // an accounts row exists with provider = 'google'
  "verified":    boolean   // users.emailVerified is set
}
```

**Why each field is needed by the front end:**

| Field | Front-end uses it to… |
|---|---|
| `exists` | choose the **login** slide vs the **signup** slide |
| `hasPassword` | show the **password** field (true) vs steer to Google (false) |
| `usesGoogle` | for a Google-only account (exists, no password), show **"You signed up with Google — continue with Google"** instead of a password box they can't use |
| `verified` | if the account exists but is unverified, show a **"resend verification email"** state instead of a login that will always fail |

### Implementation notes / reuse

- The lookup logic already exists inside `lib/auth/signup.ts` (`signupWithPassword`,
  ~lines 61–93) and the Credentials `authorize()` in `lib/auth.ts` (~lines 40–60).
  This endpoint just needs to surface the same query results as a standalone read.
- `usesGoogle` requires a join to the Auth.js `accounts` table on
  `provider = 'google'` (schema: `lib/db/schema.ts` `accounts`, ~lines 28–48).
  No current query does this join.
- **Normalise** the email (trim + lowercase) before lookup, and validate format;
  return `400 { ok: false, error: "invalid_email" }` on garbage input.

### Security / privacy — please confirm the trade-off

Exposing this **reverses the current enumeration-resistant stance** — it lets a
caller learn which emails are registered. This is a standard trade-off for
email-first auth (Google, Slack, etc. all do it), but it should be a conscious
decision. Requested mitigations:

- **Rate-limit** per IP (helpers already exist: `lib/rate-limit.ts` — see usage
  in `app/api/auth/signup/route.ts` and `set-password/route.ts`). Suggest a
  tight window (e.g. N per minute per IP) and return `429` when tripped.
- Keep the response minimal (booleans only — never names, IDs, or hashes).
- Consider logging repeated misses per IP for abuse monitoring.

---

## 3. Decision needed: signup → tier selection vs. email verification

Signup today **does not sign the user in** — `signupWithPassword` creates the
user as **unverified**, emails a verification link, and the current
post-signup slide is *"check your inbox"*. Credentials login throws
`EmailNotVerified` until they verify (`lib/auth.ts` ~line 59).

The new flow instead ends signup on the **tier** slide. So we need to decide how
tier selection behaves for a brand-new, **unverified** account:

- **Digital Ralph (£FREE):** likely fine to complete immediately — account is
  created (guest/free tier), and the "verify your email to unlock" message
  carries on as today. No checkout involved.
- **Physical Ralph (£3/mo):** this starts **Stripe checkout**, which currently
  requires an **authenticated session** (`/api/checkout/subscribe`,
  `app/account/actions.ts`). An unverified user has no session. So one of:
  1. **Verify-then-checkout:** create the account, send verification, and
     **carry the paid intent** so that after they verify + land signed-in, they
     go straight to checkout (mirrors the existing Google path, which uses
     `callbackUrl=/account?upgrade=paid`). Cleanest / most secure.
  2. **Allow limited pre-verification session** to start checkout before
     verifying. Faster UX but a policy change — needs Brook's sign-off on
     whether unverified accounts may transact.

**Question for backend:** which of these do we want, and is there any objection
to option 1 carrying a "pending paid" intent through the verification callback?

> Note: the **Google** signup path already handles paid intent cleanly
> (`signIn('google', { callbackUrl: '/account?upgrade=paid' })`) because Google
> returns a verified, signed-in session immediately. Only the **email** signup
> path has the verification gap.

---

## 4. What the front end will handle (no backend needed)

For clarity on the boundary — these reuse existing endpoints/actions, no new
backend:

- Landing slide UI + Google button (`signIn('google', { callbackUrl })`).
- Password **login** slide → existing `signinWithCredentials`
  (`app/login/actions.ts`) incl. its `EmailNotVerified` / bad-credentials error
  surfacing.
- **Signup** form slide → existing `signupAction` / `signupWithPassword`
  (email, password, `name` = first + last concatenated, `marketingOptIn`).
- **Tier** slide UI + routing to the free/paid outcomes agreed in §3.
- All slide transitions and state.

---

## 5. Summary — backend to-do list

1. **New:** `POST /api/auth/check-email` → `{ exists, hasPassword, usesGoogle, verified }`,
   email-normalised, validated, **rate-limited**, minimal response. (§2)
2. **Confirm:** the enumeration trade-off is acceptable, and the rate-limit
   shape. (§2)
3. **Decide + implement:** the unverified-signup → tier behaviour, especially
   **paid checkout for a not-yet-verified email account** — recommend the
   "verify-then-checkout with carried paid intent" option. (§3)

Everything else in the new journey is front-end and does not block on backend
beyond item 1 (and item 3 for the paid path).
