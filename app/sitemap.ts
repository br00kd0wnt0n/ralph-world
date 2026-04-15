import type { MetadataRoute } from 'next'

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://ralph.world'
).replace(/\/$/, '')

// Public top-level routes only. Individual article/event/lab/vod pages
// don't exist yet (Phase 10+). When they do, extend this by pulling
// published slugs from the DB and concatenating.
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/magazine', priority: 0.9, changeFrequency: 'daily' },
  { path: '/tv', priority: 0.9, changeFrequency: 'daily' },
  { path: '/events', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/shop', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/lab', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/subscribe', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/play', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
