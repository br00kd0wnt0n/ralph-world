import type { Metadata } from 'next'
import { getActiveEvents } from '@/lib/data/events'
import { getSiteCopy } from '@/lib/data/site-copy'
import EventsClient from '@/components/events/EventsClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Ralph does things in rooms. Screenings, parties, panels, and the occasional pop-up.',
  openGraph: {
    title: 'Ralph Events',
    description:
      'Screenings, parties, panels, and the occasional pop-up.',
  },
}

export default async function EventsPage() {
  const [activeEvents, copy] = await Promise.all([
    getActiveEvents(),
    getSiteCopy(),
  ])

  return <EventsClient activeEvents={activeEvents} copy={copy} />
}
