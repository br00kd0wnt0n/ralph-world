import 'server-only'

/**
 * Minimal in-memory fixed-window rate limiter — a launch backstop against
 * brute-force / email-bombing / log-flooding on unauthenticated endpoints.
 *
 * Module-scope Map persists across requests on Railway's long-running Node
 * process. If a service scales horizontally the limit becomes per-instance
 * (acceptable for a backstop; put Cloudflare/WAF in front for the real
 * ceiling). Keys should be namespaced, e.g. `signup:<ip>` or `reset:<email>`.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** Returns true if the caller is OVER the limit (i.e. should be rejected). */
export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    // Opportunistic cleanup so the map can't grow without bound.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k)
    }
    return false
  }
  b.count += 1
  return b.count > limit
}

/** Best-effort client IP from proxy headers (Railway sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
