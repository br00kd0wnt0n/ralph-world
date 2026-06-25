import { getDb } from '@/lib/db'
import { labItems } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

export interface LabTag {
  label: string
  color: 'pink' | 'yellow' | 'blue' | 'green' | 'orange' | 'purple'
}

export interface LabItem {
  id: string
  slug: string
  title: string | null
  subtitle: string | null
  description: string | null
  postedBy: string | null
  externalUrl: string | null
  thumbnailUrl: string | null
  /** Deprecated — superseded by `tags`. Kept for legacy rows. */
  badge: string | null
  tags: LabTag[] | null
  contentBlocks: unknown
  accessTier: string | null
  sortOrder: number | null
  publishedAt: Date | null
}

export async function getPublishedLabItems(): Promise<LabItem[]> {
  try {
    const db = getDb()
    const rows = await db
      .select()
      .from(labItems)
      .where(eq(labItems.status, 'published'))
      // Manual sortOrder first (NULLS LAST so unordered items fall back to
      // publishedAt). Raw sql for NULLS LAST — same pattern as articles.
      .orderBy(sql`${labItems.sortOrder} ASC NULLS LAST`, desc(labItems.publishedAt))
    return rows as LabItem[]
  } catch {
    return []
  }
}
