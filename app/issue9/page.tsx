import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getIssue9Product } from '@/lib/data/issue9'
import { getIssue9Mode, isIssue9Open } from '@/lib/issue9'
import { descriptionToText, formatPrice } from '@/lib/shopify/format'
import Issue9Client from '@/components/issue9/Issue9Client'
import { getSiteCopy } from '@/lib/data/site-copy'
import { buildPageMetadata } from '@/lib/seo'

// Also bounds how long after midnight the opening (19 Oct) and the
// pre-order → order switch (26 Oct) take to show — both computed at render.
export const revalidate = 300

// Site Copy → Page SEO. Blank image = the Issue 9 product image. In
// pre-order mode (ISSUE9_MODE=preorder, or before launch) an untouched
// description switches to the pre-order wording.
export async function generateMetadata(): Promise<Metadata> {
  const [copy, product] = await Promise.all([getSiteCopy(), getIssue9Product()])
  return buildPageMetadata(copy, 'issue9', {
    path: '/issue9',
    autoImage: product?.featuredImage?.url,
    autoDescription:
      getIssue9Mode() === 'preorder'
        ? 'Pre-order Issue 09 of Ralph magazine and join Ralph World.'
        : null,
  })
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
                description:
                  descriptionToText(product.descriptionHtml) ||
                  product.description?.trim() ||
                  null,
                available: product.availableForSale && variant.availableForSale,
              }
            : null
        }
      />
    </Suspense>
  )
}
