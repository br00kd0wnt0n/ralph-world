import 'server-only'

/**
 * Thin wrapper around the Shopify Admin REST API — Task 1.6.
 *
 * Centralises auth + URL construction + retry-with-backoff so callers
 * (`lib/shopify/customer.ts`) stay readable. We use REST 2024-01 — the
 * Customer endpoints are stable there and don't require GraphQL.
 *
 * Env:
 *   SHOPIFY_STORE_DOMAIN          e.g. ralph-world.myshopify.com
 *   SHOPIFY_ADMIN_ACCESS_TOKEN    Admin API access token (shpat_...)
 *   SHOPIFY_ADMIN_API_VERSION     optional override (default '2024-01')
 *
 * For tests we accept an injected fetch implementation so we don't have
 * to stub global fetch — keeps the surface narrow.
 */

const DEFAULT_API_VERSION = '2024-01'

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>

export interface AdminFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  query?: Record<string, string>
  body?: unknown
  fetchImpl?: FetchLike
  /** Max retries on transient 5xx + 429 + network error. Default 3. */
  maxRetries?: number
  /** Backoff base (ms) for retries. Default 250 (250 → 500 → 1000). */
  backoffBaseMs?: number
  /** For tests: sleep override. */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export class ShopifyAdminError extends Error {
  status: number
  body: string
  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'ShopifyAdminError'
    this.status = status
    this.body = body
  }
}

/**
 * Call the Shopify Admin REST API. Retries idempotent failures
 * (5xx + 429 + network errors) up to `maxRetries`. Non-idempotent
 * 4xx errors (400, 401, 403, 404, 422) throw immediately — they
 * indicate a bug or auth problem, not a transient blip.
 */
export async function shopifyAdminFetch<T = unknown>(
  options: AdminFetchOptions
): Promise<T> {
  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  if (!rawDomain) throw new Error('SHOPIFY_STORE_DOMAIN is not set')
  if (!token) throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN is not set')

  // Normalise: tolerate accidental https://, trailing slash, or surrounding
  // whitespace — the literal concat below would otherwise produce
  // `https://https://…//admin/api/…` and fail with a confusing DNS error.
  // The Admin API ONLY answers on the *.myshopify.com hostname, so reject
  // anything else outright with a clear message.
  const domain = rawDomain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
  if (!/\.myshopify\.com$/i.test(domain)) {
    throw new Error(
      `SHOPIFY_STORE_DOMAIN must be the *.myshopify.com hostname (got "${rawDomain}"). ` +
        `Custom storefront domains (e.g. shop.ralph.world) do not serve the Admin API.`
    )
  }

  const version = process.env.SHOPIFY_ADMIN_API_VERSION || DEFAULT_API_VERSION
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike)
  const sleep = options.sleep ?? defaultSleep
  const maxRetries = options.maxRetries ?? 3
  const backoffBaseMs = options.backoffBaseMs ?? 250

  const qs = options.query
    ? '?' + new URLSearchParams(options.query).toString()
    : ''
  const url = `https://${domain}/admin/api/${version}${options.path}${qs}`
  const init = {
    method: options.method ?? 'GET',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    } as Record<string, string>,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  }

  let attempt = 0
  // Last error we saw, so we can include status info in the thrown message.
  let lastErr: unknown = null
  while (attempt <= maxRetries) {
    try {
      const res = await fetchImpl(url, init)
      if (res.ok) {
        return (await res.json()) as T
      }
      // 429 = rate limited, 5xx = server error → retry.
      if (res.status === 429 || res.status >= 500) {
        const body = await safeText(res)
        lastErr = new ShopifyAdminError(
          `Shopify Admin ${res.status} on ${options.method ?? 'GET'} ${options.path}`,
          res.status,
          body
        )
      } else {
        // 4xx (client error). Don't retry — surface immediately.
        const body = await safeText(res)
        throw new ShopifyAdminError(
          `Shopify Admin ${res.status} on ${options.method ?? 'GET'} ${options.path}`,
          res.status,
          body
        )
      }
    } catch (err) {
      if (err instanceof ShopifyAdminError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err
      }
      lastErr = err
    }
    if (attempt === maxRetries) break
    await sleep(backoffBaseMs * Math.pow(2, attempt))
    attempt += 1
  }
  throw lastErr ?? new Error('shopifyAdminFetch: exhausted retries')
}

async function safeText(res: { text: () => Promise<string> }): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

/**
 * Quick env-check used by ops/admin routes to refuse to run if the
 * Shopify Admin integration isn't fully configured. Cheap, no network.
 */
export function isShopifyAdminConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  )
}
