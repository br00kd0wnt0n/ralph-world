import type { ProductSummary, ShopCategory } from './types'

// Products excluded from /shop — recurring subscriptions whose checkout
// flows live elsewhere. Add handles here when a subscription product
// gets created in Shopify with a non-Subscription-Services Category.
const EXCLUDED_HANDLES = new Set<string>([
  'mag-subscription',
  'ralph-world-membership',
  '2027-a-year-in-review',
])

// Belt-and-braces filter — Shopify Admin's "Category" field uses the
// new structured taxonomy, which doesn't always populate Storefront's
// productType. So we also match by title/handle for anything that
// looks like a recurring subscription.
function looksLikeSubscription(p: ProductSummary): boolean {
  const haystack = `${p.handle} ${p.title}`.toLowerCase()
  return haystack.includes('subscription') || haystack.includes('membership')
}

// Maps a Shopify productType to one of the three /shop tabs.
// Returns null when the productType is empty/unrecognised (caller should
// fall back to title/handle matching) or when the product should be
// hidden from /shop entirely (e.g. Subscription Services).
//
// Add productType strings here as the catalog grows.
export function categorize(productType: string): ShopCategory | null {
  const t = productType.toLowerCase().trim()
  if (!t) return null
  if (t === 'subscription services') return null
  if (t.includes('magazine') || t.includes('newspaper')) return 'magazine'
  if (
    t.includes('apparel') ||
    t.includes('clothing') ||
    t.includes('sock') ||
    t.includes('hat') ||
    t.includes('shirt') ||
    t.includes('hoodie') ||
    t.includes('tote') ||
    t.includes('accessor')
  ) {
    return 'merch'
  }
  return 'random'
}

// Fallback when Storefront returns an empty productType — Shopify Admin's
// new structured "Category" taxonomy doesn't populate the legacy
// productType field, so until the store sweep sets productType on every
// product we infer the bucket from title/handle.
function categorizeByTitle(p: ProductSummary): ShopCategory {
  const h = `${p.handle} ${p.title}`.toLowerCase()
  if (/\b(mag|magazine|magazines|newspaper|issue)\b/.test(h)) return 'magazine'
  if (/\b(tee|t-shirt|shirt|hoodie|tote|cap|hat|sock|socks|apparel)\b/.test(h)) {
    return 'merch'
  }
  return 'random'
}

export function groupProducts(
  products: ProductSummary[]
): Record<ShopCategory, ProductSummary[]> {
  const groups: Record<ShopCategory, ProductSummary[]> = {
    magazine: [],
    merch: [],
    random: [],
  }
  for (const p of products) {
    if (EXCLUDED_HANDLES.has(p.handle)) continue
    if (looksLikeSubscription(p)) continue
    const cat = categorize(p.productType) ?? categorizeByTitle(p)
    groups[cat].push(p)
  }
  return groups
}
