# Lint follow-ups — React-Hooks rules

Three rules were downgraded from `error` to `warn` in
[eslint.config.mjs](../eslint.config.mjs) so `npm run lint` doesn't block
the build gate while the Ralph World 2.0 account/payment work ships:

- `react-hooks/set-state-in-effect`
- `react-hooks/refs`
- `react-hooks/immutability`

Each remaining warning falls into one of two buckets — **intentional**
(SSR/hydration-sync patterns the rule doesn't understand) or
**punchlist** (genuine refactor candidates we should address in a
hygiene pass).

---

## Intentional — leave as-is

These match documented or load-bearing patterns; the rule fires because
it can't see the intent.

| Location | Pattern | Why it stays |
|---|---|---|
| [context/ThemeContext.tsx:39](../context/ThemeContext.tsx#L39) | `setThemeState(stored)` from `localStorage` in `useEffect` | Reading localStorage during `useState` init would crash on the server or cause a hydration mismatch (SSR has default theme, client has stored). The deferred set is the correct pattern. Eventually replace with `useSyncExternalStore` if we want the rule fully clean. |
| [components/layout/PinkDropdown.tsx:61](../components/layout/PinkDropdown.tsx#L61) | `setMounted(true)` to guard `createPortal` | `document.body` isn't available during SSR. Same pattern as ArticleOverlay. |
| [components/magazine/ArticleOverlay.tsx:43](../components/magazine/ArticleOverlay.tsx#L43) | `setMounted(true)` to guard `createPortal` | Same SSR portal guard as PinkDropdown. |
| [components/layout/Nav.tsx:72](../components/layout/Nav.tsx#L72) | `setScrollProgress(...)` / `setNavFixed(...)` on first-load `window.scrollY` read | `window` is SSR-unavailable; first-load needs to seed nav state from actual scroll position. Could move to `useSyncExternalStore` for full compliance. |
| [components/layout/PageTransitionWrapper.tsx:29](../components/layout/PageTransitionWrapper.tsx#L29) | `const frozen = useRef(context).current` accessed during render | **Frozen Router** pattern — captures `LayoutRouterContext` once so the exiting subtree keeps its old context during AnimatePresence exit. Load-bearing: refactoring it breaks page-transition exits across the app. See [docs/page-transitions.md](page-transitions.md). |

---

## Punchlist — fix in a hygiene pass

All trivially refactorable; none are load-bearing.

### 1. `key`-based remount

These reset transient state when a prop changes. The clean React idiom
is `key={prop}` on the component to force a fresh mount.

- [components/shop/ProductOverlay.tsx:29](../components/shop/ProductOverlay.tsx#L29) — `setSelectedImage(0)` when product changes. Add `key={product.id}` at the caller, drop the effect.
- [components/layout/SubscribeModal.tsx:46](../components/layout/SubscribeModal.tsx#L46) — `setIsLoading(null)` when `isOpen` flips. Move the reset into the click handler that opens the modal, or `key={isOpen}`.

### 2. Lazy `useState` initializer

`safeGet` is SSR-safe (returns `null` on the server), so these can use a
lazy init: `useState(() => safeGet('...') ?? default)`. The deferred
effect becomes unnecessary. Watch for hydration mismatch if the stored
value differs from SSR's default.

- [components/layout/LanguageModal.tsx:26](../components/layout/LanguageModal.tsx#L26) — `setLanguageState(stored)` from localStorage.
- [components/tv/TVSet.tsx:73](../components/tv/TVSet.tsx#L73) — `setVolume(n)` from localStorage.

### 3. Derived state

The set is redundant — the value can be computed inline.

- [lib/hooks/usePlanetPreloader.ts:54](../lib/hooks/usePlanetPreloader.ts#L54) — `setReady(true)` if `isPreloaded` is true. Replace with `const ready = isPreloaded ?? state` or hoist to caller.

### 4. Effect reshape

These need a slightly larger refactor — split or move the setState.

- [hooks/useHls.ts:20](../hooks/useHls.ts#L20) — `setIsReady(false)` at the top of the effect that loads HLS. Move it into the cleanup-then-load order so the rule sees a clear "external sync" intent.
- [hooks/usePageExit.ts:23](../hooks/usePageExit.ts#L23) — `setIsExiting(true)` on pathname change. Either rework via `useSyncExternalStore` against the router, or move the trigger to the navigation handler that's causing the exit. Largest of the punchlist — touches the page-transition system.

### 5. `mergeRefs` helper

- [components/home/PlanetSection/PlanetSection.tsx:245](../components/home/PlanetSection/PlanetSection.tsx#L245) — assigns both `revealRef.current` and `sectionRef.current` in a single ref callback to combine refs on one DOM node. Extract a `mergeRefs(...refs)` helper that returns a stable ref callback; use it once here and reuse anywhere else the pattern appears.

---

## When to revisit

Re-enable each rule as `error` once its category is empty. The
intentional list (§ Intentional) will probably stay forever unless we
rewrite onto `useSyncExternalStore` — which is fine; downgrading these
rules is the supported escape hatch for that exact use case.
