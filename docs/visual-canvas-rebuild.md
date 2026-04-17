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

### 2.1 Reference pack (captured 2026-04-17)

Stored at `public/visual canvas refs/` — **gitignored** (big binaries, local-only).

| File | Content | Apparent preset |
|---|---|---|
| `Screenshot 2026-04-17 at 12.17.51 PM.png` | Warm organic reds/oranges/pinks. Heavy bloom, soft DOF, blob-dominant composition. Dark background with magenta atmospheric fog. | **LANDING** — v1 target |
| `Screenshot 2026-04-17 at 12.18.00 PM.png` | Hot magenta/pink with dark cube silhouettes backlit through bloom. Dramatic contrast. | **LANDING** (different camera angle) |
| `Screenshot 2026-04-17 at 12.19.44 PM.png` | Clearly geometric — cubes with visible edges in purples/teals/greens. Less bloom, more defined forms, particle specks visible. | **MultiColor** — v2+ target |
| `Screenshot 2026-04-17 at 12.20.12 PM.png` | Black background with flowing red trail curves. Near-zero bloom. Very cinematic. | **TRAILS** — v2+ target (if scoped in) |
| `visual canvas capture.mov` | 10s+ screen capture. Auto-pan cadence reference. | — |

Brook to confirm the preset→image mapping before Phase 1 starts.

### 2.2 Visual character (what makes it Ralph's canvas)

Across the references, a consistent aesthetic:

- **Bloom is the signature.** Almost every shape has a soft halo that blends with its neighbours. Not a subtle post-effect — it's doing most of the perceived "lighting."
- **Volumetric fog tints the air.** LANDING's enabled `volumetric` effect (magenta fog at density 0.6) gives the reds/pinks that hazy glow in images 1–2. Without it the shapes feel floaty and disconnected.
- **Shapes are organic, not geometric-perfect.** `organicness` values of 0.6–2.0 on spheres/cubes/toruses deform the geometry so nothing reads as a textbook primitive.
- **Motion is slow and orbital.** Camera auto-pans in a gentle circle; shapes follow `verticalSine` or `orbit` movement patterns. No jitter, no flash cuts.
- **Palettes are hand-picked per preset** — LANDING is warm (yellow, orange, pink, magenta); MultiColor is cool (teal, purple, green); TRAILS is monochrome red. The engine has to render any palette convincingly.

### 2.3 Acceptance criteria
- Side-by-side with the LANDING reference at the captured camera angles: **≥95% perceived visual match** (Brook's judgement call — no numeric metric).
- Same "liveness" — auto-pan cadence, glow pulse, particle movement feel — matches within perceptual tolerance. Use `visual canvas capture.mov` to calibrate.
- Works on Chrome (desktop + Android), Safari (macOS + iOS 16+), Firefox desktop.

### 2.4 What "95%" rules out
Don't chase: subtle shader noise variations, exact RNG seeds, pixel-accurate bloom kernels. Do chase: overall palette, composition, motion character, depth/atmosphere, bloom+DOF interaction.

---

## 3. Scope

### LANDING preset parameter inventory (from canvas-lab cloud preset `68b1c687dd68f9f4d2c5503e`)

This is the actual JSON LANDING uses — the v1 engine must support every enabled item here.

**Geometric shapes (all five types enabled):**
```
spheres:  count 18,  size 13.4, color #fbc000, opacity 0.3, organicness 0.6, movement verticalSine, distance 2
cubes:    count 11,  size 12,   color #31bdbf, opacity 0.8, organicness 1.8, movement verticalSine, distance 1.2
toruses:  count 17,  size 8.7,  color #eb008b, opacity 0.7, organicness 2,   movement orbit,        distance 6.4
blobs:    count 7,   size 12.3, color #f16524, opacity 1,   organicness 2,   movement orbit,        distance 7.9
crystals: count 8,   size 1,    color #4ecdc4, opacity 0.9, complexity 16,   organicness 0.2
```

**Particles:** count 453, size 4.05, color #ffffff, speed 4.8, opacity 1, spread 75.9, movement orbit.

**Global effects enabled in LANDING:**
- `volumetric` — fog 0.5, density 0.6, color #eb00eb (magenta atmospheric)
- Per-shape trails (sphereTrails, cubeTrails, etc. — each has enabled:true with length/opacity/width/fadeRate)

**Global effects disabled in LANDING** (but in the canvas-lab and potentially used by other presets):
- `atmosphericBlur`, `colorBlending`, `shapeGlow`, `chromatic`, `distortion`, `particleInteraction`, `waveInterference`, `metamorphosis`, `fireflies`, `layeredSineWaves`

**Bloom / DOF / vignette** aren't in the preset JSON — they're on by default in the canvas-lab's post-processing chain with global-defaults values. Rebuild must include them with per-preset override capability.

### Movement patterns to support
Five patterns seen across LANDING + MultiColor + TRAILS presets: `verticalSine`, `orbit`, `random`, `drift`, `static`. Each takes `speed` and `distance` as primary params.

### In (v1 — LANDING)
- **Five shape types:** spheres, cubes, toruses, blobs, crystals — each with count/size/color/opacity/organicness/movement/distance.
- **Particle system** — count/size/color/speed/opacity/spread/movement/distance.
- **Post-processing stack:** bloom + DOF + vignette + **volumetric fog** (fog colour tints the whole scene).
- **Per-shape trails** — length/opacity/width/fadeRate per shape type. LANDING uses these heavily.
- **Camera:** auto-pan orbit around origin. No manual controls.
- **Preset format:** static JSON, committed in-repo. Schema in §6.3.
- Theme integration via `BackgroundLayer` when `theme === 'ralph-world'`.

### In (v2 — additional presets)
Scope pending Brook's v2 picks. Likely:
- **MultiColor** — same engine, different palette and shape mix. Probably no new systems needed.
- **TRAILS** — trail-heavy look. v1 already needs trails for LANDING; TRAILS just pushes trail length/opacity higher.

### Out (hard cut)
- ~~AI theme analysis / OpenAI integration~~
- ~~Weather-based parameter mapping / OpenWeather~~
- ~~Cloud presets / MongoDB~~
- ~~Preset share URLs / QR codes~~
- ~~In-canvas admin UI, dashboards, sliders, tooltips~~
- ~~Preset transitions (animate between presets) — v3 if ever~~
- ~~Manual camera controls (orbit controls, zoom)~~
- ~~`waveInterference`, `metamorphosis`, `fireflies`, `layeredSineWaves` effects~~ — unless a chosen v2 preset needs them, in which case scope bump.

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

### 6.3 Preset schema (JSON) — mirrors canvas-lab field names to ease porting
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
    "spheres":  { "count": 18, "size": 13.4, "color": "#fbc000", "speed": 0.5, "rotation": 0.92, "opacity": 0.3, "organicness": 0.6, "movementPattern": "verticalSine", "distance": 2 },
    "cubes":    { "count": 11, "size": 12,   "color": "#31bdbf", "speed": 0.1, "rotation": 0.1,  "opacity": 0.8, "organicness": 1.8, "movementPattern": "verticalSine", "distance": 1.2 },
    "toruses":  { "count": 17, "size": 8.7,  "color": "#eb008b", "speed": 0.1, "rotation": 0,    "opacity": 0.7, "organicness": 2,   "movementPattern": "orbit",        "distance": 6.4 },
    "blobs":    { "count": 7,  "size": 12.3, "color": "#f16524", "speed": 0.1, "opacity": 1,     "organicness": 2, "movementPattern": "orbit", "distance": 7.9 },
    "crystals": { "count": 8,  "size": 1,    "color": "#4ecdc4", "opacity": 0.9, "complexity": 16, "organicness": 0.2 }
  },
  "particles": {
    "count": 453, "size": 4.05, "color": "#ffffff",
    "speed": 4.8, "opacity": 1, "spread": 75.9,
    "movementPattern": "orbit", "distance": 8.8
  },
  "trails": {
    "spheres":   { "enabled": true, "length": 150, "opacity": 0.6, "width": 0.8, "fadeRate": 0.3 },
    "cubes":     { "enabled": true, "length": 120, "opacity": 0.5, "width": 0.7, "fadeRate": 0.4 },
    "toruses":   { "enabled": true, "length": 100, "opacity": 0.5, "width": 0.6, "fadeRate": 0.5 },
    "blobs":     { "enabled": true, "length": 200, "opacity": 0.7, "width": 0.9, "fadeRate": 0.2 },
    "particles": { "enabled": true, "length": 300, "opacity": 0.8, "width": 0.3, "fadeRate": 0.1 }
  },
  "effects": {
    "bloom":      { "intensity": 1.2, "threshold": 0.4, "smoothing": 0.2 },
    "dof":        { "focusDistance": 0.01, "focalLength": 0.05, "bokehScale": 3 },
    "vignette":   { "offset": 0.3, "darkness": 0.6 },
    "volumetric": { "fog": 0.5, "density": 0.6, "color": "#eb00eb" }
  }
}
```
- Fields mirror canvas-lab param names so preset porting is mostly copy-paste.
- `bloom` / `dof` / `vignette` aren't in canvas-lab preset JSON — Brook tunes defaults in the rebuild to match the LANDING look, then exposes per-preset overrides.
- Brook hand-converts each preset from canvas-lab's store dump. No automatic importer.

---

## 7. Phases (vertical slices, not layer-by-layer)

**Phase 0 — Reference pack (DONE 2026-04-17)**
- ✅ 4 screenshots + 10s+ MP4 capture in `public/visual canvas refs/` (gitignored).
- ✅ LANDING preset JSON captured inline in §3 of this doc.
- ☐ Brook to confirm the screenshot→preset mapping and sign off on LANDING as v1 target.

**Phase 1 — Scaffolding (1 day)**
- Install R3F v9, three, postprocessing, zustand in ralph-world.
- Create `lib/canvas/` + `components/canvas/` structure.
- Dynamic-imported `<CanvasBackground>` renders a single static sphere on a black background when theme is RALPH WORLD.
- Verify bundle split: confirm no canvas code in the main chunk.
- **Gate:** measure current gzipped size of the canvas chunk (should be <200KB with only a sphere).

**Phase 2 — LANDING vertical slice (3–4 days — bumped for 5 shape types + trails + volumetric)**
- Implement all 5 shape types (spheres, cubes, toruses, blobs, crystals) with organic deformation.
- Particle system (single system supporting all movement patterns).
- Per-shape trails (render as line strips from position history).
- Auto-pan camera (orbit around origin at fixed radius + slow Y drift).
- Post-processing chain: bloom → DOF → vignette → volumetric fog.
- Preset JSON loader that maps JSON → scene state.
- Don't tune — just get every enabled LANDING feature rendering end-to-end.
- **Gate:** side-by-side against images 1–2. Document every visible delta (fog wrong colour? trails too short? cube organicness too weak?).

**Phase 3 — Visual parity (3–5 days, the messy one — bumped)**
- Tune until side-by-side match is ≥95%.
- Previous rebuilds stalled here. Budget a full day each for: (a) bloom/DOF tuning, (b) volumetric fog + colour grading, (c) shape organicness + trails, (d) camera cadence against the MP4.
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

**Total v1:** 8–13 days focused work (revised up from 6–10 after parameter inventory — 5 shape types + trails + volumetric fog is bigger than initially scoped).

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

- **Preset→screenshot mapping.** Brook to confirm which reference image corresponds to which preset. Current guess in §2.1.
- **Preset v2+ target set.** LANDING is v1. MultiColor + TRAILS are likely v2 (both shown in the reference pack). Anything else?
- **Crystals shape.** LANDING uses 8 crystals at size 1 with `complexity 16`. The canvas-lab implements these as procedurally-generated geometry — non-trivial. If they barely contribute visually at that size, consider dropping from v1 and adding in v2.
- **Blob geometry.** Blobs in canvas-lab are soft metaball-style. Implementing properly needs marching cubes or a sphere-merge shader. For v1 could fake as large low-res spheres with high organicness — verify acceptability during Phase 3.
- **Mobile behavior.** Full canvas, or a lighter fallback (e.g., static gradient + subtle particles)? Decide at start of Phase 4.
- **Reduced-motion preference.** Honour `prefers-reduced-motion` — slow down or freeze the camera? Probably freeze.
- **Scroll behavior.** Pause canvas when the page scrolls far past the hero? Likely yes (CPU saver).
- **Iframe theme fate.** When the bundled version ships, do we remove the iframe-backed `ralph-world` theme entirely, or keep it as a fallback (e.g., feature flag)? Probably remove — one way to do a thing.

---

## 10. When to start

Don't start until Phase 0 (reference pack) is done. The entire rebuild's success hinges on having a fixed visual target — without it, Phase 3 never ends.

Good signal to start: Brook has captured screenshots + MP4 + preset JSON export, and has a free 2-week window without other major ralph-world surface-area work landing.
