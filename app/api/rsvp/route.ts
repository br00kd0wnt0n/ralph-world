import { NextResponse, type NextRequest } from 'next/server'
import { eq, and, count } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { events, eventRsvps, users } from '@/lib/db/schema'
import { sendTemplate } from '@/lib/email/send'

export const runtime = 'nodejs'

/**
 * POST /api/rsvp
 *
 * Body: { eventId: string }
 *
 * Creates an RSVP for the authenticated user. Idempotent — calling
 * again when already RSVPed returns { status: 'already_attending' }.
 *
 * Failure modes:
 *   401 — not signed in
 *   400 — missing or invalid eventId
 *   404 — event not found or RSVP not enabled on it
 *   409 — event is at capacity
 *   500 — DB error
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: { eventId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { eventId } = body
  if (!eventId || typeof eventId !== 'string') {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  const userId = session.user.id

  try {
    const db = getDb()

    // Fetch event — must be published, RSVP-enabled, and not past
    const [event] = await db
      .select({
        id: events.id,
        title: events.title,
        eventDate: events.eventDate,
        locationName: events.locationName,
        slug: events.slug,
        rsvpEnabled: events.rsvpEnabled,
        rsvpCapacity: events.rsvpCapacity,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!event || !event.rsvpEnabled) {
      return NextResponse.json({ error: 'Event not found or RSVP not available' }, { status: 404 })
    }

    // Check for existing RSVP
    const [existing] = await db
      .select({ id: eventRsvps.id })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)))
      .limit(1)

    if (existing) {
      return NextResponse.json({ status: 'already_attending' }, { status: 200 })
    }

    // Check capacity if set
    if (event.rsvpCapacity != null) {
      const [{ rsvpCount }] = await db
        .select({ rsvpCount: count() })
        .from(eventRsvps)
        .where(eq(eventRsvps.eventId, eventId))

      if (rsvpCount >= event.rsvpCapacity) {
        return NextResponse.json({ error: 'Event is at capacity' }, { status: 409 })
      }
    }

    // Create RSVP
    await db.insert(eventRsvps).values({ eventId, userId })

    // Fire confirmation email (best-effort — don't fail the RSVP if email fails)
    const userEmail = session.user.email
    if (userEmail) {
      const [userRow] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ralph.world'
      const eventDate = event.eventDate
        ? new Date(event.eventDate).toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })
        : 'Date TBC'

      sendTemplate({
        userId,
        to: userEmail,
        templateId: 'event-rsvp',
        props: {
          recipientName: userRow?.name ?? null,
          eventTitle: event.title ?? 'Event',
          eventDate,
          eventLocation: event.locationName ?? null,
          eventUrl: `${appUrl}/events/${event.slug}`,
        },
      }).catch((err) => console.error('[RSVP] email send failed', err))
    }

    return NextResponse.json({ status: 'attending' }, { status: 201 })
  } catch (err) {
    console.error('[RSVP] DB error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * GET /api/rsvp?eventIds=id1,id2,...
 *
 * Returns the set of eventIds the current user has RSVPed to.
 * Used to pre-populate the attending state client-side.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ attending: [] }, { status: 200 })
  }

  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('eventIds') ?? ''
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)

  if (!ids.length) {
    return NextResponse.json({ attending: [] }, { status: 200 })
  }

  try {
    const db = getDb()
    const rows = await db
      .select({ eventId: eventRsvps.eventId })
      .from(eventRsvps)
      .where(eq(eventRsvps.userId, session.user.id))

    const attendingSet = new Set(rows.map((r) => r.eventId))
    const attending = ids.filter((id) => attendingSet.has(id))

    return NextResponse.json({ attending }, { status: 200 })
  } catch {
    return NextResponse.json({ attending: [] }, { status: 200 })
  }
}
