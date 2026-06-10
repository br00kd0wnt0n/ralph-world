import { NextResponse, type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { logConsent } from '@/lib/consent'

export const runtime = 'nodejs'

/**
 * Marketing opt-in toggle — Task 3.10.
 *
 * POST /api/account/marketing-opt-in  { granted: boolean }
 *
 * Updates `profiles.marketing_opt_in` AND writes a consent_log row so
 * the legal trail records every change (grant + withdrawal).
 *
 * On grant: also writes a marketingOptInAt timestamp + source='portal'.
 * On withdrawal: clears the timestamp + source. The consent_log row
 * (granted=false) preserves the withdrawal date for our records.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const userId = session.user.id

  let body: { granted?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const granted = body.granted === true
  const db = getDb()

  await db
    .update(profiles)
    .set({
      marketingOptIn: granted,
      marketingOptInAt: granted ? new Date() : null,
      marketingOptInSource: granted ? 'portal' : null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))

  await logConsent({
    userId,
    consentType: 'marketing',
    granted,
    source: 'portal',
  })

  return NextResponse.json({ ok: true, granted })
}
