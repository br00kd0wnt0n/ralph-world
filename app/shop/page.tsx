import type { Metadata } from 'next'
import { getShopPageData } from '@/lib/data/shop'
import ShopClient from '@/components/shop/ShopClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'The Ralph magazine, merch, and limited runs — made for people who like good stuff.',
  alternates: { canonical: '/shop' },
  openGraph: {
    title: 'Ralph Shop',
    description: 'The magazine, merch, and limited runs.',
    url: '/shop',
  },
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
