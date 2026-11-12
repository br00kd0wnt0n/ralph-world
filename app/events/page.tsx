import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import { getActiveEvents } from '@/lib/data/events'
import { getSiteCopy } from '@/lib/data/site-copy'
import EventsClient from '@/components/events/EventsClient'

export const revalidate = 60

// Site Copy → Page SEO.
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSiteCopy(), 'events', { path: '/events' })
}

export default async function EventsPage() {
  const [activeEvents, copy] = await Promise.all([
    getActiveEvents(),
    getSiteCopy(),
  ])

  return <EventsClient activeEvents={activeEvents} copy={copy} />
}
