# Homepage Parallax & Visual Overhaul — Branch: feat/home-parallax

## Overview

Complete visual redesign of the homepage, introducing a multi-layered parallax system, new planet section interaction model, custom typography, brand colour updates, and footer redesign.

---

## Parallax Layer System

Four distinct depth layers that move at different scroll speeds, creating a sense of depth:

| Layer | Component | z-index | Scroll Speed | Contents |
|---|---|---|---|---|
| Background | `Starfield.tsx` | z-0 | 1–25% | Canvas particle effect — 350 particles across 3 depth bands, subtle colour tints, drifting, occasional shooting stars |
| Midground | `MidgroundLayer.tsx` | z-[1] | 65–80% | Illustrated space objects (moon, planet, satellite) + flying spaceship animation |
| Content | Page content | z-10 | 100% (normal) | Planet sections, panels, hero, nav |
| Foreground | `ForegroundLayer.tsx` | z-20 | 120–140% | Illustrated ships/characters (alien rocket, saucer, spaceship) |

### Starfield (`components/layout/Starfield.tsx`)
- Replaced the original 200 white dots with 350 mixed particles
- 3 depth bands: far (50%, tiny, dim), mid (35%, medium), near (15%, large, some rendered as sparkle crosses)
- Subtle colour variation — hints of pink, blue, purple, warm tones from brand palette
- Each particle drifts on a sine wave so the field feels alive without scrolling
- Occasional shooting stars (max 2 at a time, ~1 every 16s) with gradient trails
- Hidden on mobile, only renders on `cosy-dynamics` theme
- Fixed: initialises `scrollY` from `window.scrollY` to prevent jump on first interaction

### Midground Layer (`components/layout/MidgroundLayer.tsx`)
- 3 illustrated items: `item_moon.png`, `item_planet.png`, `item_satellite.png`
- 1 flying item: `item_mid_spaceship.png` — CSS animation flies right-to-left on 18s loop, vertical position parallaxed via JS
- All scroll updates batched via `requestAnimationFrame`
- Uses `transform: translateY()` throughout (no `top` manipulation) for GPU compositing

### Foreground Layer (`components/layout/ForegroundLayer.tsx`)
- 3 illustrated items: `item_front_alienrocket.png`, `item_front_saucer.png`, `item_front_spaceship.png`
- Scroll faster than content (1.3–1.4x) creating a foreground depth effect
- rAF-batched scroll updates

---

## Planet Sections (`components/home/PlanetSection/`)

### Interaction Model
Complete rewrite of the hover/reveal system:

1. **Scroll peek**: When the section center is within the middle 90% of the viewport, the panel peeks 20px from behind the planet via `clip-path: inset()` animation
2. **Hover to open**: Hovering the planet sets `isActive` on the section, opening the panel fully
3. **Mouse position observer**: While active, a mousemove + scroll observer checks if the cursor is within 90% viewport height of the section center. If the user scrolls away or moves the cursor out of bounds, the panel closes and the observer is removed
4. **Planet pointer-events disabled when open**: So the planet doesn't block panel button clicks
5. **Touch**: Tap planet to toggle on touch devices

### Panel Design
- Fixed height: 276px
- Two-column layout: 340px per column, 20px gap, 20px padding
- Panel width = content width + half planet width (panel starts from planet center)
- Columns reverse for planet-on-left sections (text column on the right, right-aligned)
- Text column uses `justify-between` — title/subtitle/body at top, button at bottom
- Panel bottom edge positioned 50px above the planet's bottom edge
- `clip-path: inset()` with CSS transition for the slide reveal
- Spring overshoot animation on the x-shift (Framer Motion spring: stiffness 200, damping 20, mass 0.8)
- Staggered content reveal: column 1 fades in after 150ms, column 2 after 300ms

### Panel Content
- Secondary title images replace text headings inside panels (`title_*_secondary.png`)
- Subtitle uses `text-intro` (Gooper Trial SemiBold 18px)
- Body text uses `text-body-sm` with 18px line height
- Reusable `Button` component with shadow press effect

### Title/Subtitle Block
- Positioned to the side of each planet (towards page center), 24px gap
- Title is a custom image (`title_*.png`) at half intrinsic size
- Subtitle uses `text-intro` (Gooper Trial SemiBold 18px), white
- Bottom of the containing div aligns with the planet's vertical center
- Parallaxes at 30% of the planet's shift when the panel opens

### Planet Images
- Each section has its own planet illustration: `planet_tv.png`, `planet_mag.png`, `planet_events.png`, `planet_shop.png`, `planet_lab.png`
- Display width: 411px, height: auto (maintains aspect ratio)
- Planet shifts 100px towards the screen edge when the panel opens

### Sections
- Added **Ralph TV** as the first section (brand purple `#7B3FE4`)
- Order: TV (right) → Magazine (left) → Events (right) → Shop (left) → Lab (right)
- Reduced vertical gap between sections: `py-4 md:py-6` (was `py-16 md:py-24`)
- Removed floating character spacers between sections

---

## Typography System

### Fonts
- **Roboto** (Google Fonts) — 400, 600, 700, 800 weights loaded via Next.js
- **Gooper Trial** (custom) — SemiBold 600, loaded via `@font-face` from `/public/fonts/`
- Body default changed from Arial to Roboto

### Text Utility Classes (defined as `@utility` in `globals.css`)

| Class | Font | Weight | Size | Line Height | Use |
|---|---|---|---|---|---|
| `text-body` | Roboto | 600 | 16px | 24px | Regular paragraphs |
| `text-body-sm` | Roboto | 600 | 14px | 14px | Small paragraphs |
| `text-body-bold` | Roboto | 700 | 18px | 28px | Emphasis body |
| `text-chrome` | Roboto | 700 | 13px | 13px | Header/footer links |
| `text-tag` | Roboto | 800 | 12px | 12px | Tabs, tags, labels |
| `text-intro` | Gooper Trial | 600 | 18px | 18px | Article openers, subtitles |
| `text-btn` | Gooper Trial | 600 | inherit | 100% | Buttons, nav items |

---

## Brand Colours

Updated all brand colours across CSS variables, Tailwind tokens, section accents, and parallax layers:

| Name | Old | New | CSS Variable |
|---|---|---|---|
| Pink | `#FF2098` | `#EA128B` | `--color-ralph-pink` |
| Blue (was Teal) | `#00C4B4` | `#5FBCBF` | `--color-ralph-blue` |
| Yellow | `#FFE566` | `#FBC000` | `--color-ralph-yellow` |
| Green | `#4CAF50` | `#44B758` | `--color-ralph-green` |
| Orange | `#FF6B35` | `#EE6626` | `--color-ralph-orange` |
| Purple | `#7B2FBE` | `#7B3FE4` | `--color-ralph-purple` |

### Panel Text Colours
- Purple panel: white text, white buttons
- All other panels (blue, green, yellow, orange): black text, black buttons

---

## Button Component (`components/ui/Button.tsx`)

Reusable button with shadow press effect:
- 43px height, min-width 170px, 12px horizontal padding
- 2px black border, white background, black text
- Gooper Trial SemiBold 16px, centered
- Separate shadow element (black, offset 4px down+right) — stays in place while button moves
- Hover: button shifts 2px towards shadow
- Active/click: button shifts full 4px, flush with shadow
- Accepts `href` (renders as Next.js Link) or `onClick` (renders as button)

---

## Navigation

### Header (`components/layout/Nav.tsx`)
- Top utility bar restyled: 77px height, `rgba(0,0,0,0.7)` background, 2px bottom border in `rgba(234,18,139,0.3)`
- Desktop nav section hidden (replaced by PageNav)

### Page Navigation (`components/layout/PageNav.tsx`)
- New reusable component for in-page navigation
- Ralph wordmark logo at 98px height
- Nav items in Gooper Trial SemiBold 22px with 70px gaps
- 16px gap below header, 50px gap before page content
- Transparent background — starfield visible through it
- Added to homepage, can be dropped into any page

---

## Hero (`components/home/Hero.tsx`)

- Heading text replaced with custom image: `text_welcome_to_our_world.png` (half intrinsic: 563x126)
- Subtitle lines use `text-body` style (Roboto 600 16px/24px), white, centered
- Changed from `justify-center` to `justify-start`
- Removed `min-h-[85vh]` constraint

---

## Footer (`components/layout/Footer.tsx`)

### Planet Section (moved to homepage)
- `footer_planet.png` centered at half intrinsic size (1449x242)
- Ralph wordmark (76px, black via `brightness(0)` filter) + `text_the_entertainment_people.png` overlaid
- Content justified to bottom with 28px padding
- 180px top padding for gap from last planet section

### Footer Bar
- 103px height, 4px top border in brand pink
- Globe animation bottom-left (24px from edges)
- "Contact us" link + 3 social icon buttons (TikTok, Instagram, YouTube) right-aligned, 32px gap
- Icon hover: pink background circle, icon turns black
- Contact link uses `text-chrome` style

### Globe Animation (`components/layout/Globe.tsx`)
- Ported from previous codebase
- 120px size, cycles through 4 city views (London, America, Tokyo, Mumbai)
- 8-frame spin animation between views (100ms per frame)
- 4-second hold on each city view with sign fade-in
- All frames pre-rendered as hidden images for smooth transitions

---

## Files Changed

### New Files
- `components/layout/ForegroundLayer.tsx`
- `components/layout/MidgroundLayer.tsx`
- `components/layout/PageNav.tsx`
- `components/layout/Globe.tsx`
- `components/ui/Button.tsx`
- `public/fonts/Gooper7-SemiBold.woff`
- `public/fonts/Gooper7-SemiBold.woff2`
- `public/imgs/` — planet images, title images, secondary titles, parallax items, footer planet, icons, text images, globe frames

### Modified Files
- `app/globals.css` — brand colours, font face, text utilities, button styles, footer icon styles
- `app/layout.tsx` — Roboto font, ForegroundLayer + MidgroundLayer added
- `app/page.tsx` — TV section added, section order/positions, footer planet section, PageNav
- `components/home/Hero.tsx` — image heading, text styles, layout
- `components/home/PlanetSection/PlanetSection.tsx` — complete interaction rewrite
- `components/layout/Footer.tsx` — redesigned footer bar
- `components/layout/Nav.tsx` — header restyle, desktop nav hidden
- `components/layout/Starfield.tsx` — complete particle system rewrite
