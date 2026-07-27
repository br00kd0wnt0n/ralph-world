import type { Metadata } from 'next'
import { getPublishedArticles, getCoverStory } from '@/lib/data/magazine'
import { getSiteCopy } from '@/lib/data/site-copy'
import { getShopPageData } from '@/lib/data/shop'
import { getProductByHandle } from '@/lib/shopify/client'
import MagazineClient from '@/components/magazine/MagazineClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Magazine',
  description:
    'Long reads, sharp takes, and proper pop-culture coverage from Ralph.',
  alternates: { canonical: '/magazine' },
  openGraph: {
    title: 'Ralph Magazine',
    description:
      'Long reads, sharp takes, and proper pop-culture coverage.',
    url: '/magazine',
  },
}

export default async function MagazinePage() {
  const [articles, copy, shop] = await Promise.all([
    getPublishedArticles(),
    getSiteCopy(),
    getShopPageData(),
  ])
  const coverStory = getCoverStory(articles)

  // Latest magazine issue = first in the (curated / newest-first) magazine tab.
  // Pull its full product-page gallery for the planet-creature bubble carousel.
  const latestMagHandle = shop.collections.magazine[0]?.handle ?? null
  const latestMag = latestMagHandle
    ? await getProductByHandle(latestMagHandle)
    : null
  const magazineImages = latestMag
    ? latestMag.images.edges.length > 0
      ? latestMag.images.edges.map((e) => e.node)
      : latestMag.featuredImage
        ? [latestMag.featuredImage]
        : []
    : []

  return (
    <MagazineClient
      articles={articles}
      coverStory={coverStory}
      copy={copy}
      magazineImages={magazineImages}
    />
  )
}
