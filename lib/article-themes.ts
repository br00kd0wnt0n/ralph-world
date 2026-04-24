// Article canvas themes. Each pairs a background with a copy colour and is
// pre-vetted for WCAG AA contrast (≥ 4.5:1 for body copy). Pick from these
// rather than free-form hex so the public article view is always readable.
//
// The theme key is stored in articles.background_canvas_colour. Legacy rows
// that still hold a raw hex string fall back to `ivory`-style rendering with
// the hex as background and dark copy — see resolveTheme.

export interface ArticleTheme {
  key: string
  label: string
  bg: string
  text: string
}

export const ARTICLE_THEMES: ArticleTheme[] = [
  { key: 'ivory', label: 'Ivory', bg: '#FAFAFA', text: '#111111' },
  { key: 'midnight', label: 'Midnight', bg: '#0A0A0A', text: '#FAFAFA' },
  { key: 'cream', label: 'Cream', bg: '#FFF4E4', text: '#2B1810' },
  { key: 'sky', label: 'Sky', bg: '#E0F2FE', text: '#082F49' },
  { key: 'sunshine', label: 'Sunshine', bg: '#FFE566', text: '#1A1A1A' },
  { key: 'seafoam', label: 'Seafoam', bg: '#B2F5EA', text: '#134E4A' },
  { key: 'lavender', label: 'Lavender', bg: '#E9D5FF', text: '#3B0764' },
  { key: 'blush', label: 'Blush', bg: '#FBCFE8', text: '#500724' },
]

export const DEFAULT_THEME = ARTICLE_THEMES[0]

const THEMES_BY_KEY = new Map(ARTICLE_THEMES.map((t) => [t.key, t]))

// Resolve a stored value to a theme. Accepts:
//  - a known theme key ("ivory", "midnight", …)
//  - a legacy hex string (e.g. "#FAFAFA") — renders with dark copy
//  - null / empty → default theme
export function resolveTheme(value: string | null | undefined): ArticleTheme {
  if (!value) return DEFAULT_THEME
  const known = THEMES_BY_KEY.get(value)
  if (known) return known
  if (/^#[0-9a-f]{3,8}$/i.test(value.trim())) {
    return { key: 'legacy', label: 'Legacy', bg: value.trim(), text: '#111111' }
  }
  return DEFAULT_THEME
}
