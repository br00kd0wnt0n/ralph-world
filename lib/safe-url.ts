// URL safety for editor-controlled outbound links. Editors can paste
// arbitrary strings into "external URL" fields across Articles, Events,
// Lab, Case Studies — and those values get rendered as <a href> and
// passed to window.open() on the public site. Without validation, a
// malicious or pasted-by-mistake `javascript:` / `data:` URL becomes an
// XSS vector on every visitor who clicks.
//
// Policy: http:, https:, mailto: allowed; everything else rejected.
// Empty input is allowed (it just means "no link").

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

export function isSafeUrl(input: string | null | undefined): boolean {
  if (!input) return true
  const trimmed = input.trim()
  if (!trimmed) return true
  try {
    const url = new URL(trimmed)
    return ALLOWED_PROTOCOLS.has(url.protocol)
  } catch {
    // Not a parseable URL — reject. Editors can paste relative paths
    // only for in-site links; outbound fields must be absolute.
    return false
  }
}

export function sanitizeUrl(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  return isSafeUrl(trimmed) ? trimmed : null
}
