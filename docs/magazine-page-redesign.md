# Magazine Page Redesign — Branch: feat/page-transitions

## Overview

Redesign of the Magazine page introducing a decorative planet section with layered SVG backgrounds, Cover Story feature section, category filtering tabs, and a 6-article grid with hover effects.

---

## Page Structure

The Magazine page is composed of these sections from top to bottom:

| Section | Component | Max Width | Description |
|---|---|---|---|
| Intro | `SectionIntro` | 575px title | Page title using `text_fun_glossy_mag.svg` with intro copy |
| Planet Decoration | Inline in `MagazineClient` | 1380px min | Layered SVG background/foreground with "Cover Story" title |
| Cover Story | `CoverStory.tsx` | 1040px | Featured article with image, text, and CTA button |
| Category Tabs | `CategoryTabs.tsx` | 502px | Filter tabs with dashed separators |
| Article Grid | `ArticleGrid.tsx` | 1168px | 3×2 grid of article cards with hover effects |

---

## Planet Decoration Section

A 260px tall decorative section using layered SVG backgrounds that create depth. The "Cover Story" title sits within this section to avoid white gaps between the decoration and content.

### Layer Stack

| Layer | Asset | z-index | Notes |
|---|---|---|---|
| Background | `planet_background_magazine.svg` | z-0 | Below content |
| Title | `text_cover_story.svg` (265×76px) | z-20 | Positioned at bottom of section |
| Foreground | `planet_foreground_magazine.svg` | z-30 | Above content, `pointer-events-none` |

### Responsive Behaviour

- Both SVG containers have `minWidth: 1380px` to prevent gaps on wide screens
- Horizontally centered via `left-1/2 -translate-x-1/2`
- `backgroundSize: cover` with `backgroundPosition: top center`

```tsx
{/* Background layer */}
<div
  className="absolute top-0 left-1/2 -translate-x-1/2 h-full z-0"
  style={{
    backgroundImage: 'url(/imgs/planet_background_magazine.svg)',
    backgroundPosition: 'top center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    minWidth: 1380,
    width: '100%',
  }}
/>
```

---

## Cover Story (`components/magazine/CoverStory.tsx`)

Featured article display with image and text side-by-side on desktop, stacked on mobile.

### Layout

- Container: 100% width, max-width 1040px + 48px padding (1088px total)
- Image column: 45% width on desktop
- Text column: 55% width on desktop
- Gap: 32px (gap-8)

### Image Specifications

| Property | Value |
|---|---|
| Aspect ratio | 1.6290322581 |
| Object fit | cover |
| Border radius | 12px |
| Placeholder | `/imgs/article_lead.png` |

### Diagonal Ribbon

Orange ribbon tag positioned at top-left corner using CSS rotation:

```tsx
<div
  className="absolute bg-ralph-orange text-white text-xs font-bold uppercase"
  style={{
    width: 170,
    transform: 'rotate(-45deg) translateX(-50px) translateY(20px)',
  }}
>
  {ribbonTag}
</div>
```

### Typography

| Element | Font | Size | Weight | Line Height | Notes |
|---|---|---|---|---|---|
| Category tags | Roboto | 12px | 800 (ExtraBold) | 1 | Black, 10px margin bottom |
| Tagline | Gooper Trial | 18px | 600 | 1 | — |
| Title | Gooper Trial | 18px | 600 | 1 | — |
| Body copy | Roboto | 14px | 600 | 1 | — |

### Button

Uses the reusable `Button` component from `components/ui/Button.tsx`:
- Logged in: "Read now" → opens article overlay
- Logged out: "Sign up to read" → opens subscribe modal

---

## Category Tabs (`components/magazine/CategoryTabs.tsx`)

Horizontal filter tabs with decorative dashed separators.

### Categories

```typescript
const CATEGORIES = [
  { value: 'comedy', label: 'Comedy' },
  { value: 'music', label: 'Music' },
  { value: 'food', label: 'Food' },
  { value: 'film-tv', label: 'Film & TV' },
]
```

### Layout

- Container: 100% width, max-width 502px, horizontal padding 24px
- Buttons: 25% width each, no gap between
- Button height: 50px with vertically centered text

### Visual Design

| Element | Style |
|---|---|
| Top separator | `/imgs/dashed_separator_top.svg` |
| Bottom separator | `/imgs/dashed_separator_bottom.svg` |
| Font | Gooper Trial (`text-intro`) |
| Font size | 18px |
| Default color | Black |
| Default weight | 600 |
| Active color | `ralph-orange` |
| Active weight | 700 |
| Active underline | 2px `ralph-orange` bar at bottom |

### URL Sync

Category selection updates the URL via `window.history.pushState` without a server re-fetch:

```typescript
const url = next ? `${pathname}?category=${next}` : pathname
window.history.pushState(null, '', url)
```

---

## Article Grid (`components/magazine/ArticleGrid.tsx`)

3×2 grid of article cards with explode-on-hover effect.

### Grid Layout

| Property | Value |
|---|---|
| Max width | 1168px |
| Columns | 3 on desktop (`lg:grid-cols-3`), 2 on mobile |
| Gap | 1px (black background creates divider lines) |
| Border | 1px solid black |
| Margin top | 20px |

### Card Specifications

| Property | Value |
|---|---|
| Aspect ratio | 1.09604519774 |
| Image fit | object-cover |
| Placeholder | `/imgs/article_lead.png` |

### Hover Effect

"Explode" animation where each card pushes outward from the grid center on hover:

```typescript
const GRID_3x2 = [
  { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 },
]
const EXPLODE_PX = 16

// On hover:
transform: `translate(${vec.dx * EXPLODE_PX}px, ${vec.dy * EXPLODE_PX}px) scale(1.04)`
```

### Hover Overlay

When hovered, cards reveal:
- Yellow dotted border frame (2px dashed `ralph-yellow`, inset 8px)
- Gradient overlay at bottom (black 90% → transparent)
- Category tags in `ralph-pink`
- Title in white
- Intro text in white/70%

### Scroll Reveal

Uses `useScrollReveal(0.05)` hook with Framer Motion variants for entry animation.

### Placeholder Data

When no articles exist in the database, 6 placeholder articles are displayed:

```typescript
const PLACEHOLDER_ARTICLES: ArticleSummary[] = Array.from({ length: 6 }, (_, i) => ({
  id: `placeholder-${i}`,
  slug: `placeholder-${i}`,
  title: 'Article Title Goes Here',
  leadMediaUrl: '/imgs/article_lead.png',
  // ...
}))
```

---

## Files Modified

| File | Changes |
|---|---|
| `components/layout/SectionIntro.tsx` | Magazine title changed to `text_fun_glossy_mag.svg` at 575px width |
| `components/magazine/MagazineClient.tsx` | Added planet decoration section, moved Cover Story title |
| `components/magazine/CoverStory.tsx` | New layout, typography, Button component integration |
| `components/magazine/CategoryTabs.tsx` | Dashed separators, Gooper Trial font, 25% width buttons, no gap |
| `components/magazine/ArticleGrid.tsx` | Grid styling, placeholders, 1px borders |
| `components/ui/Button.tsx` | Added `width: fit-content` to fix shadow width issue |

---

## Assets Required

All assets should be placed in `/public/imgs/`:

- `text_fun_glossy_mag.svg` — Main page title (576×132px, displayed at 575px width)
- `planet_background_magazine.svg` — Background layer for decoration section
- `planet_foreground_magazine.svg` — Foreground layer for decoration section
- `text_cover_story.svg` — "Cover Story" title graphic (265×76px)
- `dashed_separator_top.svg` — Top separator for category tabs
- `dashed_separator_bottom.svg` — Bottom separator for category tabs
- `article_lead.png` — Placeholder image for articles
