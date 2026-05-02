# Nav + Dropdown Redesign + Section Planet Pattern

## Overview

This pass covers three intertwined pieces of work, all shipped in commit `c1c0814`:

1. A re-skinned utility-bar header — new logo, new button styling, custom hand-drawn underline SVGs per active nav item.
2. A new shared `PinkDropdown` shell used by both the **Theme** picker and the **Language** picker, with a solid pink offset shadow, 45° angled corners, a pointing notch, and a spring pop-in animation.
3. The "layered planet decoration" pattern (originally bespoke to the Magazine page) extracted into a repeatable structure and applied to **Events**, **Lab**, **TV**, and **Shop**.

---

## 1. Header / Utility Bar

File: [components/layout/Nav.tsx](../components/layout/Nav.tsx)

### Logo (top-left)

The PNG logo (`/ralph-logo.png`) is replaced with an inlined version of [public/imgs/ralph_logo_circle.svg](../public/imgs/ralph_logo_circle.svg) so we can drive its colour with CSS.

| Element | Colour | Hover |
|---|---|---|
| Off-white circle background | `#E3E3DB` (hardcoded in SVG) | unchanged |
| Ralph face paths | `currentColor` — black | `text-ralph-pink` |

The `<Link>` wrapper carries `text-black hover:text-ralph-pink transition-colors`. Because the face paths use `fill="currentColor"`, they automatically inherit and animate.

### Buttons & links

A consistent typography utility (`text-chrome` from [globals.css](../app/globals.css) — Roboto 700 / 13px / 100% / 0%) is now used across:

- "Play with Ralph" link
- "Log in" link (when signed out)
- Theme trigger button
- "Get started" CTA

### "Get started" button

| Property | Value |
|---|---|
| Background | transparent |
| Border | 2px solid white |
| Border radius | 8px |
| Hover bg | `bg-ralph-pink` |
| Hover border | stays white |
| Hover text | stays white |

### Layout / spacing

| Gap | Value |
|---|---|
| Logo → Get Started | `4.6875rem` (75px) |
| Get Started → Play with Ralph | `2rem` (32px) |
| Right-side actions (Theme / Language / Login) | `2rem` (`gap-8`) |

### Active nav-item underlines

Each main-nav link now gets a custom hand-drawn underline SVG when active. The underline sits **behind** the text via a `relative z-10` span on the label and `z-0` on the underline `<img>`.

| Page | Asset | Colour |
|---|---|---|
| TV | `underline_tv.svg` (144×12) | purple |
| Magazine | `underline_magazine.svg` (142×10) | orange |
| Events | `underline_events.svg` (148×14) | teal |
| Lab | `underline_lab.svg` (73×12) | yellow |
| Shop | `underline_shop.svg` (148×14) | teal |

Each underline is positioned with `top: 50%` and centered horizontally over the link.

```tsx
<Link href={item.href} className="relative pb-1.5 text-btn text-[22px] ...">
  <span className="relative z-10">{item.label}</span>
  {isActive && (
    <img
      src={item.underline.src}
      className="absolute pointer-events-none -translate-x-1/2 z-0"
      style={{
        left: '50%',
        top: '50%',
        width: item.underline.w,
        height: item.underline.h,
        maxWidth: 'none',
      }}
    />
  )}
</Link>
```

> Mobile nav still uses the old solid bar underline since the SVGs are sized for desktop text.

---

## 2. Shared `PinkDropdown` Shell

File: [components/layout/PinkDropdown.tsx](../components/layout/PinkDropdown.tsx)

A single component that provides the shell (border, shadow, notch, animation) for both dropdowns. Changing one place changes both panels.

### Props

```ts
interface PinkDropdownProps {
  width: number       // panel width
  right: number       // how far past the trigger's right edge the panel extends
  children: ReactNode
}
```

### Structure (DOM)

```
<motion.div absolute top-full z-50  ← outer (handles pop-in)
  └─ <div notch />                  ← rotated 12×12 pink square
  └─ <div bg-ralph-pink>            ← pink wrapper, paddingRight/Bottom 19px,
                                      clip-path with 45° angled corners
       └─ <div bg-white border>     ← white card
            ↳ {children}
```

### Geometry

| Element | Size / position | Why |
|---|---|---|
| Pink wrapper paddingRight / paddingBottom | `19px` | 16px visible offset + 3px to hide the card's pink border edge |
| White card border | `3px solid #EA128B` | Matches the offset pink so the seam is invisible |
| White card padding | `16px 16px 16px 1.5rem` | Slightly more left padding for content breathing room |
| Notch position | `top: -6, right: 69` | 50px visible from card right edge + 19px wrapper offset |
| Clip-path | hexagon with 19px cuts at top-right and bottom-left | Decorative angled corners, cuts go through pink-only zones (white card stays untouched) |

The notch is rendered **before** the pink wrapper in DOM order and has no explicit z-index, so the pink wrapper / white card naturally paints on top of its lower half — only the top tip pokes above the panel.

### Animation (framer-motion)

Three exported variant objects let modals plug in the matching cascade:

```ts
panelVariants       // applied on the outer motion.div — spring pop-in
stackVariants       // wrap your items in a motion.div with this for stagger
panelItemVariants   // applied to each motion.button / motion.img item
```

| Variant | Hidden | Visible | Notes |
|---|---|---|---|
| `panelVariants` | `opacity 0, scale 0.7, rotate -2°` | `opacity 1, scale 1, rotate 0` | Spring 420 / 22; `transformOrigin: 'top right'` so it grows out of the trigger area |
| `stackVariants` | `{}` | `staggerChildren: 0.06, delayChildren: 0.1` | Sits immediately around the items because `staggerChildren` only affects direct motion children |
| `panelItemVariants` | `opacity 0, y -8` | `opacity 1, y 0` | Inherits transition from parent stagger |

### Pointing the notch at a specific trigger spot

The notch is always at `right: 69` from the dropdown's outer right edge. To make it land on the right horizontal point of the trigger, the modal sets `right={…}` on `PinkDropdown` to extend the panel past the trigger's right edge:

> `dropdown.right − 75 = trigger.right − distance_from_trigger_right_to_target`

| Modal | Target | `right` prop | Reasoning |
|---|---|---|---|
| Theme | "Theme" text center (~42px from trigger right) | `-33` | `42 + 33 = 75` |
| Language | Icon center (~18px from trigger right) | `-57` | `18 + 57 = 75` |

---

## 3. Theme Dropdown

File: [components/layout/ThemeToggle.tsx](../components/layout/ThemeToggle.tsx)

### Trigger

| Element | Detail |
|---|---|
| Theme swatch (active) | 28×28 with `borderRadius: 8px`, three-stop gradient from `SWATCH_COLORS[theme.id]` |
| "Theme" label | `text-chrome`, follows trigger text colour |
| Down arrow | Inlined SVG using `currentColor` (`/imgs/icon_downarrow.svg` content) |
| When closed | `text-primary` (white), pink on hover |
| When open | `text-ralph-pink` permanently — text + arrow both go pink |

### Panel

| Element | Detail |
|---|---|
| Width | `360px` |
| Item layout | `motion.button` rows with `gap-2` (0.5rem) between |
| Thumbnail | 64×64, `borderRadius: 12px`, 2px border (`#FFFFFF` inactive / `var(--color-ralph-pink)` active) |
| Label | `text-intro` at 16px, no underline |
| Active indicator | `icon_tick.svg` (21×19) at the row's right |

---

## 4. Language Dropdown

File: [components/layout/LanguageModal.tsx](../components/layout/LanguageModal.tsx)

### Trigger

| Property | Value |
|---|---|
| Icon | [icon_language.svg](../public/imgs/icon_language.svg) (36×28) |
| Border radius | 8px |
| Background | transparent default; `bg-ralph-pink` on hover and while open |

### Panel (237px wide)

Items are wrapped in a `motion.div` with `flex flex-col items-end w-full` so dividers right-align naturally.

```
<motion.button …paddingRight: 40px, paddingY: 1rem, justify-end>
  <span>{label}</span>
  {active && <img tick absolute right: 0 />}
</motion.button>

<motion.img divider 177px />
```

| Element | Detail |
|---|---|
| Button | full-width, `text-intro 16px`, `paddingTop/Bottom: 1rem`, `paddingRight: 40` |
| Label | sits 40px from the divider's right edge |
| Tick | absolutely positioned at `right: 0` so it doesn't shift the label |
| Dividers | [`divide_line_01.svg`](../public/imgs/divide_line_01.svg) between English / 日本語; [`divide_line_02.svg`](../public/imgs/divide_line_02.svg) between 日本語 / हिंदी |
| Divider sizing | `width: 177px, height: auto` |

The divider's right edge naturally aligns with the panel content right (no extra padding); the buttons add their own 40px right padding so labels land 40px to the left of divider's right edge.

---

## 5. Section Pages — Layered Planet Pattern

### The pattern

Originally the Magazine page had a `260px` planet block followed by a separate white content section. That left content "stuck" below a fixed-height decoration. The new pattern unifies both into a single `<section>` with two superimposed layers:

```
<section relative>
  ┌─ <div absolute inset-0 z-0>  ← background layer
  │    ├─ <div height: 270>      ← planet bg + fg layers
  │    └─ <div absolute top: 270 bottom: 0 bg-white />  ← white fills below planet
  └─ <div relative z-10 paddingTop: 200>  ← content layer
       {…children, can use marginTop: -X to overflow up over the planet}
```

The `paddingTop` on the content layer is the single knob that controls vertical positioning — content can also use negative margins on individual children to overflow above the planet.

### Applied across pages

| Page | Planet assets | Content layer | Notes |
|---|---|---|---|
| Magazine | `planet_*_magazine` | CoverStory + tabs + grid (white bg flows behind everything) | Cover Story title moved from absolute-pinned to in-flow, easier to nudge with margins |
| Events | `planet_*_events` | _empty_ — placeholder for rebuild | `SectionIntro` retained with new `text_lets_meet_up.svg` (size 535×113, used by `SectionIntro` at half scale via `w: 1070, h: 226`); CrowdBackground / EventCreature / EventFlyout removed but files kept for reuse |
| Lab | `planet_*_lab` | RalphOMatic | `SectionIntro` removed |
| TV | `planet_*_tv` | TVSet | `SectionIntro` removed |
| Shop | `planet_*_tv` (placeholder) | category tabs + product grid | Tabs restyled to match Magazine (dashed separators, 18px Gooper, 33% width per tab); gray `#FAFAFA` grid bg removed so white flows through |

### Responsive sizing

All planet SVGs now have `preserveAspectRatio="none"` so the cover-sized backgrounds stretch cleanly to whatever width the wrapper renders.

```tsx
{/* Planet decoration wrapper — common to all section pages */}
<div className="relative w-full" style={{ height: 270 }}>
  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
       style={{ backgroundImage: 'url(/imgs/planet_background_<section>.svg)', … }} />
  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none"
       style={{ backgroundImage: 'url(/imgs/planet_foreground_<section>.svg)', … }} />
</div>
```

---

## 6. Asset Inventory

All new files in [public/imgs/](../public/imgs/):

### Planets (background + foreground per section)

- `planet_background_events.svg` / `planet_foreground_events.svg`
- `planet_background_lab.svg` / `planet_foreground_lab.svg`
- `planet_background_tv.svg` / `planet_foreground_tv.svg`
- `planet_background_creative.svg` / `planet_foreground_creative.svg` _(reserved for future use)_

### Header / nav

- `ralph_logo_circle.svg` — 43×43, replaces the PNG logo
- `underline_tv.svg` (144×12, purple)
- `underline_magazine.svg` (142×10, orange)
- `underline_events.svg` (148×14, teal)
- `underline_lab.svg` (73×12, yellow)
- `underline_shop.svg` (148×14, teal)

### Dropdown chrome

- `icon_language.svg` — 36×28, language trigger
- `icon_downarrow.svg` — 13×7, theme trigger arrow (currently inlined into JSX so the stroke can use `currentColor`; the file is still useful as the source of truth)
- `icon_tick.svg` — 21×19, used as the selected indicator in both dropdowns
- `divide_line_01.svg` — 179×7, divider between English / 日本語
- `divide_line_02.svg` — 179×9, divider between 日本語 / हिंदी

### Section titles

- `text_lets_meet_up.svg` — 535×113, used by `SectionIntro` for the Events page (rendered at half size: 268×57 via the `w/2, h/2` convention in `TITLE_IMAGES`)

---

## Open follow-ups

- **Shop is using `_tv` planets as placeholders** — swap in proper shop planet assets when ready.
- **Events page is intentionally bare below the planet** — the crowd / creature concept is being rebuilt; component files (`CrowdBackground`, `EventCreature`, `EventFlyout`) are preserved on disk for reuse.
- **Mobile nav** still uses the original solid-bar underline since the desktop SVGs are sized for the larger header text.
- **TypeScript scaffolding**: `RalphTVClientProps.heading/intro/copy` and `EventsClientProps.activeEvents` are still declared on the interfaces but no longer destructured, kept so callers don't break when the rebuild re-introduces them.
