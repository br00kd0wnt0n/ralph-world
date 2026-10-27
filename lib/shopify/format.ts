// Format a Shopify money amount (a decimal string like "10.0" or "3") to a
// consistent 2-decimal-place string for display, e.g. "10.00" / "3.00".
// Falls back to the raw value if it isn't a finite number.
export function formatPrice(amount: string | number | null | undefined): string {
  const n = Number(amount)
  return Number.isFinite(n) ? n.toFixed(2) : String(amount ?? '')
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  pound: '£',
}

// Shopify product descriptionHtml → plain text that keeps paragraph breaks.
// Shopify's own plain `description` drops <br> and <p> boundaries, so two
// paragraphs run together ("…and Morph.We also…"). Line breaks become "\n";
// render with `white-space: pre-line`.
export function descriptionToText(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
