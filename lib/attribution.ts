/**
 * Campaign attribution — the utm_* tags on an inbound link.
 *
 * Pure + isomorphic. Values are read from the URL and passed along
 * explicitly (checkout request, signup form, OAuth callbackUrl); nothing is
 * written to cookies or browser storage, so no consent is needed to carry
 * them.
 */

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export type UtmKey = (typeof UTM_KEYS)[number]
export type Attribution = Partial<Record<UtmKey, string>>

const MAX_VALUE_LENGTH = 100

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  // Strip control characters; these values end up on Shopify orders and in
  // the audit log.
  const v = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_VALUE_LENGTH)
  return v || null
}

/** Pick the known utm_* keys out of URL params or an untrusted object. */
export function pickAttribution(
  input: URLSearchParams | FormData | Record<string, unknown> | null | undefined
): Attribution {
  const out: Attribution = {}
  if (!input) return out
  const read = (key: string): unknown =>
    input instanceof URLSearchParams || input instanceof FormData
      ? input.get(key)
      : input[key]
  for (const key of UTM_KEYS) {
    const v = clean(read(key))
    if (v) out[key] = v
  }
  return out
}

/** Append attribution to a same-site path, e.g. an OAuth callbackUrl. */
export function withAttribution(path: string, attribution: Attribution): string {
  const [base, query = ''] = path.split('?')
  const sp = new URLSearchParams(query)
  for (const key of UTM_KEYS) {
    const v = attribution[key]
    if (v) sp.set(key, v)
  }
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}
