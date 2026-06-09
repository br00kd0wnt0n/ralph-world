# /join-ralph signup flow

Date: 2026-06-09
Commit: `3023279`

## What changed

`/join-ralph` was a static 4-slide carousel placeholder. The real signup
journey lived in `/login` (credentials form + Google OAuth) and was also
duplicated by `SubscribeModal` which triggered OAuth directly. There was
no single URL for the signup journey.

This change makes `/join-ralph` the canonical place to sign up. The
4-slide carousel skeleton was kept (animations, planet background, layout),
but every slide's content is now real, wired up to the existing
`signupAction` server action and Auth.js Google provider.

## Step model

The flow has four steps, persisted in the URL as `?step=1..4&tier=free|paid`:

| Step | Purpose | Key UI |
|------|---------|--------|
| 1 | Tier picker | "JOIN RALPH" SVG title + two tier blocks (free / paid). Each tier CTA advances to step 2 with `?tier=...` set. |
| 2 | Auth method | Google primary, email secondary. Google → OAuth (callbackUrl is tier-aware). Email → advances to step 3. |
| 3 | Complete account | Email shown read-only. First name + last name + password. Submits to `signupAction`. On success, auto-advances to step 4. |
| 4 | Verify your email | Confirmation copy + "Send a new verify link" CTA. User clicks the link in their inbox → `/api/auth/verify-email` → `/login?verify=ok`. |

Slides 2/3/4 also have a `< Back` link in the top-left, styled identically
to the shop product page back button (ralph-pink, Gooper Trial 600/18).

## State split

- **URL**: `step` and `tier` only. Persisted across reloads, back/forward
  works, deep-linkable.
- **React state**: `email`, `firstName`, `lastName`, `password`. Held in
  the client so they never appear in the URL or browser history.

A hard refresh on step 3 or 4 with empty `email` bounces the user back to
step 2 (handled by a small effect in `JoinRalphClient`). The trade-off is
deliberate — emails shouldn't be in URLs and we'd rather lose the partial
form than expose them.

## Wiring

- **Email path** calls `signupAction` from `app/login/actions.ts` directly
  via `useActionState`. No new endpoint needed. On `result.ok` we advance
  via `router.push`.
- **Google path** calls `signIn('google', { callbackUrl })` from
  `next-auth/react`. `callbackUrl` is `/account` for free tier and
  `/account?upgrade=paid` for paid tier — the existing `/account?upgrade`
  flow takes the user into Stripe checkout.
- **Resend verification** on step 4 currently re-POSTs to
  `/api/auth/signup` with a placeholder password (the route is
  enumeration-safe and will re-issue the email if the account already
  exists). A dedicated `/api/auth/resend-verification` endpoint would be
  cleaner — see "Follow-ups" below.

## SubscribeModal

Kept as a lightweight upsell shortcut. Its free + paid tier buttons
no longer call `signIn` directly. Instead they `router.push` to:

```
/join-ralph?step=2&tier=free
/join-ralph?step=2&tier=paid
```

The `returnTo` prop is still accepted and is now threaded through as a
`?returnTo=...` query param on the navigation. The `/join-ralph` flow
doesn't consume it yet — wiring it through Google's `callbackUrl` and
the verify-email link is a follow-up.

The modal still appears in:

- Magazine article gate ("Sign up to read" / "Upgrade to paid")
- Mobile menu "Sign up"
- Anywhere else `subscribeOpen` state is toggled

The nav's "Subscribe to Ralph" link is now meaningful — it points to
`/join-ralph` (the canonical flow) rather than the old placeholder.

## Styling

All slide CTAs (slide 1 free/paid tier buttons, slide 2 Continue, slide 3
Continue, slide 4 Resend) use the shared `<Button>` component from
`components/ui/Button.tsx`: white background, black text, black 2px
border, black drop-shadow at `top: 4, left: 4`, Gooper Trial 600/16,
hover press effect via `.btn-press`. Matches the planet panel buttons
used across the rest of the site.

The Google button on slide 2 is custom (full-width + Google logo SVG)
since the shared Button has a fixed min-width and no icon slot.

Typography on slide 1:

- "Experience pop culture…" / "Prefer your culture…" headings:
  Gooper Trial 600, 22px / 100% / 0 letter-spacing
- Body copy: Roboto 600, 16px / 28px / 0 letter-spacing

## Layout

- `<section>` sets `minHeight: calc(100svh - 200px)` so the planet
  content area reaches the footer on tall viewports.
- Slide motion wrapper has `pb-6` so button shadows (4px offset) clear
  the bottom of the AnimatePresence container.
- Title SVG `text-join-ralph.svg` is `max-width: 250px`, centred in the
  left column with `block mx-auto`.

## Follow-ups

- Wire `returnTo` end-to-end so signup from the magazine gate brings
  the user back to the article. Needs:
  - Google `callbackUrl` to include `returnTo` (after `/account` or
    `/account?upgrade=paid` resolves)
  - `signupAction` to accept and persist a `returnTo` that the
    verify-email redirect can pick up
- Replace placeholder character/magazine-cover boxes with the final
  illustrations
- Add a dedicated `/api/auth/resend-verification` endpoint so the slide 4
  resend button doesn't go through `/api/auth/signup` with a placeholder
  password
- Consider whether `/login?mode=signup` should redirect to `/join-ralph`
  to consolidate on a single signup URL
