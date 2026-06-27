import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getAllProducts, getProductsByCollection } from '@/lib/shopify/client'
import { groupProducts } from '@/lib/shopify/categorize'
import JoinRalphClient from '@/components/join-ralph/JoinRalphClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Join Ralph',
  description: 'Join the Ralph community and get access to exclusive content.',
}

export default async function JoinRalphPage() {
  // Latest magazine listing image — from the curated Shopify "magazines"
  // collection (first = top of the manual order). Falls back to the
  // auto-categorised magazine bucket when the collection is empty (same as
  // /shop), so it also resolves in dev/mock.
  let mags = await getProductsByCollection('magazines', 5)
  if (mags.length === 0) {
    const products = await getAllProducts(50, { sortKey: 'CREATED_AT', reverse: true })
    mags = groupProducts(products).magazine
  }
  const magCoverUrl = mags.find((m) => m.imageUrl)?.imageUrl ?? null

  return (
    <Suspense>
      <JoinRalphClient magCoverUrl={magCoverUrl} />
    </Suspense>
  )
}
