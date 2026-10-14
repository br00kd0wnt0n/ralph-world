import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getIssue9Product } from '@/lib/data/issue9'
import { getIssue9Mode, isIssue9Open } from '@/lib/issue9'
import { formatPrice } from '@/lib/shopify/format'
import Issue9Client from '@/components/issue9/Issue9Client'

// Also bounds how long after midnight the opening (19 Oct) and the
// pre-order → order switch (26 Oct) take to show — both computed at render.
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const product = await getIssue9Product()
  const image = product?.featuredImage?.url
  const title = 'Ralph Issue 09'
  const description =
    getIssue9Mode() === 'preorder'
      ? 'Pre-order Issue 09 of Ralph magazine and join Ralph World.'
      : 'Issue 09 of Ralph magazine is out now. Get your copy and join Ralph World.'
  return {
    title,
    description,
    alternates: { canonical: '/issue9' },
    openGraph: {
      type: 'website',
      title,
      description,
      url: '/issue9',
      images: image ? [{ url: image }] : undefined,
    },
  }
}

export default async function Issue9Page() {
  const product = await getIssue9Product()
  const variant = product?.variants.edges[0]?.node

  return (
    <Suspense>
      <Issue9Client
        mode={getIssue9Mode()}
        open={isIssue9Open()}
        product={
          product && variant
            ? {
                price: formatPrice(product.priceRange.minVariantPrice.amount),
                imageUrl: product.featuredImage?.url ?? null,
                imageAlt: product.featuredImage?.altText ?? null,
                available: product.availableForSale && variant.availableForSale,
              }
            : null
        }
      />
    </Suspense>
  )
}
