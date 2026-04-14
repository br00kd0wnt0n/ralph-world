import { NextResponse } from 'next/server'
import { eq, and, inArray } from 'drizzle-orm'
import { auth, type SessionWithProfile } from '@/lib/auth'
import { getAssets } from '@/lib/broadcaster/client'
import { getDb } from '@/lib/db'
import { tvVod } from '@/lib/db/schema'

/**
 * Returns Broadcaster assets that have been published in the CMS,
 * filtered by the caller's subscription tier:
 *   - paid users: all published VODs
 *   - free users: only access_tier='free' VODs
 *   - guest: 401
 */
export async function GET() {
  const session = (await auth()) as SessionWithProfile | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasPaid = session.profile?.subscriptionStatus === 'paid'

  // Pull all Broadcaster assets
  const allAssets = await getAssets()
  if (allAssets.length === 0) return NextResponse.json([])

  // Cross-reference with tv_vod: only return items that have a published
  // CMS record AND match the user's tier.
  try {
    const db = getDb()
    const broadcasterIds = allAssets
      .map((a) => a.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    if (broadcasterIds.length === 0) return NextResponse.json([])

    const publishedRows = await db
      .select({
        broadcasterId: tvVod.broadcasterId,
        titleOverride: tvVod.titleOverride,
        description: tvVod.description,
        thumbnailUrlOverride: tvVod.thumbnailUrlOverride,
        accessTier: tvVod.accessTier,
        isFeatured: tvVod.isFeatured,
        sortOrder: tvVod.sortOrder,
      })
      .from(tvVod)
      .where(
        and(
          eq(tvVod.isPublished, true),
          inArray(tvVod.broadcasterId, broadcasterIds)
        )
      )

    // Filter by tier
    const accessible = publishedRows.filter(
      (r) => r.accessTier !== 'paid' || hasPaid
    )

    const accessibleMap = new Map(accessible.map((r) => [r.broadcasterId, r]))

    const enriched = allAssets
      .filter((a) => accessibleMap.has(a.id))
      .map((a) => {
        const meta = accessibleMap.get(a.id)!
        return {
          id: a.id,
          title: meta.titleOverride ?? a.title,
          description: meta.description,
          duration: a.duration,
          thumbnailUrl: meta.thumbnailUrlOverride ?? a.thumbnailUrl,
          accessTier: meta.accessTier,
          isFeatured: meta.isFeatured,
          sortOrder: meta.sortOrder,
        }
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json([])
  }
}
