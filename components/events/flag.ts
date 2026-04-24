// ISO 3166-1 alpha-2 → regional indicator symbols → flag emoji.
// Returns '' if the code isn't a pair of letters so callers can fall back.
export function flagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode) return ''
  const code = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(
    127397 + code.charCodeAt(0),
    127397 + code.charCodeAt(1)
  )
}
