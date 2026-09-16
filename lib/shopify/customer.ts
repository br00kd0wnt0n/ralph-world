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

// ── Customer address update (Task 2.4) ──────────────────────────────

export interface ShopifyAddressInput {
  /** Recipient first name. Shopify is tolerant of missing values. */
  firstName?: string | null
  lastName?: string | null
  /** Street line 1. Shopify field name `address1`. */
  line1: string
  /** Street line 2 (apt / floor / company). Optional. */
  line2?: string | null
  city: string
  /** UK county / US state. Shopify field name `province`. Optional. */
  province?: string | null
  /** Postal code. Shopify field name `zip`. */
  postalCode: string
  /** ISO 3166-1 alpha-2 country code, e.g. 'GB'. Shopify field name `country_code`. */
  country: string
  phone?: string | null
  /** Optional company. */
  company?: string | null
}

/**
 * Stripe Checkout returns shipping addresses in this shape (snake_case,
 * `address` nested under `shipping_details`). Helper bridges the two
 * naming conventions.
 */
export interface StripeAddressLike {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}

export function mapStripeAddressToShopify(
  stripeAddress: StripeAddressLike,
  recipientName?: string | null
): ShopifyAddressInput | null {
  if (!stripeAddress.line1 || !stripeAddress.city || !stripeAddress.postal_code || !stripeAddress.country) {
    return null
  }
  const { first_name, last_name } = splitName(recipientName)
  return {
    firstName: first_name ?? null,
    lastName: last_name ?? null,
    line1: stripeAddress.line1,
    line2: stripeAddress.line2 ?? null,
    city: stripeAddress.city,
    province: stripeAddress.state ?? null,
    postalCode: stripeAddress.postal_code,
    country: stripeAddress.country,
  }
}

/**
 * PUT an address onto a Shopify customer, making it default. Used by
 * the Stripe `checkout.session.completed` webhook handler to mirror
 * the shipping address Stripe collected.
 *
 * Implementation: POST a new address to /customers/{id}/addresses.json,
 * then PUT /customers/{id}/addresses/{addressId}/default.json to make it
 * the default. Two calls, because Shopify rejects a `default: true` key
 * on create with 422 "Unexpected keys given: default" — which is what
 * this function used to send, so it had never succeeded (found
 * 2026-09-16 while backfilling addresses). Side effect: existing
 * addresses stay on the customer record, which is fine for our use case
 * (the cache + Newsstand only read the default).
 *
 * Errors propagate. The webhook handler treats this as best-effort
 * via try/catch — see lib/stripe/webhook-handlers.ts onShippingAddress.
 */
export async function updateCustomerAddress(args: {
  shopifyCustomerId: string
  address: ShopifyAddressInput
  fetchImpl?: FetchLike
}): Promise<{ addressId: string }> {
  const customer = encodeURIComponent(args.shopifyCustomerId)
  const body = {
    address: {
      first_name: args.address.firstName ?? '',
      last_name: args.address.lastName ?? '',
      address1: args.address.line1,
      address2: args.address.line2 ?? '',
      city: args.address.city,
      province: args.address.province ?? '',
      zip: args.address.postalCode,
      country_code: args.address.country,
      phone: args.address.phone ?? '',
      company: args.address.company ?? '',
    },
  }
  const res = await shopifyAdminFetch<{ customer_address?: { id: number | string } }>({
    method: 'POST',
    path: `/customers/${customer}/addresses.json`,
    body,
    fetchImpl: args.fetchImpl,
  })
  if (!res.customer_address?.id) {
    throw new Error('Shopify POST /customers/{id}/addresses.json returned no id')
  }
  const addressId = String(res.customer_address.id)
  await shopifyAdminFetch({
    method: 'PUT',
    path: `/customers/${customer}/addresses/${encodeURIComponent(addressId)}/default.json`,
    fetchImpl: args.fetchImpl,
  })
  return { addressId }
}

// ── Default address read (magazine fulfilment) ─────────────────────

/**
 * Shipping address in the shape Shopify's Admin REST `orders.json`
 * expects under `shipping_address`. Field names match the API.
 */
export interface ShopifyOrderShippingAddress {
  first_name: string
  last_name: string
  address1: string
  address2: string
  city: string
  province: string
  zip: string
  country_code: string
  phone: string
  company: string
}

interface ShopifyCustomerGetResponse {
  customer?: {
    id: number | string
    default_address?: {
      first_name?: string | null
      last_name?: string | null
      address1?: string | null
      address2?: string | null
      city?: string | null
      province?: string | null
      zip?: string | null
      country_code?: string | null
      phone?: string | null
      company?: string | null
    } | null
  }
}

/**
 * Fetch a customer's default address, shaped for an order's
 * `shipping_address`. Returns null when the customer has no default
 * address or the address is missing a field Newsstand can't ship
 * without (street, city, postcode, country).
 *
 * Why this exists: Shopify does NOT copy the customer's default address
 * onto an order created via the Admin API when `shipping_address` is
 * omitted. The fulfilment job used to rely on that, and the resulting
 * orders had no address at all (order #1565, 2026-06-22). The caller
 * must pass this explicitly.
 */
export async function getCustomerDefaultAddress(args: {
  shopifyCustomerId: string
  fetchImpl?: FetchLike
}): Promise<ShopifyOrderShippingAddress | null> {
  const res = await shopifyAdminFetch<ShopifyCustomerGetResponse>({
    method: 'GET',
    path: `/customers/${encodeURIComponent(args.shopifyCustomerId)}.json`,
    query: { fields: 'id,default_address' },
    fetchImpl: args.fetchImpl,
  })
  const a = res.customer?.default_address
  if (!a) return null
  if (!a.address1 || !a.city || !a.zip || !a.country_code) return null
  return {
    first_name: a.first_name ?? '',
    last_name: a.last_name ?? '',
    address1: a.address1,
    address2: a.address2 ?? '',
    city: a.city,
    province: a.province ?? '',
    zip: a.zip,
    country_code: a.country_code,
    phone: a.phone ?? '',
    company: a.company ?? '',
  }
}
