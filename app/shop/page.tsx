import { getProductsByCollection } from '@/lib/shopify/client'
import { getSiteCopy } from '@/lib/data/site-copy'
import ShopClient from '@/components/shop/ShopClient'

export const revalidate = 300

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
