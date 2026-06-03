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

export default async function ShopPage() {
  // Fetch the whole catalogue (used for the merch/random tabs via
  // auto-categorisation) alongside the curated Magazines collection
  // (whose product order is set manually in Shopify Admin).
  const [products, magazinesOrdered, copy] = await Promise.all([
    getAllProducts(50),
    getProductsByCollection('magazines', 50),
    getSiteCopy(),
  ])

  const collections = groupProducts(products)

  // If the Shopify "Magazines" collection (handle: `magazines`) is
  // populated, use its order verbatim for the Magazine tab — overrides
  // auto-categorisation. Falls back to the categorised bucket when the
  // collection is missing/empty so the tab keeps working.
  if (magazinesOrdered.length > 0) {
    const orderedHandles = new Set(magazinesOrdered.map((p) => p.handle))
    collections.magazine = magazinesOrdered
    // Prevent the same product appearing in merch/random as well.
    collections.merch = collections.merch.filter(
      (p) => !orderedHandles.has(p.handle),
    )
    collections.random = collections.random.filter(
      (p) => !orderedHandles.has(p.handle),
    )
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
