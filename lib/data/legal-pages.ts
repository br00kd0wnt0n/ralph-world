import 'server-only'
import { eq } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { getDb } from '@/lib/db'
import { legalPages } from '@/lib/db/schema'

export interface LegalPage {
  slug: string
  title: string
  bodyHtml: string
  /** The display date — `last_updated_override` if set, otherwise
   *  `last_updated_auto`. Never null once the row is seeded. */
  displayLastUpdated: Date
  /** Raw auto-bump timestamp; consumers rarely need this, but exposed
   *  for the CMS editor which shows both values side-by-side. */
  lastUpdatedAuto: Date
  lastUpdatedOverride: Date | null
}

async function fetchLegalPage(slug: string): Promise<LegalPage | null> {
  try {
    const db = getDb()
    const [row] = await db
      .select()
      .from(legalPages)
      .where(eq(legalPages.slug, slug))
      .limit(1)
    if (!row || !row.isPublished) return null
    return {
      slug: row.slug,
      title: row.title,
      bodyHtml: row.bodyHtml,
      displayLastUpdated: row.lastUpdatedOverride ?? row.lastUpdatedAuto,
      lastUpdatedAuto: row.lastUpdatedAuto,
      lastUpdatedOverride: row.lastUpdatedOverride,
    }
  } catch {
    return null
  }
}

/**
 * Cached per-slug read. Legal-page saves in the CMS bump the
 * `legal-pages` tag via revalidateTag, so this stays instantly
 * fresh across a save without a hard TTL.
 */
export const getLegalPage = (slug: string) =>
  unstable_cache(
    () => fetchLegalPage(slug),
    ['legal-page', slug],
    { revalidate: 3600, tags: ['legal-pages', `legal-page:${slug}`] }
  )()

export const LEGAL_SLUGS = ['privacy', 'terms', 'cookies'] as const
export type LegalSlug = (typeof LEGAL_SLUGS)[number]
