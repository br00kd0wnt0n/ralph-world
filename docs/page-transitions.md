# Page Transitions

## Overview

Page transitions in ralph-world use Framer Motion's `AnimatePresence` with a custom "Frozen Router" pattern to enable smooth enter/exit animations in Next.js App Router.

---

## Architecture

### The Problem with Next.js App Router

Next.js App Router presents challenges for exit animations:

1. **`template.tsx` is recreated on navigation** - Any AnimatePresence inside template.tsx is destroyed before it can run exit animations
2. **`layout.tsx` children update immediately** - When navigating, the `children` prop instantly reflects the new route content, so there's no "old content" to animate out
3. **Route components unmount immediately** - Standard React behavior removes components before animations can complete

### The Solution: Frozen Router Pattern

We use a technique that freezes the router context during exit animations:

```
layout.tsx
  └── PageTransitionWrapper (client component)
        └── AnimatePresence mode="wait"
              └── motion.div key={pathname}
                    └── FrozenRouter
                          └── {children}
```

**How it works:**

1. `PageTransitionWrapper` lives in the persistent layout
2. When pathname changes, AnimatePresence detects the key change
3. `FrozenRouter` captures and holds the `LayoutRouterContext` at mount time
4. During exit animation, the old content renders with its frozen context (showing old page)
5. After exit completes, new content mounts with fresh context

---

## Components

### PageTransitionWrapper

**Location:** `components/layout/PageTransitionWrapper.tsx`

The main orchestrator for page transitions.

```tsx
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper'

// In layout.tsx
<main>
  <PageTransitionWrapper>
    {children}
  </PageTransitionWrapper>
</main>
```

**Features:**
- Wraps children with AnimatePresence (`mode="wait"`)
- Provides `isExiting` state via React context
- Scrolls to top after exit animation completes
- Uses FrozenRouter to preserve old content during exit

### useTransitionState Hook

**Location:** Exported from `PageTransitionWrapper.tsx`

Allows any child component to know if a page exit is in progress.

```tsx
import { useTransitionState } from '@/components/layout/PageTransitionWrapper'

function MyComponent() {
  const { isExiting } = useTransitionState()

  return (
    <motion.div
      animate={{
        x: isExiting ? 100 : 0,
        opacity: isExiting ? 0 : 1,
      }}
    >
      Content
    </motion.div>
  )
}
```

---

## Animation Timing

### Page Wrapper (template level)

| State | Duration | Easing |
|-------|----------|--------|
| Enter | 0.4s | easeOut `[0.22, 1, 0.36, 1]` |
| Exit | 0.35s | easeIn `[0.4, 0, 1, 1]` |

### Homepage Planets

When navigating away from homepage, each planet slides toward its nearest screen edge:

| Planet | Exit Direction | Offset |
|--------|---------------|--------|
| TV | Right | +100px |
| Magazine | Left | -100px |
| Events | Right | +100px |
| Shop | Left | -100px |
| Lab | Right | +100px |

**Planet exit animation:** 0.3s duration, easeIn

**Panel fade:** 0.15s (quick hide to prevent colored square flash)

---

## Implementation Details

### PlanetSection Exit Behavior

`components/home/PlanetSection/PlanetSection.tsx`

```tsx
const { isExiting } = useTransitionState()

// Exit direction from PLANET_EXIT_DIRECTIONS map
const exitDirection = PLANET_EXIT_DIRECTIONS[id] || (planetOnRight ? 'right' : 'left')
const planetExitOffset = exitDirection === 'left' ? -100 : 100

// Planet animation
<motion.div
  animate={{
    x: isExiting ? planetShift + planetExitOffset : planetShift,
    opacity: isExiting ? 0 : 1,
  }}
  transition={
    isExiting
      ? { duration: 0.3, ease: 'easeIn' }
      : { type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }
  }
>

// Panel quick-fade
<motion.div
  animate={{
    x: planetShift,
    opacity: isExiting ? 0 : 1,
  }}
  transition={
    isExiting
      ? { duration: 0.15, ease: 'easeIn' }
      : { type: 'spring', ... }
  }
>
```

### Exit Direction Map

`lib/animation/page-transitions.ts`

```tsx
export const PLANET_EXIT_DIRECTIONS: Record<string, 'left' | 'right'> = {
  tv: 'right',
  magazine: 'left',
  events: 'right',
  shop: 'left',
  lab: 'right',
}
```

---

## Section Page Entry Animations

Section pages (events, magazine, etc.) use sequenced entry animations:

1. **Intro text** - Fades in immediately (0-0.5s)
2. **Background/planet** - Fades in + rises from y:20 (delay 0.3s, duration 0.5s)
3. **Content** - Fades in last (delay 0.5s, duration 0.5s)

Variants defined in `lib/animation/page-transitions.ts`:
- `sectionContainerVariants` - Orchestrates children
- `sectionIntroVariants` - Intro text
- `sectionBgVariants` - Background layer with y offset
- `sectionContentVariants` - Main content

---

## Files

| File | Purpose |
|------|---------|
| `components/layout/PageTransitionWrapper.tsx` | Main transition wrapper + useTransitionState hook |
| `lib/animation/page-transitions.ts` | Animation variants and exit direction map |
| `components/home/PlanetSection/PlanetSection.tsx` | Planet slide-out on exit |
| `app/layout.tsx` | Wraps children with PageTransitionWrapper |

---

## Troubleshooting

### Animations not running on exit

- Ensure component uses `useTransitionState()` hook
- Check that `isExiting` state is being used in animate prop
- Verify PageTransitionWrapper is in layout.tsx (not template.tsx)

### Content flashing during transition

- Add quick opacity fade (0.15s) to elements that shouldn't be visible during exit
- Check z-index layering

### Scroll position issues

- PageTransitionWrapper scrolls to top in `onExitComplete` callback
- Uses `behavior: 'instant'` to avoid smooth scroll interfering with animations
