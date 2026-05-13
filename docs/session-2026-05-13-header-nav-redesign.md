# Session 2026-05-13: Header & Nav Redesign

## Overview
Major redesign of the header utility bar and navigation system, plus events page enhancements.

---

## Events Page Changes

### MinglingCharacters Component
- Added arm SVGs representing active events
- Arms cycle through 4 colors: `blue_arm.svg`, `green_arm.svg`, `orange_arm.svg`, `pink_arm.svg`
- Arms positioned evenly across container width (10% to 90%)
- Height: 500-550px (deterministic variation based on index)
- Positioned 50px below container bottom (sticking up from crowd)
- Component accepts `eventCount` prop from EventsClient

### Starfield Enhancement
- Horizontal star movement on `/events` page
- Stars travel same direction with faster speed
- Uses `usePathname()` to detect events route

---

## Header (Utility Bar) Changes

### Visual Updates
- Removed pink border bottom
- Removed black background (transparent by default)
- Background becomes `rgba(0, 0, 0, 0.5)` when nav is fixed
- Smooth 0.3s transition on background color
- Fixed position at top
- Height: 77px
- z-index: 50

### Button Styling (All Header Buttons)
| Property | Value |
|----------|-------|
| Height | 44px |
| Border | 2px solid white |
| Border Radius | 22px |
| Font | Gooper Trial |
| Font Weight | 700 |
| Font Size | 14px |
| Line Height | 100% |
| Letter Spacing | 0 |
| Background | Transparent (pink on hover/active) |

### Button Layout Changes
**Left Side:**
- Circular logo (44px, absolutely positioned at 24px from left)
- "Subscribe to Ralph" button (was "Get started")
- "Log in" button (moved from right side)
- 24px gap between buttons

**Right Side:**
- "Work with us" button (was "Play with Ralph", moved from left)
- Theme toggle
- Language modal / User avatar
- 24px gap between items

### Scroll-Based Animations
When user scrolls past 24px:
- Circular logo scales from 0 to 1 (with ease-out-back bounce)
- Subscribe button margin animates from 0 to 68px
- Transition: `cubic-bezier(0.34, 1.56, 0.64, 1)`

### Circular Logo Behavior
- On home page: Scrolls to top smoothly when clicked
- On other pages: Navigates to home
- Hover: Text turns pink (using currentColor on SVG paths)
- Smooth color transition on hover

---

## Theme Toggle Changes
- Circle swatch: 44x44px (was 28x28)
- Border: 2px solid white
- Border radius: 50% (circular)
- Font: Gooper Trial, 700 weight, 14px

---

## Main Nav Changes

### Structure
- Logo: 98px height, 24px from top
- Nav items container: 44px height, items centered
- Bottom padding: 32px

### Fixed Nav Behavior
When scrolled 122px (logo + padding scrolls off):
- Nav becomes fixed at `top: 16px` (aligned with header buttons)
- Gap between items reduces from 70px to 24px (0.3s transition)
- 44px spacer div appears to prevent content jump
- z-index: 60 (above header)

### Nav Item Styling
| Property | Value |
|----------|-------|
| Font | Gooper Trial (text-btn class) |
| Font Size | 22px |
| Color | ralph-pink (primary when active) |
| Underline | SVG decoration on active state |

---

## Route Changes

### Renamed Pages
- `/play` → `/work-with-us`
- Folder renamed: `app/play/` → `app/work-with-us/`

---

## Files Modified

### Components
- `components/layout/Nav.tsx` - Major restructure
- `components/layout/ThemeToggle.tsx` - Styling updates
- `components/events/MinglingCharacters.tsx` - Added arms for events
- `components/events/EventsClient.tsx` - Pass activeEvents to MinglingCharacters

### Pages
- `app/play/` → `app/work-with-us/` (renamed)
- `app/events/page.tsx` - Fetch and pass active events

---

## Animation Summary

| Element | Trigger | Animation |
|---------|---------|-----------|
| Circular logo | Scroll 0-24px | Scale 0→1, opacity 0→1 |
| Subscribe button margin | Scroll 0-24px | 0→68px |
| Header background | Nav fixed | transparent→rgba(0,0,0,0.5) |
| Nav gap | Nav fixed | 70px→24px |

All transitions use 0.3s duration with appropriate easing.

---

## Z-Index Stack
| Element | Z-Index |
|---------|---------|
| Nav items (fixed) | 60 |
| Nav container | 60 |
| Header utility bar | 50 |
| Other content | < 50 |
