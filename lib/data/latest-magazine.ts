import { getAllProducts, getProductsByCollection } from '@/lib/shopify/client'
import { groupProducts } from '@/lib/shopify/categorize'

export interface LatestMagazine {
  title: string
  handle: string
  imageUrl: string
}

/**
 * The latest magazine with a cover image, from the curated Shopify
 * "magazines" collection (first = top of the manual order). Falls back to
 * the auto-categorised magazine bucket when the collection is empty (same
 * as /shop), so it also resolves in dev/mock. Used by /join-ralph and
 * /subscribe.
 */
export async function getLatestMagazine(): Promise<LatestMagazine | null> {
  try {
    let mags = await getProductsByCollection('magazines', 5)
    if (mags.length === 0) {
      const products = await getAllProducts(50, { sortKey: 'CREATED_AT', reverse: true })
      mags = groupProducts(products).magazine
    }
    const mag = mags.find((m) => m.imageUrl)
    return mag?.imageUrl
      ? { title: mag.title, handle: mag.handle, imageUrl: mag.imageUrl }
      : null
  } catch (err) {
    // A Shopify outage shouldn't take the sign-up pages down with it.
    console.error('[latest-magazine] lookup failed:', err)
    return null
  }
}
