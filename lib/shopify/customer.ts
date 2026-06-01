import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { shopifyLinks } from '@/lib/db/schema'
import { logAction } from '@/lib/audit'
import { shopifyAdminFetch, type FetchLike } from './admin-client'

/**
 * Shopify customer auto-create — Task 1.6, arch doc §11.
 *
 * Called from Auth.js createUser (background, fire-and-forget). Ensures
 * every Ralph.world user has a corresponding Shopify customer record so
 * downstream features (orders, magazine fulfillment, marketing segments)
 * have a stable identity to hang off.
 *
 * Algorithm (per arch doc §11 "Account linking — every Ralph.world user
 * gets a Shopify customer"):
 *
 *   1. Already linked? (shopify_links row exists) → return existing.
 *   2. Search Shopify Customer API by email.
 *   3. Match found → write shopify_links (method='auto_email_match_at_signup').
 *   4. No match → POST customers.json → write shopify_links
 *      (method='auto_signup_create').
 *   5. Audit log either way.
 *
 * Idempotent on email + on (userId). Multiple invocations for the same
 * user are safe — step 1 short-circuits, and the shopify_customer_id
 * unique constraint on shopify_links catches the race.
 */

export type LinkMethod =
  | 'auto_signup_create'
  | 'auto_email_match_at_signup'
  | 'auto_checkout'
  | 'manual_verification'
  | 'admin'

export interface FindOrCreateCustomerInput {
  userId: string
  email: string
  name?: string | null
  /** Inject fetch for tests. Defaults to globalThis.fetch via shopifyAdminFetch. */
  fetchImpl?: FetchLike
}

export interface FindOrCreateCustomerResult {
  shopifyCustomerId: string
  method: LinkMethod
  alreadyLinked: boolean
}

interface ShopifyCustomersListResponse {
  customers?: Array<{ id: number | string; email?: string }>
}

interface ShopifyCustomerCreateResponse {
  customer?: { id: number | string; email?: string }
}

export async function findOrCreateCustomer(
  input: FindOrCreateCustomerInput
): Promise<FindOrCreateCustomerResult> {
  const db = getDb()

  // 1. Already linked?
  const existing = await db
    .select()
    .from(shopifyLinks)
    .where(eq(shopifyLinks.userId, input.userId))
    .limit(1)
  if (existing[0]) {
    return {
      shopifyCustomerId: existing[0].shopifyCustomerId,
      method: existing[0].linkMethod as LinkMethod,
      alreadyLinked: true,
    }
  }

  // 2. Search by email.
  const email = input.email.trim().toLowerCase()
  const list = await shopifyAdminFetch<ShopifyCustomersListResponse>({
    method: 'GET',
    path: '/customers/search.json',
    query: { query: `email:${email}` },
    fetchImpl: input.fetchImpl,
  })
  const matched = list.customers?.find((c) => c.email?.toLowerCase() === email)

  let shopifyCustomerId: string
  let method: LinkMethod
  if (matched) {
    shopifyCustomerId = String(matched.id)
    method = 'auto_email_match_at_signup'
  } else {
    // 3. Create.
    const created = await shopifyAdminFetch<ShopifyCustomerCreateResponse>({
      method: 'POST',
      path: '/customers.json',
      body: { customer: { email, ...splitName(input.name) } },
      fetchImpl: input.fetchImpl,
    })
    if (!created.customer?.id) {
      throw new Error('Shopify customers.json returned no customer id')
    }
    shopifyCustomerId = String(created.customer.id)
    method = 'auto_signup_create'
  }

  // 4. Write shopify_links. Race-safe on shopify_customer_id unique.
  try {
    await db.insert(shopifyLinks).values({
      userId: input.userId,
      shopifyCustomerId,
      linkMethod: method,
    })
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code !== '23505') throw err
    // Concurrent invocation won — fall through with the customer id we
    // got back; the existing row is the same one we'd have written.
  }

  // 5. Audit. logAction swallows errors so we don't need to wrap it.
  await logAction({
    actorId: null,
    action: 'shopify_link_created',
    targetType: 'user',
    targetId: input.userId,
    after: { shopifyCustomerId, method },
    source: 'system',
  })

  return { shopifyCustomerId, method, alreadyLinked: false }
}

/**
 * Split a display name into Shopify's first/last fields. Shopify is
 * tolerant of missing values — empty first_name + last_name is fine.
 */
function splitName(name?: string | null): { first_name?: string; last_name?: string } {
  if (!name) return {}
  const trimmed = name.trim()
  if (!trimmed) return {}
  const idx = trimmed.indexOf(' ')
  if (idx === -1) return { first_name: trimmed }
  return { first_name: trimmed.slice(0, idx), last_name: trimmed.slice(idx + 1) }
}
