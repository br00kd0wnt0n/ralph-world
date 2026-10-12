import 'server-only'
import { getProductByHandle } from '@/lib/shopify/client'
import { getMockProducts, getMockProduct, isShopifyConfigured } from '@/lib/shopify/mock'
import { getIssue9ProductHandle } from '@/lib/issue9'
import type { ShopifyProduct } from '@/lib/shopify/types'

/**
 * The Issue 9 product for /issue9 and its checkout route.
 *
 * Live Shopify: the configured handle or nothing — never fall back to a
 * different magazine, or the page would sell the wrong issue. Demo mode (no
 * Shopify env): the first mock magazine, so the page renders in dev.
 */
export async function getIssue9Product(): Promise<ShopifyProduct | null> {
  if (!isShopifyConfigured()) {
    const handle = getMockProducts('ralph-magazine')[0]?.handle
    return handle ? getMockProduct(handle) : null
  }
  return getProductByHandle(getIssue9ProductHandle())
}
