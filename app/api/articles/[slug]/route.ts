import { NextResponse } from 'next/server'
import { getArticleBySlug, previewArticleBlocks } from '@/lib/data/magazine'
import { currentTier } from '@/lib/entitlements-server'
import { canAccess, type AccessTier } from '@/lib/entitlements'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/articles/[slug]
 *
 * Returns a published article. SECURITY: paid_subscribers / gated content
 * is truncated to the preview server-side here — the full body of a gated
 * article is never sent to an unentitled caller (fixes the
 * curl-the-API / RSC-payload bypass). The response carries `gated` +
 * `gateReason` so the overlay shows the right CTA without ever holding the
 * withheld content.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const accessTier = (article.accessTier ?? 'everyone') as AccessTier
  const tier = await currentTier() // 'guest' | 'free' | 'paid'
  const signedIn = tier !== 'guest'
  const canRead = canAccess(signedIn ? { tier } : null, { accessTier })
  const gateReason: 'guest' | 'upgrade' | null = !canRead
    ? signedIn
      ? 'upgrade'
      : 'guest'
    : null

  const allBlocks = Array.isArray(article.contentBlocks) ? article.contentBlocks : []
  const visibleBlocks = gateReason ? previewArticleBlocks(allBlocks) : allBlocks
  // Only flag as gated (→ show CTA) when content was actually withheld; a
  // gated article shorter than the preview window has nothing to protect.
  const gated = gateReason !== null && visibleBlocks.length < allBlocks.length

  return NextResponse.json({
    ...article,
    contentBlocks: visibleBlocks,
    gated,
    gateReason: gated ? gateReason : null,
  })
}
