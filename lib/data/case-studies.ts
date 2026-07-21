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

export interface CaseStudyMedia {
  id?: string
  type?: 'image' | 'gif' | 'video' | string
  url?: string
  alt?: string
}

export interface CaseStudySection {
  id?: string
  order?: number
  label?: string
  copy?: string
  media?: CaseStudyMedia[] | CaseStudyMedia | null
  heroMedia?: boolean
  launchUrl?: string
}

export interface CaseStudyFull extends CaseStudyRow {
  clientLogoUrl: string | null
  tags: string[]
  brandColors: string[]
  subtitleColor: string | null
  ctaColor: string | null
  outroHeading: string | null
  outroSubtitle: string | null
  sections: CaseStudySection[]
}

export function resolveCaseStudyUrl(row: {
  slug: string
  externalUrlOverride: string | null
}): string {
  const override = row.externalUrlOverride?.trim()
  // externalUrlOverride is the escape hatch — e.g. for one-offs that
  // still need to point at an external microsite. Guard against unsafe
  // schemes (javascript:, data:) even for CMS-authored values.
  if (override && isSafeUrl(override)) return override
  return `/case-studies/${encodeURIComponent(row.slug)}`
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

/**
 * Fetch a single published case study with everything the renderer
 * needs (sections, media, brand palette, outro copy). Returns null for
 * draft/missing rows so callers can 404 cleanly.
 *
 * Sections are stored as jsonb — we cast to the typed shape but don't
 * validate at runtime; a malformed section list will just skip fields
 * that don't exist rather than throw the whole page.
 */
export async function getCaseStudyBySlug(
  slug: string
): Promise<CaseStudyFull | null> {
  try {
    const db = getDb()
    const [row] = await db
      .select()
      .from(caseStudies)
      .where(eq(caseStudies.slug, slug))
      .limit(1)
    if (!row || row.status !== 'published') return null
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      thumbnailUrl: row.thumbnailUrl,
      externalUrlOverride: row.externalUrlOverride,
      sortOrder: row.sortOrder,
      clientLogoUrl: row.clientLogoUrl,
      tags: (row.tags as string[] | null) ?? [],
      brandColors: (row.brandColors as string[] | null) ?? [],
      subtitleColor: row.subtitleColor,
      ctaColor: row.ctaColor,
      outroHeading: row.outroHeading,
      outroSubtitle: row.outroSubtitle,
      sections: (row.sections as CaseStudySection[] | null) ?? [],
    }
  } catch {
    return null
  }
}

/** Slugs of published case studies — used for generateStaticParams. */
export async function getPublishedCaseStudySlugs(): Promise<string[]> {
  try {
    const db = getDb()
    const rows = await db
      .select({ slug: caseStudies.slug })
      .from(caseStudies)
      .where(eq(caseStudies.status, 'published'))
    return rows.map((r) => r.slug)
  } catch {
    return []
  }
}
