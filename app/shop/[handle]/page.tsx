import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductByHandle } from '@/lib/shopify/client'
import { getShopPageData } from '@/lib/data/shop'
import { formatPrice } from '@/lib/shopify/format'
import ShopClient from '@/components/shop/ShopClient'
import { JsonLd } from '@/components/seo/JsonLd'

export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ralph.world'

interface ShopHandlePageProps {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({
  params,
}: ShopHandlePageProps): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) {
    return { title: 'Product', robots: { index: false, follow: false } }
  }
  const description =
    product.description?.trim().slice(0, 200) ||
    'Shop the Ralph magazine, merch, and limited runs.'
  const image = product.featuredImage?.url
  return {
    title: product.title,
    description,
    alternates: { canonical: `/shop/${handle}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      url: `/shop/${handle}`,
      images: image ? [{ url: image }] : undefined,
    },
  }
}

export default async function ShopHandlePage({ params }: ShopHandlePageProps) {
  const { handle } = await params
  const [{ collections, copy }, product] = await Promise.all([
    getShopPageData(),
    getProductByHandle(handle),
  ])
  if (!product) notFound()

  const price = product.priceRange.minVariantPrice

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description: product.description,
          image: product.featuredImage?.url ?? undefined,
          offers: {
            '@type': 'Offer',
            price: formatPrice(price.amount),
            priceCurrency: price.currencyCode,
            availability: product.availableForSale
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: `${SITE_URL}/shop/${handle}`,
          },
        }}
      />
      {/* Same shell as /shop; initialProduct opens the detail immediately. */}
      <ShopClient
        collections={collections}
        heading={copy.shop_hero_heading}
        intro={copy.shop_hero_intro}
        soldoutHeading={copy.shop_soldout_heading}
        soldoutBody={copy.shop_soldout_body}
        copy={copy}
        initialProduct={product}
      />
    </>
  )
}
