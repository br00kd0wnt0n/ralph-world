# Ralph.World Front-End Test Plan

**Audience:** anyone testing the site — no prior context assumed.
**Time to complete:** ~90 minutes end-to-end.
**Last updated:** 6 July 2026.

## Before you start

### 1. What you'll need

- **Two browsers or one browser with two profiles** — you'll swap between "signed out" and "signed in" a lot. Chrome + Firefox works, or Chrome + Chrome Incognito.
- **A test email inbox** you can check quickly (Gmail is fine).
- **A phone** in addition to your computer — some tests require mobile.
- **A stable connection** — the TV live feed and video embeds need it.

### 2. Test accounts

Ask an admin for one of each:

| Role | What it can do |
|---|---|
| **Guest** | No account — just visit as a first-time visitor |
| **Free member** | Signed-up account, no paid subscription |
| **Paid subscriber** | Full access to premium articles + magazine |
| **Admin** | Everything above + access to the CMS (not covered here) |

Testing as a guest requires no login — just an Incognito/Private window.

### 3. How to report a bug

For each bug, capture:

- **Where** — the URL / page name
- **What you did** — the steps that led to the problem
- **What you expected** to happen
- **What actually happened** — include a screenshot or short screen recording
- **Which browser / device / logged-in state** you were in
- **Which section of this plan** it came from (e.g. "§4 Magazine, tile click")

Slack the bug into the team's usual channel, or open a GitHub issue if you have access. Batch multiple bugs into one message per section so we can triage in order.

### 4. Environments

- **Production**: `https://ralph.world` (or the Railway URL if DNS hasn't cut over yet — ask an admin).
- **Test carefully** — any RSVP, subscribe, or contact-form submission on production is real. Cancel your test subscription within the same session if you don't intend to keep it.

---

## §1. Homepage

**URL:** `/`

### Desktop

- [ ] The homepage loads without any obvious errors, missing images, or console warnings visible to the naked eye.
- [ ] Hero character animates in.
- [ ] Scroll down. As each planet section (Magazine, TV, Events, Lab, Shop) enters view, its module card opens and any right-column preview animates in.
- [ ] **TV panel** — the right-column tile shows a **live moving video** (the Ralph TV feed), not a static image. It should be muted. If the feed isn't available it falls back to a small "RALPH TV — Tune in on /tv" plaque.
- [ ] Every module's "Watch now / Read now / See more" CTA takes you to the right section.
- [ ] The floating character in the corner reacts to scroll.

### Mobile

- [ ] Homepage renders as a stacked list of section cards.
- [ ] Each card scrolls horizontally where content exists (magazine articles, TV shows, etc).
- [ ] The "Watch now / Read now" CTAs work.

---

## §2. Global navigation & footer

- [ ] The top nav is visible on every non-legal page.
- [ ] Every link in the nav (Magazine, TV, Events, Lab, Shop, Play, About) opens the intended section.
- [ ] The Ralph circle logo returns you to the homepage.
- [ ] The language / basket / theme controls in the header are clickable and don't throw errors.
- [ ] Footer: every link (Privacy, Terms, Cookies, social) opens the right page or the correct external URL.
- [ ] Footer social icons on hover: background turns pink, icon flips to black.
- [ ] **Cookie banner** — appears on first visit in an Incognito window. Accept / reject / customise all work; the banner disappears and doesn't reappear on refresh.

---

## §3. Magazine

**URL:** `/magazine`

- [ ] Page loads with a hero, a Cover Story panel, and a grid of article tiles.
- [ ] Cover Story shows the current cover article. Clicking it opens the article overlay.
- [ ] Article grid tiles animate on hover ("explode" outward).
- [ ] Category tabs (Comedy / Music / Fun etc.) switch which articles render in the grid.
- [ ] **Article overlay** — click any article tile:
  - The overlay slides in over the page.
  - Title, byline, lead image, subtitle, intro all render.
  - **Intro bold text is visibly bolder** than the surrounding text.
  - Content blocks (text, images, video, carousels, quotes) all render.
  - **Shop callout starburst** — if the article has one set, a pink starburst floats at a slight angle in the header area. Refresh a couple of times — its position should shift slightly on each reload.
  - Tag pills + share buttons sit at the **bottom** of the article (after the copy), not the top.
  - Close button (top-right X) dismisses the overlay.
- [ ] **Access-gated article** — as a Guest or Free member, open a subscribers-only article:
  - The intro is visible.
  - The body cuts off with a "Subscribe to access" pink pill.
  - Clicking the pill opens the subscribe modal.
- [ ] Refresh a specific article's URL (`/magazine/some-slug`) directly — it should redirect back to `/magazine?read=some-slug` and open the overlay automatically.

---

## §4. Ralph TV

**URL:** `/tv`

### Player

- [ ] Big TV set graphic renders.
- [ ] Live feed appears on the screen inside the TV set (may take 2–3 seconds — a "TUNING IN…" placeholder is fine during that time).
- [ ] Audio is muted by default with a "🔇 Tap to unmute" pill visible.
- [ ] Tap / click the pill or the screen — audio comes on, pill disappears.
- [ ] Volume slider changes volume.
- [ ] Pause + play works.
- [ ] If the live feed is offline, the screen shows a Ralph-pink "OFFLINE — Tune in later" plaque.

### Show info overlay

- [ ] Click the "SHOW INFO" / RALPHFAX button below the TV.
- [ ] Overlay slides in. It shows: current show name, start-end time, description (blurb), and a playback progress bar.
- [ ] **The times are in your local timezone**, followed by your timezone label (e.g. "GMT+1"). If you're not in the UK, they should NOT match what a UK viewer would see.
- [ ] The playback bar advances over time. The floating "now" pill tracks the current progress.

### Schedule overlay

- [ ] Click the "SCHEDULE" / RALPHFAX 101 button.
- [ ] Full day's schedule appears, "ON NOW" highlighted in pink.
- [ ] **Times shown in your timezone**, with a "Times shown in GMT+X" hint next to "ON NOW".
- [ ] Scroll works when there are more items than fit.

### Freeview gate

- [ ] As a **Guest** — the TV may show a countdown or "sign up to keep watching" gate after the freeview window. Depends on current admin setting.

---

## §5. Lab

**URL:** `/lab`

- [ ] Hero renders with the current lab strapline.
- [ ] Below the hero: a 2-column grid of experiment tiles. (1 column on mobile.)
- [ ] Each tile shows: lead image, coloured tag pills, eyebrow (subtitle), headline, "Posted by" line, short text teaser, pink "Read more →" affordance.
- [ ] **Tag colours** are varied — pink, yellow, blue, green, orange, or purple. Text stays readable on every colour.
- [ ] Hover a tile — it lifts slightly with a hard drop-shadow.
- [ ] Click a tile — a modal overlay opens with the full experiment:
  - Lead image at the top
  - All tags + subtitle + headline + posted-by
  - Rich intro paragraph
  - Any inline content blocks (images, videos, extra text)
  - A pink "Launch project →" pill CTA (if the item has an external URL)
- [ ] Overlay: click the X, click the scrim (outside the modal), or press Esc — all dismiss.
- [ ] While the overlay is open, the page behind doesn't scroll.
- [ ] Keyboard focus stays inside the modal (Tab cycles within, doesn't escape to page nav).

---

## §6. Events

**URL:** `/events`

- [ ] Hero + intro renders.
- [ ] "Alien hands" characters wave into view from the sides of the screen. Each hand represents an upcoming event.
- [ ] **Each hand's panel background matches its event's accent colour** — you'll see teal, pink, yellow, green, orange, purple, sunshine, cream, and sky (depending on which events are scheduled).
- [ ] **Text on every panel is legible** — no bright brand purple that makes black text unreadable.
- [ ] Click a hand — its panel slides forward, other hands recede.
- [ ] Panel shows: event name, date, location, description, and a "Show Me More" CTA.
- [ ] "Show Me More" expands into a full-size flyout with the RSVP / ticket buttons.
- [ ] RSVP button:
  - **Free event** — clicking triggers an RSVP flow. As a signed-out user, you'll be prompted to sign in first.
  - **Paid / ticketed event** — button says something like "Get tickets" and opens the external ticket URL in a new tab.
- [ ] "Past Events" grid renders below the main hands, if any exist.

---

## §7. Shop

**URL:** `/shop`

- [ ] Product grid renders — magazines + merch.
- [ ] Each tile: image, title, price, "Add to bag" button.
- [ ] Basket icon in the header updates when items are added.
- [ ] "View basket" opens a basket / checkout flow (Shopify-hosted).

*(Shop is a Shopify-backed flow — the store handles checkout externally. Verify the handoff works but don't run test purchases without an admin's go-ahead.)*

---

## §8. Play (agency page)

**URL:** `/play`

- [ ] Hero + intro renders.
- [ ] Scrolls smoothly.
- [ ] Any "Work with us" / "Case studies" content renders.
- [ ] All external links open.

---

## §9. Account & subscription

### Sign up as a Free member

- [ ] Visit `/login` — sign-up form appears (email + password).
- [ ] Register with a fresh email address.
- [ ] Verification email arrives from `hello@send.ralph.world` within a minute.
- [ ] Verification email: pink "RALPH" header, branded card, "Verify email" pink pill.
- [ ] Click the link — you're taken to a "verified" page or straight into your account.
- [ ] `/account` page shows your email, member status (Free), and links to update your profile.
- [ ] Log out. Log back in with the same credentials — succeeds.

### Google sign-in (if available)

- [ ] "Continue with Google" button on `/login` — opens the Google OAuth popup. Complete it.
- [ ] Returned to `/account` as a Free member.

### Subscribe (paid)

**⚠️ Real payment flow.** Only run if you have a test card, or use a real card and cancel within the session.

- [ ] From `/account` or the "Subscribe" CTA anywhere on the site — Stripe Checkout opens.
- [ ] Complete checkout with a UK card address.
- [ ] Redirected back to `/account` showing "Paid" member status.
- [ ] `/account` shows next billing date and cancel controls.
- [ ] Receipt email arrives — branded (pink header, Ralph card).
- [ ] Open a **subscribers-only article** — full body renders, no paywall pill.

### Cancel subscription (schedule)

- [ ] From `/account`, click "Cancel subscription".
- [ ] Confirmation modal appears.
- [ ] Confirm — page updates showing "Subscription scheduled to cancel on [date]".
- [ ] **Cancellation-scheduled email arrives within a minute:**
  - Subject: "Cancellation scheduled — Ralph.world"
  - Body: *"You've scheduled your Ralph subscription to cancel. You'll keep full access until [date]."*
  - Contains a "Reactivate subscription" pink pill CTA.
- [ ] Click "Reactivate" from `/account` — subscription resumes, no additional charges.

### Cancel-at-period-end email (end of period)

*This only tests naturally when the billing period ends. If you want to verify the email shape without waiting, ask an admin to send a preview.*

- [ ] When the subscription actually ends, a second email arrives:
  - Subject: "Your Ralph subscription has ended"
  - Body: *"Your Ralph subscription ended on [date]. Your account has moved to the free tier."*
- [ ] Log in — `/account` now shows "Free" member status.

---

## §10. Legal pages

- [ ] `/legal/privacy` — Privacy Policy renders with "Last updated: 01 July 2026". Table of data collected renders. No leftover "[LEGAL: …]" placeholders anywhere. Cookies link works.
- [ ] `/legal/terms` — Terms of Service renders with same date. All numbered sections present (1–14). No visible typos in the numbered headings.
- [ ] `/legal/cookies` — Cookies page renders. Manage-preferences link opens the cookie banner UI.
- [ ] Navigation between these three via the top of the legal doc "sheet" works.
- [ ] Footer links to all three work from any page.

---

## §11. Japanese contact page

**URL:** `/jp/contact`

- [ ] Page renders entirely in Japanese (お気軽にご相談ください headline, etc).
- [ ] **Q1 — どんなことでお悩みですか？** — 6 option cells. Click **multiple** — each turns pink when selected. Click again — deselects.
- [ ] **Q2 — プロジェクトの規模感を教えてください** — 4 option cells with the same multi-select behaviour.
- [ ] Contact fields: name, company (optional), email, message.
- [ ] Try to submit without selecting anything — get a Japanese error message.
- [ ] Try to submit with an invalid email — get a Japanese error.
- [ ] Fill everything in with a real email you can check and click **相談してみる →**.
- [ ] Success screen appears in Japanese thanking you and stating a 2-business-day response.
- [ ] The Tokyo team (yuki.koizumi@ralphandco.com and chris@ralph.world) each receive a notification email within a minute. (Ask them to confirm — you won't see this yourself.)
- [ ] The **submitter does NOT receive a confirmation email** — this is intentional; only the on-screen thank-you is shown.

---

## §12. Broken / edge-case URLs

- [ ] Visit a made-up URL like `/lab/does-not-exist` or `/magazine/does-not-exist` — a clean 404 renders, not a stack trace or blank page.
- [ ] Visit `/jp` — should redirect to `/jp/contact`.
- [ ] Direct-load a subscribers-only article as a Guest via `/magazine?read=<slug>` — the overlay opens, intro visible, body gated with the "Subscribe to access" pill.

---

## §13. Mobile-specific spot checks

Repeat on a phone (or Chrome DevTools device emulation) the following:

- [ ] Homepage — vertical stack of cards.
- [ ] Magazine article overlay — content stacks vertically, share buttons at the bottom.
- [ ] Ralph TV — video plays, overlay overlays scale correctly, no horizontal scroll.
- [ ] Lab overlay — modal scrolls vertically inside itself. Close button reachable.
- [ ] Events "hands" — small screens should reveal a simplified layout (arms enter from bottom).
- [ ] Sign-up / login forms — text inputs correctly sized, keyboard doesn't cover them.
- [ ] JP contact form — Japanese renders correctly with legible font sizing.

---

## §14. Cross-cutting things to keep an eye on

Watch for any of these as you work through the plan — flag as bugs when spotted:

- **Layout shift** — content jumping around after page load.
- **Unstyled flash** — briefly seeing raw text before styles apply.
- **Broken images** — a torn-page icon or blank space where an image should be.
- **Console errors** — open DevTools' Console (F12); anything red is a bug worth reporting.
- **Wrong colours** — text you can't read against its background, or a section using the wrong brand colour.
- **Untranslated placeholder text** — anything that looks like `[LEGAL: something]` or `Lorem ipsum` on a live page.
- **Inconsistent timezones** — a time somewhere on the site that doesn't match the timezone label right next to it.
- **Copy typos** — misspellings, weird punctuation, mid-sentence line breaks.
- **404 links** — any link that dumps you on a "Page not found".
- **Autoplay audio** — no page should ever play sound without your interaction, including the homepage TV teaser.

---

## §15. When you're done

- Bundle your bug reports into a single Slack message per section (or one issue tracker card per bug — team's preference).
- Note anything you tried that this plan didn't cover but that you think should have been.
- Note if any step here was ambiguous or if the terminology tripped you up — this plan should evolve with feedback.

Thanks for testing 💛
