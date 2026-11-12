import type { Metadata } from 'next'
import { DEFAULT_COPY, type SiteCopy, type SiteCopyKey } from '@/lib/data/site-copy'

/**
 * Search & sharing metadata: one place for the rules that decide what a
 * page's <title>, meta description and share image are.
 *
 * Two kinds of input, both editable in the CMS:
 *   - Per-item overrides on articles / events / case studies
 *     (seo_title, seo_description, seo_image_url). Blank = the automatic
 *     fallback below, which is what the site did before the fields existed.
 *   - Per-page fields in Site Copy → "Page SEO" (seo_<page>_title, ...),
 *     plus a site-wide default description and share image.
 *
 * The CMS mirrors these fallbacks for its live preview
 * (ralph-cms lib/seo.ts). Change both together.
 */

/** Must match the `title.template` in app/layout.tsx ('%s | Ralph'). */
export const TITLE_SUFFIX = ' | Ralph'

/** Guidance only: roughly where Google truncates. Not enforced. */
export const SEO_TITLE_LIMIT = 60
export const SEO_DESCRIPTION_LIMIT = 155

/**
 * Last-resort share image (1200×630). Used when neither the page nor the
 * site-wide default in Site Copy has one. Lives in /public, not as
 * app/opengraph-image.png: the file convention outranks config metadata,
 * so it would make the CMS default image impossible to apply.
 */
export const STATIC_SHARE_IMAGE = {
  url: '/og-default.png',
  width: 1200,
  height: 630,
  alt: 'Ralph — The Entertainment People',
} as const

/**
 * Every page that sets `openGraph` must repeat these: Next does not
 * deep-merge openGraph across segments, so a page-level object silently
 * drops the root layout's site name and locale.
 */
export const BASE_OPEN_GRAPH = {
  siteName: 'Ralph',
  locale: 'en_GB',
} as const

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function firstNonBlank(...values: (string | null | undefined)[]): string {
  for (const v of values) {
    const c = clean(v)
    if (c) return c
  }
  return ''
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
}

/**
 * Rich-text (Tiptap HTML) → plain text for meta tags. Article intros are
 * HTML, so slicing them raw put "<p>" into the description.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<(br|\/p|\/li|\/h[1-6])\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, e: string) => ENTITIES[e] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SeoOverrides {
  seoTitle?: string | null
  seoDescription?: string | null
  seoImageUrl?: string | null
}

export interface ResolvedSeo {
  title: string
  description: string
  /** Null = no item image; callers fall back to the site default. */
  image: string | null
}

export function resolveArticleSeo(
  article: SeoOverrides & {
    title: string | null
    subtitle: string | null
    intro: string | null
    leadMediaUrl: string | null
    cardImageUrl: string | null
  }
): ResolvedSeo {
  return {
    title: firstNonBlank(article.seoTitle, article.title) || 'Article',
    description:
      firstNonBlank(
        article.seoDescription,
        article.subtitle,
        stripHtml(article.intro).slice(0, 200)
      ) || 'Read it on Ralph.',
    image:
      firstNonBlank(article.seoImageUrl, article.leadMediaUrl, article.cardImageUrl) ||
      null,
  }
}

export function resolveEventSeo(
  event: SeoOverrides & {
    title: string | null
    descriptionShort: string | null
    locationName: string | null
    locationAddress: string | null
    thumbnailUrl: string | null
  }
): ResolvedSeo {
  return {
    title: firstNonBlank(event.seoTitle, event.title) || 'Event',
    description:
      firstNonBlank(
        event.seoDescription,
        clean(event.descriptionShort).slice(0, 200),
        [clean(event.locationName), clean(event.locationAddress)]
          .filter(Boolean)
          .join(', ')
      ) || 'A Ralph event.',
    image: firstNonBlank(event.seoImageUrl, event.thumbnailUrl) || null,
  }
}

export function resolveCaseStudySeo(
  study: SeoOverrides & {
    title: string | null
    subtitle: string | null
    thumbnailUrl: string | null
  }
): ResolvedSeo {
  return {
    // No " — Ralph" here: the layout template adds " | Ralph".
    title: firstNonBlank(study.seoTitle, study.title) || 'Case Study',
    description:
      firstNonBlank(study.seoDescription, study.subtitle) ||
      'A Ralph case study.',
    image: firstNonBlank(study.seoImageUrl, study.thumbnailUrl) || null,
  }
}

type OgImages = NonNullable<NonNullable<Metadata['openGraph']>['images']>

/**
 * The share image list for a page: its own image, else the site-wide
 * default from Site Copy, else the static card. Always non-empty, so no
 * page ships without an og:image.
 */
export function shareImages(
  ...candidates: (string | null | undefined)[]
): OgImages {
  const url = firstNonBlank(...candidates)
  return url ? [{ url }] : [{ ...STATIC_SHARE_IMAGE }]
}

/** A Site Copy value, or its built-in default when an editor blanked it. */
export function copyOrDefault(copy: Partial<SiteCopy>, key: SiteCopyKey): string {
  return clean(copy[key]) || DEFAULT_COPY[key]
}

export const PAGE_SEO_IDS = [
  'home',
  'magazine',
  'events',
  'tv',
  'shop',
  'lab',
  'work_with_us',
  'subscribe',
  'join_ralph',
  'issue9',
  'contact',
] as const

export type PageSeoId = (typeof PAGE_SEO_IDS)[number]

export function pageSeoKeys(id: PageSeoId) {
  return {
    title: `seo_${id}_title` as SiteCopyKey,
    description: `seo_${id}_description` as SiteCopyKey,
    image: `seo_${id}_image` as SiteCopyKey,
  }
}

/**
 * Metadata for a fixed page (homepage, section pages, campaign pages)
 * from its Site Copy → Page SEO fields.
 *
 * - `absoluteTitle`: skip the " | Ralph" template (homepage only).
 * - `autoImage`: the page's automatic share image (e.g. the latest
 *   magazine cover), used when the CMS image is blank.
 * - `description`: an automatic description that replaces the default
 *   (used by Issue 9 in pre-order mode). Ignored once an editor has
 *   changed the field.
 */
export function buildPageMetadata(
  copy: Partial<SiteCopy>,
  id: PageSeoId,
  opts: {
    path: string
    absoluteTitle?: boolean
    autoImage?: string | null
    autoDescription?: string | null
    alternates?: Metadata['alternates']
  }
): Metadata {
  const keys = pageSeoKeys(id)
  const title = copyOrDefault(copy, keys.title)
  let description = copyOrDefault(copy, keys.description)
  if (opts.autoDescription && description === DEFAULT_COPY[keys.description]) {
    description = opts.autoDescription
  }
  return {
    title: opts.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: opts.alternates ?? { canonical: opts.path },
    openGraph: {
      ...BASE_OPEN_GRAPH,
      type: 'website',
      title,
      description,
      url: opts.path,
      images: shareImages(copy[keys.image], opts.autoImage, copy.seo_default_image),
    },
  }
}
