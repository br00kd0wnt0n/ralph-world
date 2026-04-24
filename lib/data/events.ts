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
