import type { Metadata } from 'next'
import { getShopPageData } from '@/lib/data/shop'
import ShopClient from '@/components/shop/ShopClient'
import { getSiteCopy } from '@/lib/data/site-copy'
import { buildPageMetadata } from '@/lib/seo'

export const revalidate = 300

// Site Copy → Page SEO.
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSiteCopy(), 'shop', { path: '/shop' })
}

export default async function ShopPage() {
  const { collections, copy } = await getShopPageData()

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
