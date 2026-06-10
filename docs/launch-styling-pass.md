# Launch Styling Pass — Legal, Footer, Join Ralph, Account

A pre-launch styling pass that unifies several pages around the brand
"document sheet" look: solid white surfaces on the dark canvas, Gooper Trial
titles, semibold Roboto body copy, black text, and ralph-pink pills/CTAs.

---

## 1. Footer legals bar (`components/layout/Footer.tsx`)

The dark footer's bottom strip (Terms · Privacy · Cookies · Cookie preferences
+ copyright) was a centered column. Now:

- `FooterLegalLinks` is a **`justify-between` row** — legal links left, copyright
  right — that stacks centered on mobile (`flex-col` → `sm:flex-row`).
- Added a **`variant`** prop (`'dark' | 'light'`):
  - **dark** footer → muted-white text (`text-white/70` links, `text-white/60`
    copyright) since it sits on black.
  - **light** footer → keeps the theme muted tokens (white text would be
    invisible on the light surface).

---

## 2. Legal pages (`/legal/terms`, `/privacy`, `/cookies`)

### Layout (`app/legal/layout.tsx`)
- Flipped from light-on-dark to a **solid white "document" sheet**
  (`bg-white text-black rounded-2xl shadow-xl`, centered) on the dark canvas.
- Dropped `prose-invert` → default dark-on-light `prose`; table borders and nav
  retoned to subtle black; links/code stay ralph-pink.

### Tab nav (`app/legal/LegalNav.tsx` — new)
- Extracted the nav into a **client component** so it can read the route via
  `usePathname` for an **active state**.
- **Pink-pill tabs**: active tab is a solid `bg-ralph-pink` pill with white text
  (+ `aria-current="page"`); inactive tabs are `text-black/70` with a subtle grey
  hover pill.

### Titles + spacing (`app/globals.css` → `.legal-prose`)
- All legal headings use the **Gooper title face** via a real CSS rule
  (`.legal-prose :is(h1,h2,h3,h4)`): Gooper Trial 600, 22px, line-height 100%,
  0 letter-spacing, black.
  - *Why CSS, not Tailwind:* the equivalent `prose-headings:[font-family:…]`
    arbitrary class silently fails to compile (commas/parens in the value), which
    dropped the font back to default. Plain CSS (`'Gooper Trial'` fallback) is
    reliable.
- Added breathing room: ~2.25rem above section titles, ~1.15rem between
  paragraphs/lists/tables, list-item spacing.

### Pages (`privacy/page.tsx`, `terms/page.tsx`)
- Fixed the "Last updated" lines that were `text-white/60` (invisible on white)
  → `text-black/60`.

---

## 3. Join Ralph signup carousel (`components/join-ralph/JoinRalphClient.tsx`)

A 4-slide flow. Shared helpers added at module scope:

- **`fieldClass` / `fieldStyle`** — grey-fill inputs, 8px radius, black Gooper
  600/16, pink focus ring. Used by Slides 2 & 3.
- **`bodyCopyStyle`** — Roboto 600, 13px / 23px, black, centered.
- **`ShadowButton`** — full-width skeuomorphic shadow button (offset black
  shadow + black rim, Gooper face, `btn-press` hover/active), accepts an icon or
  text. Used by the Google button and the Slide 3 submit.

### Slide 1
- Astronaut placeholder → **`join-ralph-painter.svg`** (153px), nudged
  `translate(20px, -100px)`.

### Slide 2 (Google / email)
- Form **centered**, capped at **361px**.
- Astronaut → **`join-raph-astronaut.svg`** (note misspelled filename — "raph"),
  182px, absolutely positioned to the right of the form.
- **Google** button → `ShadowButton` (with the Google icon).
- **Continue** → full-width outline button: 2px `#00000066` border, transparent
  bg, Gooper 600/16.
- **"or"** divider → lines removed; centered `or` in black Gooper 600/16.
- **Email input** → `fieldClass`/`fieldStyle`.
- **Legals line** → Roboto 600, 12px, line-height 100%, centered, black, capped
  at 80% width; Terms/Privacy links weight 800.

### Slide 3 (complete account)
- Form **centered at 361px**; character → **`join-ralph-eyes.svg`** (120px),
  right of the form.
- Inputs use `fieldClass`/`fieldStyle`; **double gap** (`mt-6`) between the name
  fields and the password block.
- Email line: Roboto 600, 13px / 33px, black, centered.
- "Send me the Ralph newsletter…" copy → black.
- **Continue** (submit) → full-width `ShadowButton` (primary CTA).

### Slide 4 (verify email)
- Centered column at **620px** (wider than 2 & 3); body copy uses
  `bodyCopyStyle`.
- Character → **`join-ralph-wave.svg`** (120px), to the **left of the title**,
  pushed up (`translateY(calc(-50% - 40px))`).
- **overflow trade-off:** the slides container keeps `overflow-hidden` (required
  for the horizontal slide transitions), so 100px of the top offset was moved
  *inside* it as padding (outer content `paddingTop` 200 → 100; slides container
  gains `paddingTop: 100`) to give slide characters headroom without clipping.

### Preview mode
- `?preview=1` skips the "needs form data" guard and seeds placeholder
  name/email so Slides 3 & 4 can be styled without completing the flow
  (e.g. `/join-ralph?step=4&preview=1`). Dev/design aid; param-gated, so the real
  flow is unaffected. **Remove or keep before launch as preferred.**

---

## 4. Account page (`app/account/page.tsx` + `components/account/*`)

Restyled to match the legal sheet aesthetic.

### Page
- Content on a **solid white sheet** (rounded, shadow); display name + section
  titles in **Gooper Trial 600**, black; **body copy black + semibold**.
- `Section` is now a **divider-separated block** (no dark cards) with a Gooper
  title (dropped the `tone` prop).
- **Tier badge** → pink pill (`paid` = solid ralph-pink, `free` = teal,
  `guest` = grey); "payment failed" → red pill.
- Buttons: Upgrade = solid pink pill; Manage subscription / Sign out = outline
  pills (2px black/30), all Gooper.

### Child components
- **`PrivacyControls`** — black labels, semibold descriptions, pink toggle,
  outline "Download" pill, and a light danger zone (red-600 text, red-50 bg).
- **`AccountPreferences`** — black labels, **pink-pill active state** for
  theme/language, semibold.
- **`SignOutButton`** — outline pill in Gooper.
- All dark-theme tokens (`text-primary/secondary/muted`, `border-border`,
  `text-red-400`) converted to black/white-legible equivalents.

---

## Files changed

| File | Change |
| ---- | ------ |
| `components/layout/Footer.tsx` | Legals bar → justify-between row; muted-white via `variant` prop |
| `app/legal/layout.tsx` | White sheet; default prose; uses `LegalNav` |
| `app/legal/LegalNav.tsx` | **New** — pink-pill tab nav with active state |
| `app/legal/privacy/page.tsx`, `terms/page.tsx` | "Last updated" → black |
| `app/globals.css` | `.legal-prose` — Gooper titles + spacing |
| `components/join-ralph/JoinRalphClient.tsx` | Slides 1–4 styling, `ShadowButton`, shared field/body styles, characters, preview mode |
| `app/account/page.tsx` | White-sheet restyle; Gooper titles; pink pills |
| `components/account/PrivacyControls.tsx` | White-legible restyle |
| `components/account/AccountPreferences.tsx` | White-legible restyle; pink pills |
| `components/account/SignOutButton.tsx` | Outline pill |

### New assets used
`join-ralph-painter.svg`, `join-raph-astronaut.svg`, `join-ralph-eyes.svg`,
`join-ralph-wave.svg`.
