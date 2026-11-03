import { NextResponse } from 'next/server'

// Ralph TV player analytics ingest (see lib/analytics/tv-tracker.ts).
// Same-origin so the browser needs no CORS and ad-blockers rarely touch it;
// forwards to the broadcaster backend, which validates, rate-limits and stores.
// The viewer's UA (for a coarse device/browser split) and IP (rate limiting
// only) travel as headers; the backend stores neither.
export const dynamic = 'force-dynamic'

const MAX_BODY = 32 * 1024
const TIMEOUT_MS = 3000

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') || ''
  return fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || ''
}

export async function POST(request: Request) {
  const base = process.env.BROADCASTER_BACKEND_URL
  // Always 204 to the browser: analytics must never surface errors or retries.
  const done = new NextResponse(null, { status: 204 })
  if (!base) return done

  let body: string
  try {
    body = await request.text()
  } catch {
    return done
  }
  if (!body || body.length > MAX_BODY) return done

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${base}/analytics/events`, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Viewer-UA': (request.headers.get('user-agent') || '').slice(0, 400),
        'X-Viewer-IP': clientIp(request),
      },
      body,
    })
    if (!res.ok && res.status !== 400) console.warn('[tv-events] backend responded', res.status)
  } catch (e) {
    console.warn('[tv-events] forward failed:', e instanceof Error ? e.message : e)
  } finally {
    clearTimeout(timeout)
  }
  return done
}
