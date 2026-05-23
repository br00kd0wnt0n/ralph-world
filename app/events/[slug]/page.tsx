import { redirect } from 'next/navigation'

interface EventSlugPageProps {
  params: Promise<{ slug: string }>
}

// Direct visits to /events/[slug] (deep link, refresh, share) redirect to
// /events?show=slug. The events page's client component reads the query
// param and opens the expanded panel for that event, then pushState's the
// nice slug URL back into the address bar.
export default async function EventSlugPage({ params }: EventSlugPageProps) {
  const { slug } = await params
  redirect(`/events?show=${encodeURIComponent(slug)}`)
}
