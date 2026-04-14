import type { ShopifyProduct, ShopifyCart, ProductSummary } from './types'
import {
  GET_PRODUCTS_BY_COLLECTION,
  GET_PRODUCT_BY_HANDLE,
  CREATE_CART,
  ADD_CART_LINES,
  UPDATE_CART_LINES,
  REMOVE_CART_LINES,
  GET_CART,
} from './queries'
import { getMockProducts, getMockProduct, isShopifyConfigured } from './mock'

interface ShopifyResponse<T> {
  data?: T
  errors?: { message: string }[]
}

const TIMEOUT_MS = 5000

async function storefront<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T | null> {
  const url = process.env.SHOPIFY_STOREFRONT_URL
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN

  if (!url || !token) return null

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
      cache: 'no-store',
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
    imageUrl: p.featuredImage?.url ?? null,
    available: p.availableForSale,
    tags: p.tags ?? [],
    variantId: firstVariant?.id ?? '',
  }
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
  }>(CREATE_CART, { lines })
  return data?.cartCreate?.cart ?? null
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
  })
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
  })
  return data?.cartLinesUpdate?.cart ?? null
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[]
): Promise<ShopifyCart | null> {
  const data = await storefront<{
    cartLinesRemove: { cart: ShopifyCart | null; userErrors: unknown[] }
  }>(REMOVE_CART_LINES, { cartId, lineIds })
  return data?.cartLinesRemove?.cart ?? null
}

export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const data = await storefront<{ cart: ShopifyCart | null }>(GET_CART, {
    id: cartId,
  })
  return data?.cart ?? null
}
