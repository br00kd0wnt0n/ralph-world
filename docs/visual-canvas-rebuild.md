# Visual Canvas Rebuild — Scoping Doc

**Status:** Scoping (no code). Parked for a dedicated session.
**Owner:** Brook.
**Interim solution:** The `RALPH WORLD` theme in `ralph-world` iframes the existing `visual-canvas-lab` deployment at `ralph-visual-canvas-production.up.railway.app`. That keeps working until this rebuild ships.

---

## 1. Goal

Replace the iframe-embedded canvas with a **bundled, lazy-loaded 3D canvas built inside ralph-world** that:

- Matches or exceeds the visual complexity of canvas-lab's LANDING preset (blooms, DOF, vignette, camera moves, shapes, sizing).
- Does not hurt ralph-world's baseline performance for users who never select the RALPH WORLD theme.
- Is maintainable by one developer — no separate service, no separate repo, no separate deploy.
- Drops everything we don't need: AI, weather, cloud presets, the in-canvas admin UI, MongoDB.

Non-goal: re-implement canvas-lab feature-for-feature. If a feature isn't in the chosen preset set, it's out.

---

## 2. Visual target (reference-first)

The single biggest lesson from previous rebuild attempts: **lock the target before writing code.** Graphics work without a concrete reference becomes an unbounded aesthetic hunt.

### 2.1 Canonical reference
- **LANDING preset** (canvas-lab) is the v1 target.
- Brook to capture a **reference pack** before the rebuild session starts:
  - 3–5 still screenshots at known viewport sizes (1440×900, 375×812 mobile).
  - 1 × 10-second MP4 capture at 1440×900, 60fps if possible — covers the auto-pan camera cycle.
  - Optional: screen recordings of 2–3 other presets that worked well, for v2+ targets.
- Store reference pack in `docs/visual-canvas-refs/` (git-ignored or LFS if large).

### 2.2 Acceptance criteria
- Side-by-side with the reference at the captured camera angles: **≥95% perceived visual match** (Brook's judgement call — no numeric metric).
- Same "liveness" — auto-pan cadence, glow pulse, particle movement feel — matches within perceptual tolerance.
- Works on Chrome (desktop + Android), Safari (macOS + iOS 16+), Firefox desktop.

### 2.3 What "95%" rules out
Don't chase: subtle shader noise variations, exact RNG seeds, pixel-accurate bloom kernels. Do chase: overall palette, composition, motion character, depth/atmosphere, bloom+DOF interaction.

---

## 3. Scope

### In
- Geometric shapes: spheres, cubes, toruses (the three canvas-lab supports today).
- Particle system (count, size, movement, colour, blend).
- Post-processing stack: **bloom, depth-of-field, vignette** (from `postprocessing` or equivalent).
- Camera: auto-pan orbit around origin. No manual controls for v1.
- Presets: LANDING in v1. 4 more in v2 (Brook picks from canvas-lab screenshots).
- Preset format: static JSON files, committed in-repo.
- Theme integration: `BackgroundLayer` swaps to this canvas when `theme === 'ralph-world'`.

### Out (hard cut)
- ~~AI theme analysis / OpenAI integration~~
- ~~Weather-based parameter mapping / OpenWeather~~
- ~~Cloud presets / MongoDB~~
- ~~Preset share URLs / QR codes~~
- ~~In-canvas admin UI, dashboards, sliders, tooltips~~
- ~~Preset transitions (v2, not v1)~~
- ~~Manual camera controls~~
- ~~Object trails~~
- ~~Sine wave layers, metamorphosis, blobs, fireflies~~ (revisit case-by-case if a preset needs them)

---

## 4. Stack

| Layer | Choice | Why |
|---|---|---|
| 3D core | `three` (selective imports from `three/src/...`) | Smallest surface, tree-shakeable. |
| React bindings | `@react-three/fiber` v9 | React 19 + Next 16 compatible. Lets the canvas compose with ralph-world components if we ever want overlays. |
| Effects | `postprocessing` (raw, not drei's wrapper) | Bloom + DOF + vignette supported out-of-the-box. |
| State | `zustand` (local to canvas) | Small (~1KB), already the pattern canvas-lab uses — eases preset porting. Don't pollute ralph-world's React Context. |
| Presets | Static JSON in `lib/canvas/presets/` | No API, no DB, no network call at runtime. |

**Explicit exclusions:**
- **No `@react-three/drei`** — it imports heavy utilities and inflates the bundle. Use R3F primitives directly.
- **No `@react-three/postprocessing`** — wraps `postprocessing`; we can use `postprocessing` directly with less overhead.
- **No MongoDB client, no OpenAI SDK, no OpenWeather fetch** — even unused, they bloat node_modules and create supply-chain noise.

---

## 5. Performance budget

Hard numbers the rebuild must hit. If we can't, scope gets cut.

| Metric | Budget |
|---|---|
| Canvas chunk size (gzipped) | **≤ 400KB** |
| Impact on ralph-world initial JS for non-canvas themes | **0 bytes** (fully lazy) |
| Time to first canvas frame (after theme switch, on M1 MBA + fast 3G) | **≤ 3s** |
| Steady-state frame time on M1 MBA at 1440×900 | **≤ 16ms** (60fps) |
| Steady-state frame time on iPhone 12 at device size | **≤ 33ms** (30fps) |
| Memory (heap) after 5min steady | **≤ 300MB** |
| Lighthouse Performance score on `/` with RALPH WORLD theme active | **≥ 80** |
| Lighthouse Performance score on `/` with Starfield theme | **Unchanged from baseline** |

Measurement:
- `next build --profile` for chunk size.
- Chrome DevTools Performance tab for frame time + memory.
- WebPageTest / Lighthouse CI for field metrics.

---

## 6. Architecture

### 6.1 Bundle strategy
```tsx
// context/ThemeContext.tsx — BackgroundLayer
const CanvasBackground = dynamic(
  () => import('@/components/canvas/CanvasBackground'),
  { ssr: false, loading: () => <CanvasFallback /> }
)

export function BackgroundLayer() {
  const { theme } = useTheme()
  if (theme === 'ralph-world') return <CanvasBackground />
  return null
}
```
- Users on Starfield/Light never download the canvas chunk.
- Theme switch triggers chunk download; cached after first load.
- `<CanvasFallback />` is a static gradient placeholder shown during chunk fetch + first-frame render.

### 6.2 File layout
```
lib/canvas/
  presets/
    landing.json
    ...
  types.ts           # Preset shape, RendererConfig, etc.
  store.ts           # Zustand store (canvas-scoped)
components/canvas/
  CanvasBackground.tsx   # <Canvas> + scene root
  Scene.tsx              # Shapes + particles + camera
  effects/
    Bloom.tsx
    DepthOfField.tsx
    Vignette.tsx
  shapes/
    Spheres.tsx
    Cubes.tsx
    Toruses.tsx
  particles/
    Particles.tsx
  camera/
    AutoPanCamera.tsx
docs/
  visual-canvas-rebuild.md   # this doc
  visual-canvas-refs/        # reference screenshots + video
```

### 6.3 Preset schema (JSON)
```json
{
  "name": "LANDING",
  "version": 1,
  "background": { "color": "#000000" },
  "camera": {
    "mode": "autopan",
    "distance": 12,
    "panSpeed": 0.08,
    "panRadius": 3
  },
  "shapes": {
    "spheres":  { "count": 40, "size": 0.6, "color": "#FF2098", "organicness": 0.3, "glow": 0.8 },
    "cubes":    { "count": 20, "size": 0.4, "color": "#7B2FBE", "rotationSpeed": 0.02 },
    "toruses":  { "count": 10, "size": 0.8, "color": "#00C4B4", "tube": 0.2 }
  },
  "particles": { "count": 800, "size": 0.05, "color": "#FFFFFF", "movement": "drift" },
  "effects": {
    "bloom":     { "intensity": 1.2, "threshold": 0.4, "smoothing": 0.2 },
    "dof":       { "focusDistance": 0.01, "focalLength": 0.05, "bokehScale": 3 },
    "vignette":  { "offset": 0.3, "darkness": 0.6 }
  }
}
```
- Fields mirror canvas-lab param names where possible to ease porting.
- Brook or future-Brook hand-converts each preset from canvas-lab's store dump. No automatic importer.

---

## 7. Phases (vertical slices, not layer-by-layer)

**Phase 0 — Reference pack (Brook, async, ~30min)**
- Capture LANDING screenshots + MP4 at target viewports.
- Export canvas-lab LANDING preset JSON from the store.
- Commit to `docs/visual-canvas-refs/`.

**Phase 1 — Scaffolding (1 day)**
- Install R3F v9, three, postprocessing, zustand in ralph-world.
- Create `lib/canvas/` + `components/canvas/` structure.
- Dynamic-imported `<CanvasBackground>` renders a single static sphere on a black background when theme is RALPH WORLD.
- Verify bundle split: confirm no canvas code in the main chunk.
- **Gate:** measure current gzipped size of the canvas chunk (should be <200KB with only a sphere).

**Phase 2 — LANDING vertical slice (2–3 days)**
- Implement all shapes + particles + camera + effects **end-to-end** with hard-coded parameters close to LANDING reference.
- Wire preset JSON loading.
- Don't tune — just get the full stack rendering.
- **Gate:** compare against reference screenshots. Document the delta (lighting wrong? DOF too strong? particles too dense?).

**Phase 3 — Visual parity (2–4 days, the messy one)**
- Tune parameters until side-by-side match is ≥95%.
- This is where previous rebuilds stalled. Budget a full day to just stare at the reference and adjust bloom/DOF/vignette values.
- **Gate:** Brook signs off on LANDING match.

**Phase 4 — Perf tuning (1–2 days)**
- Measure against perf budget (§5). If over:
  - Reduce particle count, simplify shaders, cap pixel ratio, lower bloom kernel size.
  - Add `frameloop="demand"` or throttled frames when scroll-idle.
- **Gate:** all perf budget numbers green.

**Phase 5 — Ship (0.5 day)**
- Replace iframe in `BackgroundLayer` with dynamic-imported bundled canvas.
- Feature-flag via theme: keep `ralph-world` in the dropdown only once perf gate passes.
- Update `changelog.md` + remove iframe component.

**Phase 6 — More presets (v2, not v1)**
- Each additional preset: capture reference → tune params → ship. ~half day each.

**Total v1:** 6–10 days focused work, comparable to canvas-lab's original INTEGRATION_PLAN.md estimate but producing a production-grade result rather than an AI-first prototype.

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| R3F v9 breaking changes vs canvas-lab's v8 patterns | High | Don't try to port canvas-lab code directly. Rewrite the scene graph using v9 idioms. |
| Visual parity takes longer than budgeted | High | Phase 3 is explicitly a tuning phase. If overrun, ship whatever matches at "good enough" and iterate later. |
| Bundle size exceeds 400KB budget | Medium | Audit imports after Phase 2. three.js full bundle is ~600KB gzipped — selective imports and postprocessing tree-shaking are essential. Drop features before accepting bloat. |
| iOS Safari perf collapse | Medium | Test on real device at end of Phase 2, not Phase 4. Cap pixel ratio to 1.5× on mobile. Consider disabling bloom on mobile if needed. |
| Canvas bug takes down ralph-world deploy | Low | Pre-ship: feature-flag the theme so it's not in the dropdown until green. Error boundary around `<CanvasBackground>`. |
| Duffy's illustrations or other visual content conflict with canvas bg | Low | The iframe version will reveal composition issues before the rebuild. Capture those notes and apply. |

---

## 9. Open decisions

- **Preset v2+ target set.** LANDING is v1. Which 3–4 others? Brook to pick from canvas-lab screenshots once v1 ships.
- **Mobile behavior.** Full canvas on mobile, or a lighter fallback (e.g., static gradient + subtle particles)? Decide at start of Phase 4.
- **Reduced-motion preference.** Honour `prefers-reduced-motion` — slow down or freeze the camera? Probably freeze. Decide at Phase 5.
- **Scroll behavior.** Does the canvas pause when the page scrolls far past the hero? Likely yes (CPU saver). Decide at Phase 4.

---

## 10. When to start

Don't start until Phase 0 (reference pack) is done. The entire rebuild's success hinges on having a fixed visual target — without it, Phase 3 never ends.

Good signal to start: Brook has captured screenshots + MP4 + preset JSON export, and has a free 2-week window without other major ralph-world surface-area work landing.
