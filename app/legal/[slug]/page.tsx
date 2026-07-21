import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LegalPageBody from '@/components/legal/LegalPageBody'
import { getLegalPage, LEGAL_SLUGS, type LegalSlug } from '@/lib/data/legal-pages'

// Route-level revalidation matches the getLegalPage cache TTL. Saves
// from the CMS bust `legal-pages` immediately via revalidateTag, so
// this TTL only matters if the tag ping is missed.
export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

function isLegalSlug(s: string): s is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(s)
}

const PAGE_DESCRIPTIONS: Record<LegalSlug, string> = {
  privacy:
    'How Ralph collects, uses, and protects your personal data — UK GDPR compliant.',
  terms:
    'Terms and conditions for using Ralph.world — the magazine, TV, events, shop, and member portal.',
  cookies:
    'All cookies set by ralph.world — what they do, how long they last, and how to change your choice.',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isLegalSlug(slug)) return { title: 'Not found' }
  const page = await getLegalPage(slug)
  return {
    title: page?.title ?? 'Legal',
    description: PAGE_DESCRIPTIONS[slug],
  }
}

// Pre-render the three known legal pages at build time; anything else
// falls through to the notFound() branch below.
export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }))
}

function formatLastUpdated(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function LegalPage({ params }: PageProps) {
  const { slug } = await params
  if (!isLegalSlug(slug)) notFound()
  const page = await getLegalPage(slug)
  if (!page) notFound()

  return (
    <article>
      <h1>{page.title}</h1>
      <p className="text-black/60 text-sm">
        Last updated: <strong>{formatLastUpdated(page.displayLastUpdated)}</strong>
      </p>
      <LegalPageBody bodyHtml={page.bodyHtml} />
    </article>
  )
}
