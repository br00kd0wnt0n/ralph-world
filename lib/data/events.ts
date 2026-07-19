import { getDb } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'

export interface EventRow {
  id: string
  slug: string
  title: string | null
  descriptionShort: string | null
  eventDate: Date | null
  locationName: string | null
  locationAddress: string | null
  locationPostcode: string | null
  countryCode: string | null
  accentColour: string | null
  thumbnailUrl: string | null
  badge: string | null
  creatureX: string | null
  creatureY: string | null
  verdict: string | null
  externalTicketUrl: string | null
  rsvpEnabled: boolean | null
  rsvpCapacity: number | null
  isPast: boolean | null
}

export async function getActiveEvents(): Promise<EventRow[]> {
  try {
    const db = getDb()
    const rows = await db
      .select()
      .from(events)
      .where(and(eq(events.status, 'published'), eq(events.isPast, false)))
      .orderBy(asc(events.eventDate))
    return rows as EventRow[]
  } catch {
    return []
  }
}

export async function getPastEvents(): Promise<EventRow[]> {
  try {
    const db = getDb()
    const rows = await db
      .select()
      .from(events)
      .where(and(eq(events.status, 'published'), eq(events.isPast, true)))
      .orderBy(desc(events.eventDate))
    return rows as EventRow[]
  } catch {
    return []
  }
}

/** Single published event by slug (any past/active) — for /events/[slug]. */
export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  try {
    const db = getDb()
    const rows = await db
      .select()
      .from(events)
      .where(and(eq(events.status, 'published'), eq(events.slug, slug)))
      .limit(1)
    return (rows[0] as EventRow) ?? null
  } catch {
    return null
  }
}
