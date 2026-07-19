import type { MetadataRoute } from 'next'
import { getPublishedArticles } from '@/lib/data/magazine'
import { getActiveEvents } from '@/lib/data/events'
import { getAllProducts } from '@/lib/shopify/client'

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://ralph.world'
).replace(/\/$/, '')

type Entry = MetadataRoute.Sitemap[number]
type ChangeFreq = Entry['changeFrequency']

// Static, publicly-indexable top-level routes. Auth pages (/account, /login,
// /reset-password) are intentionally excluded — they're noindex + robots-
// disallowed. Redirect stubs (/subscribe) and deleted routes (/play) removed.
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: ChangeFreq }[] = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/magazine', priority: 0.9, changeFrequency: 'daily' },
  { path: '/tv', priority: 0.9, changeFrequency: 'daily' },
  { path: '/events', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/shop', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/lab', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/join-ralph', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/work-with-us', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/jp/contact', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/legal/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legal/terms', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legal/cookies', priority: 0.2, changeFrequency: 'yearly' },
]

// Content routes use the pretty [slug]/[handle] URLs. These currently redirect
// to their query-string equivalents (/magazine?read=, /events?show=,
// /shop?product=); Phase 3 (SEO) will render real content + canonicals there.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  // Pull dynamic content in parallel; never let a failing source break the
  // sitemap — each data fn already swallows its own errors, but guard anyway.
  const [articles, events, products] = await Promise.all([
    getPublishedArticles().catch(() => []),
    getActiveEvents().catch(() => []),
    getAllProducts(250).catch(() => []),
  ])

  const articleEntries: MetadataRoute.Sitemap = articles
    .filter((a) => a.slug)
    .map((a) => ({
      url: `${BASE_URL}/magazine/${a.slug}`,
      lastModified: a.publishedAt ?? now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

  const eventEntries: MetadataRoute.Sitemap = events
    .filter((e) => e.slug)
    .map((e) => ({
      url: `${BASE_URL}/events/${e.slug}`,
      lastModified: e.eventDate ?? now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

  const productEntries: MetadataRoute.Sitemap = products
    .filter((p) => p.handle)
    .map((p) => ({
      url: `${BASE_URL}/shop/${p.handle}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

  return [...staticEntries, ...articleEntries, ...eventEntries, ...productEntries]
}
