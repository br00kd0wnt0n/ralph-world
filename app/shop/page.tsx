import type { Metadata } from 'next'
import { getProductsByCollection } from '@/lib/shopify/client'
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

const COLLECTION_HANDLES = ['ralph-magazine', 'ralph-merch', 'ralph-random']

export default async function ShopPage() {
  const [results, copy] = await Promise.all([
    Promise.all(COLLECTION_HANDLES.map((h) => getProductsByCollection(h, 20))),
    getSiteCopy(),
  ])

  const collections = COLLECTION_HANDLES.reduce(
    (acc, handle, i) => ({ ...acc, [handle]: results[i] }),
    {} as Record<string, Awaited<ReturnType<typeof getProductsByCollection>>>
  )

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
