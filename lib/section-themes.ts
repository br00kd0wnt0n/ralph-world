// Per-section themes. Every pairing here is pre-vetted for WCAG AA
// contrast (≥4.5:1 for body copy). Each section gets its own sub-palette
// so editors can tweak a hero without drifting off-brand — Events can be
// teal / sky / seafoam / cream (cool), Magazine can be orange / sunshine
// / cream / blush (warm), and so on.

export interface SectionTheme {
  key: string
  label: string
  bg: string
  text: string
}

export const SECTION_THEMES: SectionTheme[] = [
  { key: 'ivory', label: 'Ivory', bg: '#FAFAFA', text: '#111111' },
  { key: 'midnight', label: 'Midnight', bg: '#0A0A0A', text: '#FAFAFA' },
  { key: 'cream', label: 'Cream', bg: '#FFF4E4', text: '#2B1810' },
  { key: 'sky', label: 'Sky', bg: '#E0F2FE', text: '#082F49' },
  { key: 'ralph-pink', label: 'Ralph Pink', bg: '#FF2098', text: '#000000' },
  { key: 'ralph-orange', label: 'Ralph Orange', bg: '#FF6B35', text: '#000000' },
  { key: 'ralph-teal', label: 'Ralph Teal', bg: '#00C4B4', text: '#000000' },
  { key: 'ralph-green', label: 'Ralph Green', bg: '#4CAF50', text: '#000000' },
  { key: 'ralph-yellow', label: 'Ralph Yellow', bg: '#FFE566', text: '#111111' },
  { key: 'ralph-purple', label: 'Ralph Purple', bg: '#7B2FBE', text: '#FFFFFF' },
  { key: 'sunshine', label: 'Sunshine', bg: '#FFD166', text: '#1A1A1A' },
  { key: 'seafoam', label: 'Seafoam', bg: '#B2F5EA', text: '#134E4A' },
  { key: 'lavender', label: 'Lavender', bg: '#E9D5FF', text: '#3B0764' },
  { key: 'blush', label: 'Blush', bg: '#FBCFE8', text: '#500724' },
]

// Curated sub-palettes per editable section. First entry is the default
// (matches the current brand colour of each section's design).
export const SECTION_PALETTES = {
  home_hero: ['midnight', 'ivory', 'cream'],
  magazine_hero: ['ralph-orange', 'sunshine', 'cream', 'blush'],
  events_hero: ['ralph-teal', 'sky', 'seafoam', 'cream'],
  tv_hero: ['ralph-pink', 'midnight', 'sunshine', 'ivory'],
  lab_hero: ['ralph-yellow', 'sunshine', 'lavender', 'blush', 'cream'],
  shop_hero: ['ralph-green', 'seafoam', 'cream', 'sunshine'],
  subscribe_modal: ['ralph-purple', 'midnight', 'ivory', 'cream'],
} as const

export type SectionKey = keyof typeof SECTION_PALETTES

const BY_KEY = new Map(SECTION_THEMES.map((t) => [t.key, t]))

export function getSectionPalette(section: SectionKey): SectionTheme[] {
  return SECTION_PALETTES[section]
    .map((k) => BY_KEY.get(k))
    .filter((t): t is SectionTheme => Boolean(t))
}

// Resolve a stored theme key for a given section. Falls back to the first
// preset in that section's palette if the value is missing or not allowed.
export function resolveSectionTheme(
  section: SectionKey,
  value: string | null | undefined
): SectionTheme {
  const allowed = SECTION_PALETTES[section] as readonly string[]
  if (value && allowed.includes(value)) {
    const hit = BY_KEY.get(value)
    if (hit) return hit
  }
  const fallback = BY_KEY.get(allowed[0])
  return fallback ?? SECTION_THEMES[0]
}
