import { getDb } from '@/lib/db'
import { caseStudies } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { isSafeUrl } from '@/lib/safe-url'

export interface CaseStudyRow {
  id: string
  slug: string
  title: string | null
  subtitle: string | null
  thumbnailUrl: string | null
  externalUrlOverride: string | null
  sortOrder: number | null
}

export const CASE_STUDY_VIEWER_URL =
  process.env.NEXT_PUBLIC_CASE_STUDY_VIEWER_URL ??
  'https://ralphcasestudyviewer-production.up.railway.app'

export function resolveCaseStudyUrl(row: {
  slug: string
  externalUrlOverride: string | null
}): string {
  const override = row.externalUrlOverride?.trim()
  // Guard legacy rows — if the stored override is unsafe (javascript:,
  // data:, unparseable), fall back to the default viewer URL.
  if (override && isSafeUrl(override)) return override
  return `${CASE_STUDY_VIEWER_URL}/${encodeURIComponent(row.slug)}`
}

export async function getPublishedCaseStudies(): Promise<CaseStudyRow[]> {
  try {
    const db = getDb()
    const rows = await db
      .select({
        id: caseStudies.id,
        slug: caseStudies.slug,
        title: caseStudies.title,
        subtitle: caseStudies.subtitle,
        thumbnailUrl: caseStudies.thumbnailUrl,
        externalUrlOverride: caseStudies.externalUrlOverride,
        sortOrder: caseStudies.sortOrder,
      })
      .from(caseStudies)
      .where(eq(caseStudies.status, 'published'))
      .orderBy(asc(caseStudies.sortOrder), asc(caseStudies.title))
    return rows.slice(0, 8)
  } catch {
    return []
  }
}
