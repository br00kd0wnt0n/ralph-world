# Ralph.World — Frontend Handover (for Josh)

Welcome. The plumbing is done: scaffold, routing, auth, database, CMS integration, Shopify hooks, Broadcaster wiring. Every piece of data is flowing. What's in the browser today is placeholder-quality — that's your canvas.

**Your scope:** full visual design pass, all animations, illustration integration, responsive polish. You have a free hand across everything visual.

## Getting started

```bash
git clone https://github.com/br00kd0wnt0n/ralph-world.git
cd ralph-world
npm install
cp .env.example .env.local   # ask Brook for values
npm run dev                  # http://localhost:3000
```

**Stack**: Next.js 16 App Router, TypeScript strict, Tailwind v4, Framer Motion, hls.js.
Deployed via Railway from `main` — every push triggers a rebuild, preview live within ~60s.

## Where you work

| You own | Brook owns (don't edit without asking) |
|---|---|
| All of `components/` — styling, layout, animation, structure | `app/api/*` — API routes |
| `app/globals.css`, Tailwind tokens, brand colours, theme system | `lib/db/`, `lib/auth.ts`, `lib/shopify/*`, `lib/broadcaster/*`, `lib/data/*` — data + backend glue |
| `lib/animation/*.ts` — all Framer Motion variants | `middleware.ts`, `context/` (except visual tweaks) |
| `public/illustrations/` — Duffy's SVG drops | Server Actions in `lib/actions/*` (CMS only) |
| Responsive breakpoints, mobile layouts | Env vars, Railway config |
| Typography, microcopy polish | DB schema |

Any *feature* change that touches data flow or API, loop me in. Anything purely visual/animation is your call — push straight to `main`.

## The codebase at a glance

```
app/                # routes. Each page is mostly a data-fetch + render of a *Client component
components/
  layout/           # Nav, Footer, Starfield, SubscribeModal — shared across all pages
  home/             # Hero, PlanetSection, MobileHome, FloatingCharacter, ScrollIndicator
  magazine/         # ArticleGrid (claw mechanic here), ArticleOverlay, BlockRenderer, CoverStory, CategoryTabs
  events/           # EventCreature, CrowdBackground, EventFlyout, PastEvents, EventsHero
  tv/               # TVSet (the retro frame), LivePlayer, Teletext overlays, SubscribeGate, TVControls
  shop/             # ProductCard, ProductOverlay, ShopClient
  lab/              # RalphOMatic (the lever/conveyor machine), LabGrid, LabHero
lib/
  animation/        # One file per section — every Framer variant lives here
  data/             # server-side fetchers (Brook's side; you read the types)
hooks/              # useParallax, useScrollReveal, useHls, useLiveStatus
public/
  ralph-logo.png       # pink circle "ralph world" logo
  ralph-wordmark.png   # "ralph" script
  illustrations/       # drop Duffy's SVGs here
```

Every complex component (PlanetSection, RalphOMatic, Magazine, TV, Events) has a `README.md` alongside it describing **animation intent** and **asset slots**. Read those first — they explain what the placeholders are meant to become.

## Animation conventions

- **All Framer Motion variants live in `lib/animation/*.ts`** — one file per section. Don't inline variants in components. If a section doesn't have the variant you need, add it there.
- Current files: `homepage.ts`, `magazine.ts`, `events.ts`, `tv.ts`, `lab.ts`
- Timings, easings, stagger delays — all in those files, clearly named

## Illustration slots

Every bespoke illustration is a placeholder today, and most complex components accept an `illustration?: React.ComponentType` prop. Drop in Duffy's SVG components as you get them.

Main slots:

- **Planets** (4x on homepage) — `components/home/PlanetSection/PlanetSection.tsx`, currently a circle with an accent-coloured border
- **Floating characters** between sections — `FloatingCharacter.tsx`
- **Event creatures** — `components/events/EventCreature.tsx`, per-event arm+wristband
- **Crowd scene** — `components/events/CrowdBackground.tsx`
- **TV set frame + flanking characters** — `components/tv/TVSet.tsx`
- **Ralph-O-Matic machine + conveyor** — `components/lab/RalphOMatic.tsx` (takes `machineIllustration` and `conveyorIllustration` props that receive a `state` prop for animation variants)
- **Footer arch characters, London globe** — `components/layout/Footer.tsx`
- **Subscribe modal characters, magazine covers, astronaut** — `components/layout/SubscribeModal.tsx`
- **Claw mechanic** for magazine cards — `components/magazine/` (spec'd but not visually implemented)
- **Reading character + "Got coin?" starburst** — `components/magazine/MagazineHero.tsx`

## Brand foundations

Brand colours exposed as Tailwind classes (defined in `app/globals.css`):

- `ralph-pink` `#FF2098` — primary accent, CTAs
- `ralph-orange` `#FF6B35` — Magazine section
- `ralph-teal` `#00C4B4` — Events
- `ralph-green` `#4CAF50` — Shop
- `ralph-yellow` `#FFE566` — Lab (requires dark text)
- `ralph-purple` `#7B2FBE` — secondary

Theme system lives in `context/ThemeContext.tsx`. MVP: `cosy-dynamics` (dark, labelled "Starfield") and `light`. Two more are scaffolded (`8-bit-nostalgia`, `1980s-fever-dream`) — empty CSS blocks ready for you to fill when designs land.

Type tokens are unset beyond a Playfair Display font var (`--font-display`) used for hand-drawn-style headings. Whole type system is yours to define.

## Working with real content

Content comes from the CMS (`cms.ralph.world`) — same Postgres database. Articles, events, lab items, TV VOD, homepage copy, global site copy all editable there. Changes propagate to the public site within ~60s or immediately via on-save revalidation.

- **Shopify** isn't live — shop shows 12 mock products from `lib/shopify/mock.ts` so you can build the visual pass. Buy flow is disabled in demo mode.
- **Broadcaster** is live at `broadcaster.ralph.world` — TV page plays automatically when someone's streaming.
- **All site copy** is editable in the CMS under Site Copy. Don't hardcode strings; use the `copy` prop pattern already wired up.

## Things to be careful about

- **TypeScript strict mode** — `npx next build` must pass before pushing. No `any` without a comment.
- **Server vs. client components**: components are server by default. Add `'use client'` only when you need state, effects, refs, or browser APIs. A client component can't import from `lib/db/*` or `lib/auth.ts`.
- **`useSearchParams`** needs a Suspense boundary. Wrap it in `<Suspense>` or you break static prerendering for the whole app.
- **Hover interactions** should check for touch devices (see `PlanetSection.tsx` for the `matchMedia('(hover: none)')` pattern). Don't let touch users get stuck on hover-only states.
- **HLS / `LivePlayer`** should not unmount when overlays open — overlays render on top at `z-10`. Breaking this forces the stream to re-tune.
- **`revalidatePath`** is Brook's domain — don't add calls to `revalidatePublicSite` from client code. If you think you need to invalidate cache, ping me.

## Questions

- **Animation / visual / illustration / type / responsive / microcopy** — your call, push to main.
- **Data shape, API, auth, CMS behaviour, deploy, env vars, anything breaking in prod** — ping Brook.

Push regularly, even WIP. Railway rebuilds fast, it's cheap to iterate live.

Welcome aboard.
