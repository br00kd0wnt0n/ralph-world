import { getProductsByCollection } from '@/lib/shopify/client'
import ShopClient from '@/components/shop/ShopClient'

export const revalidate = 300

const COLLECTION_HANDLES = ['ralph-magazine', 'ralph-merch', 'ralph-random']

export default async function ShopPage() {
  const results = await Promise.all(
    COLLECTION_HANDLES.map((h) => getProductsByCollection(h, 20))
  )

  const collections = COLLECTION_HANDLES.reduce(
    (acc, handle, i) => ({ ...acc, [handle]: results[i] }),
    {} as Record<string, Awaited<ReturnType<typeof getProductsByCollection>>>
  )

  return <ShopClient collections={collections} />
}
