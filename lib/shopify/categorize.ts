import type { ProductSummary, ShopCategory } from './types'

// Products excluded from /shop — recurring subscriptions whose checkout
// flows live elsewhere. Add handles here when a subscription product
// gets created in Shopify with a non-Subscription-Services Category.
const EXCLUDED_HANDLES = new Set<string>(['mag-subscription'])

// Maps a Shopify productType to one of the three /shop tabs.
// Returns null when the product should be hidden from /shop entirely
// (e.g. the £3 site membership lives in the /subscribe flow).
//
// Add productType strings here as the catalog grows — anything not
// listed falls through to 'random'.
export function categorize(productType: string): ShopCategory | null {
  const t = productType.toLowerCase()
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
    const cat = categorize(p.productType)
    if (cat) groups[cat].push(p)
  }
  return groups
}
