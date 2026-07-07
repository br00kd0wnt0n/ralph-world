import type { Metadata } from 'next'
import { getAllProducts, getProductsByCollection } from '@/lib/shopify/client'
import { groupProducts } from '@/lib/shopify/categorize'
import { getSiteCopy } from '@/lib/data/site-copy'
import ShopClient from '@/components/shop/ShopClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'The Ralph magazine, merch, and limited runs — made for people who like good stuff.',
  openGraph: {
    title: 'Ralph Shop',
    description:
      'The magazine, merch, and limited runs.',
  },
}

// Each /shop tab is backed by a curated Shopify collection (handle set in
// Admin); product order within a collection is respected. Auto-categorisation
// of the full catalogue is kept only as a fallback for any tab whose collection
// is missing/empty/unreachable.
const TAB_COLLECTIONS = {
  magazine: 'magazines',
  merch: 'merch',
  random: 'random-sh-t',
} as const

export default async function ShopPage() {
  const [products, magazineCol, merchCol, randomCol, copy] = await Promise.all([
    // Newest products first (by creation date) — feeds the fallback buckets.
    getAllProducts(50, { sortKey: 'CREATED_AT', reverse: true }),
    getProductsByCollection(TAB_COLLECTIONS.magazine, 50),
    getProductsByCollection(TAB_COLLECTIONS.merch, 50),
    getProductsByCollection(TAB_COLLECTIONS.random, 50),
    getSiteCopy(),
  ])

  // Auto-categorised fallback buckets.
  const collections = groupProducts(products)

  // Prefer the curated collection for each tab; fall back to the categorised
  // bucket when a collection is empty/unreachable.
  const curated = { magazine: magazineCol, merch: merchCol, random: randomCol }
  const claimed = new Set<string>()
  for (const tab of ['magazine', 'merch', 'random'] as const) {
    if (curated[tab].length > 0) {
      collections[tab] = curated[tab]
      curated[tab].forEach((p) => claimed.add(p.handle))
    }
  }
  // Keep products claimed by a curated collection out of any tab still using
  // its auto-categorised fallback, so nothing appears twice.
  for (const tab of ['magazine', 'merch', 'random'] as const) {
    if (curated[tab].length === 0) {
      collections[tab] = collections[tab].filter((p) => !claimed.has(p.handle))
    }
  }

  return (
    <ShopClient
      collections={collections}
      heading={copy.shop_hero_heading}
      intro={copy.shop_hero_intro}
      soldoutHeading={copy.shop_soldout_heading}
      soldoutBody={copy.shop_soldout_body}
      copy={copy}
    />
  )
}
