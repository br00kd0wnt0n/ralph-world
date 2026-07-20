// Event accent palette. The planet rollout + event flyout render copy
// over the accent, so every entry here pairs a hex with the text colour
// that gives it WCAG AA (≥ 4.5:1) contrast — free-form hex isn't allowed
// in the CMS anymore, so we can't slip into an unreadable pairing.
//
// Purple is the exception that proves the rule: the Ralph brand purple
// (#7B3FE4) is too dark for black text, so it pairs with white. Anything
// else in the palette stays with black.

export type AccentTextColor = 'black' | 'white'

export interface EventAccent {
  key: string
  label: string
  hex: string
  textColor: AccentTextColor
}

export const EVENT_ACCENTS: EventAccent[] = [
  { key: 'teal', label: 'Ralph Teal', hex: '#00C4B4', textColor: 'black' },
  { key: 'pink', label: 'Ralph Pink', hex: '#FF2098', textColor: 'black' },
  { key: 'yellow', label: 'Ralph Yellow', hex: '#FFE566', textColor: 'black' },
  { key: 'green', label: 'Ralph Green', hex: '#4CAF50', textColor: 'black' },
  { key: 'orange', label: 'Ralph Orange', hex: '#FF6B35', textColor: 'black' },
  // Ralph TV / brand purple — dark enough that black copy fails AA
  // against it, so we pair with white text. Contrast vs white ≈ 5.2:1.
  { key: 'purple', label: 'Ralph Purple', hex: '#7B3FE4', textColor: 'white' },
  { key: 'sunshine', label: 'Sunshine', hex: '#FFD166', textColor: 'black' },
  { key: 'cream', label: 'Cream', hex: '#FFF4E4', textColor: 'black' },
  { key: 'sky', label: 'Sky', hex: '#E0F2FE', textColor: 'black' },
]

export const DEFAULT_EVENT_ACCENT = EVENT_ACCENTS[0]

const BY_HEX = new Map(
  EVENT_ACCENTS.map((a) => [a.hex.toLowerCase(), a])
)

// Resolve a stored accent value. Accepts either a preset hex (exact match)
// or a legacy custom hex — returns the matching preset if it lines up,
// otherwise a synthetic "custom" accent (defaults to black text) so legacy
// rows still render.
export function resolveEventAccent(value: string | null | undefined): EventAccent {
  if (!value) return DEFAULT_EVENT_ACCENT
  const hit = BY_HEX.get(value.trim().toLowerCase())
  if (hit) return hit
  if (/^#[0-9a-f]{3,8}$/i.test(value.trim())) {
    return { key: 'custom', label: 'Custom', hex: value.trim(), textColor: 'black' }
  }
  return DEFAULT_EVENT_ACCENT
}

/** Convenience: hex → CSS-ready text colour, e.g. `#FFFFFF` or `#0B0B0B`. */
export function accentTextCss(value: string | null | undefined): string {
  return resolveEventAccent(value).textColor === 'white' ? '#FFFFFF' : '#0B0B0B'
}
