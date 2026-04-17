import type { Metadata } from 'next'
import { getAllProducts } from '@/lib/shopify/client'
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
  const [products, copy] = await Promise.all([
    getAllProducts(50),
    getSiteCopy(),
  ])

  const collections = groupProducts(products)

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
