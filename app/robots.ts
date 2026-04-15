import type { MetadataRoute } from 'next'

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://ralph.world'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/account', '/login'],
      },
    ],
    sitemap: `${BASE_URL.replace(/\/$/, '')}/sitemap.xml`,
  }
}
