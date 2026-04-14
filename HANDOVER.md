# Ralph.World — Frontend Handover (for Josh)

Welcome. The scaffold, data layer, auth, routing, and CMS integration are done. Your job is to polish the visual / animation layer and drop in Duffy's illustrations. This page is everything you need.

## Getting started

```bash
git clone https://github.com/br00kd0wnt0n/ralph-world.git
cd ralph-world
npm install
cp .env.example .env.local   # ask Brook for values
npm run dev                  # http://localhost:3000
```

**Stack**: Next.js 16 App Router, TypeScript strict, Tailwind v4, Framer Motion, hls.js.
Deployed via Railway from `main`. Every push triggers a rebuild.

## Repo shape

```
app/                    # routes — pages and API
components/
  layout/               # Nav, Footer, modals (shared)
  home/                 # PlanetSection, Hero, MobileHome, FloatingCharacter, ScrollIndicator
  magazine/             # ArticleGrid, ArticleOverlay, BlockRenderer, CoverStory, CategoryTabs
  events/               # EventCreature, CrowdBackground, EventFlyout, EventsHero, PastEvents
  tv/                   # TVSet, LivePlayer, TeletextShowInfo/Schedule, SubscribeGate, TVControls
  shop/                 # ProductCard, ProductOverlay, ShopClient
  lab/                  # RalphOMatic, LabGrid, LabHero
lib/
  animation/            # ← YOU LIVE HERE. One file per section, all Framer variants.
  data/                 # server-side data fetchers (Brook)
  db/, shopify/, broadcaster/   # backend glue (Brook)
hooks/                  # useParallax, useScrollReveal, useHls, useLiveStatus
public/
  ralph-logo.png        # circle logo
  ralph-wordmark.png    # "ralph" script
  illustrations/        # drop Duffy's SVGs here as React components
```

## What's yours vs. what's mine

| You own | Brook owns |
|---|---|
| `components/**/*.tsx` (except `layout/Nav.tsx` and modals) | `lib/`, `app/api/`, `context/`, `middleware.ts` |
| `lib/animation/*.ts` — all Framer Motion variants | `lib/data/*.ts`, `lib/db/*.ts`, `lib/shopify/*.ts`, `lib/broadcaster/*.ts` |
| Tailwind config, `app/globals.css` | Auth, sessions, Server Actions |
| All SVG/illustration integration | Railway deploys, env vars |

Ask before touching my side. I'll ask before restyling yours.

## Animation conventions

Every section has a single animation config file in `lib/animation/`:

- `homepage.ts` — hero stagger, planet parallax factor, module card, floating char
- `magazine.ts` — claw mechanic variants, grid stagger, overlay
- `events.ts` — creature bob, flyout stages, parallax factor, past event reveal
- `tv.ts` — screen state transitions, static flicker, teletext header
- `lab.ts` — lever, lights, conveyor, bell jar, card reveal

**Always edit timings and easings in these files**, not inline in components. Variants are imported by name.

## Duffy asset slots

Every bespoke illustration is a placeholder today. Each component that expects Duffy's work takes an `illustration?: React.ComponentType` prop. Replace the placeholder by rendering that component.

| Where | Slot | Current placeholder |
|---|---|---|
| `components/home/PlanetSection/PlanetSection.tsx` | Planet illustration (4x — Magazine/Events/Shop/Lab) | Circle with border |
| `components/home/FloatingCharacter.tsx` | Characters between sections | Pink circle |
| `components/events/EventCreature.tsx` | Per-event wristband creature | Styled div with accent colour |
| `components/events/CrowdBackground.tsx` | Full crowd scene | Gradient rectangle |
| `components/events/EventsHero.tsx` | Planet / satellite / London globe decorative | Faded circles |
| `components/tv/TVSet.tsx` | Retro TV frame, flanking alien + robot characters | CSS bezel |
| `components/magazine/MagazineHero.tsx` | "Reading character" + "Got coin?" starburst | Boxes |
| `components/lab/RalphOMatic.tsx` | The machine + conveyor belt (props: `machineIllustration`, `conveyorIllustration`, receive `state`) | CSS placeholder with debug label |
| `components/layout/Footer.tsx` | Characters sitting on the pink arch + London globe | Coloured circles |
| `components/layout/SubscribeModal.tsx` | Characters on arch, astronaut, magazine covers | Boxes |

Each complex component has a `README.md` next to it describing animation intent and asset slots in plain English. **Read those first.**

## Brand colours

Defined as CSS variables in `app/globals.css`, exposed as Tailwind classes:

- `ralph-pink` `#FF2098` — primary brand accent
- `ralph-orange` `#FF6B35` — Magazine
- `ralph-teal` `#00C4B4` — Events
- `ralph-green` `#4CAF50` — Shop
- `ralph-yellow` `#FFE566` — Lab (uses dark text)
- `ralph-purple` `#7B2FBE` — secondary

Themes live in `context/ThemeContext.tsx`. MVP themes: `cosy-dynamics` (default dark, labelled "Starfield") and `light`. Two more are scaffolded for later.

## Running with real content

The CMS (`cms.ralph.world`) writes to the same Postgres, so you can log in, create articles / events / lab items, and see them appear. Content changes propagate within ~60s; the CMS also triggers immediate revalidation on save.

Shopify isn't connected — the shop uses mock products from `lib/shopify/mock.ts`.

Broadcaster is live — when someone's streaming via `broadcaster.ralph.world`, the TV page plays automatically.

## Things to be careful about

- **TypeScript strict**: no `any` without a comment. `npx next build` must pass before pushing.
- **Server vs. client**: a component is server by default. Add `'use client'` only when you need state, effects, or browser APIs. Don't import from `lib/db/**` or `lib/auth.ts` in a client component — the bundler will reject it.
- **`useSearchParams`** needs a Suspense boundary. If you add one, wrap it or it breaks static prerendering.
- **Hover logic** on sections: desktop-only. Use the pattern in `PlanetSection.tsx` that checks `matchMedia('(hover: none)')`.
- **HLS / `LivePlayer`**: do not unmount/remount when a user opens the Show Info or Schedule overlays. Overlays render on top; player stays mounted.

## Questions / escalation

Anything that isn't purely visual — auth flows, DB queries, API routes, deploy issues, CMS UX — ping me (Brook). I'll be quick.

Animation approvals, illustration integration, microcopy tone, responsive breakpoints — your call. Push to main, Railway auto-deploys, preview within a minute.

Welcome aboard.
