# Lab — Handoff Contract for Josh

## RalphOMatic state machine

```
idle ──pull lever──▶ lever-pulled ──(300ms)──▶ spinning ──(2500ms)──▶ settled
                                                                          │
                                                                          └──pull again──▶ reset to idle
```

### State behaviours
- **idle**: lever up, lights dim (0.4), bell jars static, belt still
- **lever-pulled**: lever rotates down 60deg, lights start flashing (sets state to spinning after 300ms)
- **spinning**: lever down, lights flashing, conveyor items cycling, bell jars static, spinner shows inside jars
- **settled**: one item "appears" under center bell jar (scales + bobs), lights steady at full brightness. Clicking the center bell jar opens the item's external URL.

## Props (RalphOMatic.types.ts)
```ts
{
  items: LabItem[]
  state: MachineState
  onLeverPull: () => void
  onItemSelect: (itemId: string) => void
  settledItemId?: string | null
  machineIllustration?: ComponentType<{ state: MachineState }>
  conveyorIllustration?: ComponentType<{ state: MachineState }>
}
```

If `machineIllustration` or `conveyorIllustration` are not provided, the CSS placeholders render with a state label in the corner for debugging.

## Duffy asset slots
- **Machine illustration** — drops in via `machineIllustration` prop. Component receives `state` so the SVG can swap layers (lever up/down, lights on/off).
- **Conveyor illustration** — drops in via `conveyorIllustration` prop. Receives `state` for belt animation. Should expose 3 positions for the bell jars.
- **Bell jar SVG** — can either be baked into `conveyorIllustration` or imported inline. Center jar is the target.

## Animation variants (lib/animation/lab.ts)
- `leverVariants` — idle / pulled / reset rotation
- `lightsVariants` — idle / active (flashing) / settled
- `conveyorVariants` — idle / spinning / settled
- `bellJarVariants` — idle / highlighted (hop + scale loop)
- `labCardVariants` — grid reveal on scroll

## Items
Fetched from `lab_items` table where `status='published'`, ordered by `sort_order` then `published_at desc`.

- **Badge**: fully CMS-controlled via the `badge` field. `FRESH` → yellow, `NEW` → teal, other values → pink fallback
- **Paid gate**: if `accessTier === 'paid'` and user not paid, lock overlay on card

## Flow
1. User lands on /lab
2. Sees hero + idle machine + all items in grid below
3. Clicks lever → machine animates, picks random item, "settles" in center bell jar
4. User clicks center bell jar → external URL opens in new tab
