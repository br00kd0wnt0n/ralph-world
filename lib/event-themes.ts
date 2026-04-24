// Event accent palette. The planet rollout + event flyout render copy as
// black over the accent, so every entry here is pre-vetted to hit WCAG AA
// (≥ 4.5:1 contrast) against black text — free-form hex isn't allowed in
// the CMS anymore, so we can't slip into an unreadable pairing.

export interface EventAccent {
  key: string
  label: string
  hex: string
}

export const EVENT_ACCENTS: EventAccent[] = [
  { key: 'teal', label: 'Ralph Teal', hex: '#00C4B4' },
  { key: 'pink', label: 'Ralph Pink', hex: '#FF2098' },
  { key: 'yellow', label: 'Ralph Yellow', hex: '#FFE566' },
  { key: 'green', label: 'Ralph Green', hex: '#4CAF50' },
  { key: 'orange', label: 'Ralph Orange', hex: '#FF6B35' },
  { key: 'sunshine', label: 'Sunshine', hex: '#FFD166' },
  { key: 'cream', label: 'Cream', hex: '#FFF4E4' },
  { key: 'sky', label: 'Sky', hex: '#E0F2FE' },
]

export const DEFAULT_EVENT_ACCENT = EVENT_ACCENTS[0]

const BY_HEX = new Map(
  EVENT_ACCENTS.map((a) => [a.hex.toLowerCase(), a])
)

// Resolve a stored accent value. Accepts either a preset hex (exact match)
// or a legacy custom hex — returns the matching preset if it lines up,
// otherwise a synthetic "custom" accent so legacy rows still render.
export function resolveEventAccent(value: string | null | undefined): EventAccent {
  if (!value) return DEFAULT_EVENT_ACCENT
  const hit = BY_HEX.get(value.trim().toLowerCase())
  if (hit) return hit
  if (/^#[0-9a-f]{3,8}$/i.test(value.trim())) {
    return { key: 'custom', label: 'Custom', hex: value.trim() }
  }
  return DEFAULT_EVENT_ACCENT
}
