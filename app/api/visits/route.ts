import { NextResponse, type NextRequest } from 'next/server'
import { lt, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { pageVisits } from '@/lib/db/schema'
import { rateLimited, clientIp } from '@/lib/rate-limit'
import { pickAttribution } from '@/lib/attribution'
import {
  classifyBrowser,
  classifyDevice,
  classifySource,
  cleanHost,
  isBotUserAgent,
  isPaidVisit,
} from '@/lib/analytics/visit-source'

export const runtime = 'nodejs'

/**
 * POST /api/visits — anonymous visit counter (lib/analytics/visit-tracker.ts).
 *
 * Stores one row per page load ('view') plus the cookie banner answer if
 * given. The IP is used only for rate limiting and the user agent only to
 * drop bots and classify device/in-app browser; neither is stored.
 * Always 204 so a stat can never surface an error to the visitor.
 */

/** Pages the counter is switched on for. */
const TRACKED_PATHS = ['/issue9'] as const
const EVENTS = ['view', 'consent_all', 'consent_necessary'] as const
const BANNER = ['shown', 'already_chosen', 'unknown'] as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RETENTION_DAYS = 90

const noContent = () => new NextResponse(null, { status: 204 })

function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
    ? (value as T)
    : null
}

export async function POST(req: NextRequest) {
  if (rateLimited(`visits:${clientIp(req.headers)}`, 60, 15 * 60_000)) return noContent()

  const ua = req.headers.get('user-agent')
  if (isBotUserAgent(ua)) return noContent()

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return noContent()
  }

  const event = oneOf(EVENTS, body.event)
  const path = oneOf(TRACKED_PATHS, body.path)
  const visitId = typeof body.visitId === 'string' && UUID.test(body.visitId) ? body.visitId : null
  if (!event || !path || !visitId) return noContent()

  const utm = pickAttribution(
    body.utm && typeof body.utm === 'object' ? (body.utm as Record<string, unknown>) : null
  )
  const signals = {
    landing: body.landing !== false,
    utmSource: utm.utm_source,
    utmMedium: utm.utm_medium,
    fbclid: body.fbclid === true,
    ttclid: body.ttclid === true,
    liFatId: body.liFatId === true,
    referrerHost: cleanHost(body.referrerHost),
  }

  try {
    const db = getDb()
    await db
      .insert(pageVisits)
      .values({
        visitId,
        event,
        path,
        source: classifySource(signals),
        clickId: signals.fbclid || signals.ttclid || signals.liFatId,
        paid: isPaidVisit(signals),
        utmSource: utm.utm_source ?? null,
        utmMedium: utm.utm_medium ?? null,
        utmCampaign: utm.utm_campaign ?? null,
        utmContent: utm.utm_content ?? null,
        referrerHost: signals.referrerHost,
        browser: classifyBrowser(ua ?? ''),
        device: classifyDevice(ua ?? ''),
        banner: oneOf(BANNER, body.banner) ?? 'unknown',
      })
      .onConflictDoNothing()

    // Housekeeping: about 1 request in 100 clears rows past retention.
    if (Math.random() < 0.01) {
      await db
        .delete(pageVisits)
        .where(lt(pageVisits.at, sql`now() - make_interval(days => ${RETENTION_DAYS})`))
    }
  } catch (err) {
    console.error('[visits] insert failed:', err)
  }
  return noContent()
}
