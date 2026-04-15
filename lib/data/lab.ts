import { getDb } from '@/lib/db'
import { labItems } from '@/lib/db/schema'
import { eq, desc, asc } from 'drizzle-orm'

export interface LabItem {
  id: string
  slug: string
  title: string | null
  description: string | null
  externalUrl: string | null
  thumbnailUrl: string | null
  badge: string | null
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
      .orderBy(asc(labItems.sortOrder), desc(labItems.publishedAt))
    return rows as LabItem[]
  } catch {
    return []
  }
}
