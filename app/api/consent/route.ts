import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { logConsent, type ConsentType } from '@/lib/consent'

export const runtime = 'nodejs'

/**
 * POST /api/consent
 *
 * Body: { consentType: ConsentType, granted: boolean }
 *
 * Writes a consent_log row. Used by:
 *   - cookie banner (consentType: 'cookies_all' | 'cookies_necessary')
 *   - member portal marketing toggle (consentType: 'marketing')
 *
 * Anonymous visitors are allowed — `userId` is set to null. The
 * consent_log row is the source of truth either way; client-side
 * localStorage is a non-binding cache that controls UI.
 *
 * Failure modes:
 *   400 — invalid body / unknown consent type
 *   500 — DB insert error (still 200 to client to avoid leaking)
 */

const VALID_TYPES: ConsentType[] = [
  'marketing',
  'terms',
  'privacy',
  'cookies_all',
  'cookies_necessary',
]

export async function POST(req: NextRequest) {
  let body: { consentType?: string; granted?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const consentType = body.consentType as ConsentType
  if (!consentType || !VALID_TYPES.includes(consentType)) {
    return NextResponse.json({ error: 'Invalid consentType' }, { status: 400 })
  }
  if (typeof body.granted !== 'boolean') {
    return NextResponse.json({ error: 'granted must be boolean' }, { status: 400 })
  }

  const session = await auth()
  const userId = session?.user?.id ?? null

  await logConsent({
    userId,
    consentType,
    granted: body.granted,
    source: consentType.startsWith('cookies_') ? 'cookie_banner' : 'portal',
  })

  return NextResponse.json({ ok: true })
}
