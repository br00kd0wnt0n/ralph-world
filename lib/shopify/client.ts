import type { ShopifyProduct, ShopifyCart, ProductSummary } from './types'
import {
  GET_PRODUCTS_BY_COLLECTION,
  GET_ALL_PRODUCTS,
  GET_PRODUCT_BY_HANDLE,
  CREATE_CART,
  createCartWithAttributesMutation,
  cartCheckoutUrlQuery,
  CREATE_SUBSCRIPTION_CART,
  GET_VARIANT_SELLING_PLANS,
  ADD_CART_LINES,
  UPDATE_CART_LINES,
  REMOVE_CART_LINES,
  GET_CART,
} from './queries'
import {
  getMockProducts,
  getAllMockProducts,
  getMockProduct,
  isShopifyConfigured,
} from './mock'

interface ShopifyResponse<T> {
  data?: T
  errors?: { message: string }[]
}

const TIMEOUT_MS = 5000
const DEFAULT_REVALIDATE = 300 // 5 minutes

// visitorConsent on @inContext needs Storefront API 2025-10 or later. Only
// the checkout-URL calls use it; everything else stays on the env version.
const CONSENT_API_VERSION = '2025-10'

export function withApiVersion(url: string, version: string): string {
  return url.replace(/\/api\/[^/]+\/graphql\.json/, `/api/${version}/graphql.json`)
}

async function storefront<T>(
  query: string,
  variables: Record<string, unknown> = {},
  revalidate: number | false = DEFAULT_REVALIDATE,
  apiVersion?: string
): Promise<T | null> {
  const envUrl = process.env.SHOPIFY_STOREFRONT_URL
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN

  if (!envUrl || !token) return null
  const url = apiVersion ? withApiVersion(envUrl, apiVersion) : envUrl

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
      next: revalidate === false ? undefined : { revalidate },
      ...(revalidate === false && { cache: 'no-store' as const }),
    })

    if (!res.ok) return null

    const json = (await res.json()) as ShopifyResponse<T>
    if (json.errors) {
      console.error('Shopify errors:', json.errors)
      return null
    }
    return json.data ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export function toProductSummary(p: ShopifyProduct): ProductSummary {
  const firstVariant = p.variants.edges[0]?.node
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    price: p.priceRange.minVariantPrice.amount,
    currency: p.priceRange.minVariantPrice.currencyCode,
    imageUrl:
      p.productShotMetafield?.reference?.image?.url ??
      p.featuredImage?.url ??
      null,
    available: p.availableForSale,
    productType: p.productType ?? '',
    tags: p.tags ?? [],
    variantId: firstVariant?.id ?? '',
    date: p.dateMetafield?.value ?? null,
  }
}

export async function getAllProducts(
  first = 50,
  options: { sortKey?: 'CREATED_AT' | 'UPDATED_AT' | 'TITLE' | 'BEST_SELLING' | 'PRICE' | 'ID'; reverse?: boolean } = {}
): Promise<ProductSummary[]> {
  if (!isShopifyConfigured()) {
    return getAllMockProducts()
  }

  const data = await storefront<{
    products: { edges: { node: ShopifyProduct }[] }
  }>(GET_ALL_PRODUCTS, { first, sortKey: options.sortKey, reverse: options.reverse })

  if (!data?.products) return []
  return data.products.edges.map((e) => toProductSummary(e.node))
}

export async function getProductsByCollection(
  handle: string,
  first = 20
): Promise<ProductSummary[]> {
  if (!isShopifyConfigured()) {
    return getMockProducts(handle)
  }

  const data = await storefront<{
    collection: { products: { edges: { node: ShopifyProduct }[] } } | null
  }>(GET_PRODUCTS_BY_COLLECTION, { handle, first })

  if (!data?.collection) return []
  return data.collection.products.edges.map((e) => toProductSummary(e.node))
}

export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  if (!isShopifyConfigured()) {
    return getMockProduct(handle)
  }

  const data = await storefront<{ product: ShopifyProduct | null }>(
    GET_PRODUCT_BY_HANDLE,
    { handle }
  )
  return data?.product ?? null
}

export async function createCart(variantId?: string): Promise<ShopifyCart | null> {
  const lines = variantId ? [{ merchandiseId: variantId, quantity: 1 }] : []
  const data = await storefront<{
    cartCreate: { cart: ShopifyCart | null; userErrors: unknown[] }
  }>(CREATE_CART, { lines }, false)
  return data?.cartCreate?.cart ?? null
}

// One-line cart with order attributes, for buy-now flows that skip the cart
// drawer. Returns the Shopify-hosted checkoutUrl, or null on failure.
// `consent` is the visitor's cookie banner choice, built into the URL so
// Shopify checkout honours it (see visitorConsentDirective in queries.ts).
export async function createCheckoutUrl(
  variantId: string,
  attributes: Record<string, string>,
  consent?: boolean
): Promise<string | null> {
  const variables = {
    lines: [{ merchandiseId: variantId, quantity: 1 }],
    attributes: Object.entries(attributes).map(([key, value]) => ({ key, value })),
  }
  type Res = {
    cartCreate: { cart: { id: string; checkoutUrl: string } | null; userErrors: unknown[] }
  }
  const data = await storefront<Res>(
    createCartWithAttributesMutation(consent),
    variables,
    false,
    CONSENT_API_VERSION
  )
  const url = data?.cartCreate?.cart?.checkoutUrl
  if (url) return url
  // Never block a sale on consent: retry the old way (no consent in the URL).
  if (consent === undefined) return null
  const plain = await storefront<Res>(createCartWithAttributesMutation(undefined), variables, false)
  return plain?.cartCreate?.cart?.checkoutUrl ?? null
}

// Fresh checkoutUrl for an existing cart, carrying the visitor's current
// consent. Shopify fixes consent into each URL when it's issued, so the
// basket asks for a new one at checkout time rather than reusing the URL
// from when the cart was created.
export async function getCheckoutUrl(
  cartId: string,
  consent?: boolean
): Promise<string | null> {
  const data = await storefront<{ cart: { checkoutUrl: string } | null }>(
    cartCheckoutUrlQuery(consent),
    { id: cartId },
    false,
    CONSENT_API_VERSION
  )
  return data?.cart?.checkoutUrl ?? null
}

export async function addCartLines(
  cartId: string,
  variantId: string,
  quantity = 1
): Promise<ShopifyCart | null> {
  const data = await storefront<{
    cartLinesAdd: { cart: ShopifyCart | null; userErrors: unknown[] }
  }>(ADD_CART_LINES, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
  }, false)
  return data?.cartLinesAdd?.cart ?? null
}

export async function updateCartLines(
  cartId: string,
  lineId: string,
  quantity: number
): Promise<ShopifyCart | null> {
  const data = await storefront<{
    cartLinesUpdate: { cart: ShopifyCart | null; userErrors: unknown[] }
  }>(UPDATE_CART_LINES, {
    cartId,
    lines: [{ id: lineId, quantity }],
  }, false)
  return data?.cartLinesUpdate?.cart ?? null
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[]
): Promise<ShopifyCart | null> {
  const data = await storefront<{
    cartLinesRemove: { cart: ShopifyCart | null; userErrors: unknown[] }
  }>(REMOVE_CART_LINES, { cartId, lineIds }, false)
  return data?.cartLinesRemove?.cart ?? null
}

interface VariantSellingPlansResponse {
  node: {
    id: string
    sellingPlanAllocations: {
      edges: { node: { sellingPlan: { id: string; name: string } } }[]
    }
  } | null
}

// Looks up the first selling plan attached to the subscription variant.
// We take "first" because the expectation is one variant = one plan
// (£3/mo); if that assumption changes we'd need to pick a specific plan
// by name or add a separate env var.
async function getSubscriptionSellingPlanId(
  variantId: string
): Promise<string | null> {
  const data = await storefront<VariantSellingPlansResponse>(
    GET_VARIANT_SELLING_PLANS,
    { variantId }
  )
  const plan = data?.node?.sellingPlanAllocations.edges[0]?.node.sellingPlan
  return plan?.id ?? null
}

// Creates a checkout for the paid subscription tier.
// Returns the Shopify-hosted checkoutUrl to redirect to, or null if the
// store isn't configured or the Storefront call failed. The caller
// (usually /api/account/upgrade) should fall back gracefully.
export async function createSubscriptionCheckout(
  email: string
): Promise<string | null> {
  const variantId = process.env.SHOPIFY_SUBSCRIPTION_VARIANT_ID
  if (!variantId) {
    console.warn(
      'SHOPIFY_SUBSCRIPTION_VARIANT_ID not set — cannot start subscription checkout'
    )
    return null
  }

  const sellingPlanId = await getSubscriptionSellingPlanId(variantId)
  if (!sellingPlanId) {
    console.warn(
      'No selling plan attached to subscription variant — cart would be a one-time purchase. Attach a subscription plan via Shopify Subscriptions app.'
    )
    return null
  }

  const data = await storefront<{
    cartCreate: { cart: ShopifyCart | null; userErrors: unknown[] }
  }>(CREATE_SUBSCRIPTION_CART, {
    lines: [
      { merchandiseId: variantId, quantity: 1, sellingPlanId },
    ],
    email,
  })

  return data?.cartCreate?.cart?.checkoutUrl ?? null
}

export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const data = await storefront<{ cart: ShopifyCart | null }>(GET_CART, {
    id: cartId,
  })
  return data?.cart ?? null
}
