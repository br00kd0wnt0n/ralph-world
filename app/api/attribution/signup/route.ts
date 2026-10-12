import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { pickAttribution } from '@/lib/attribution'
import { recordSignupAttribution } from '@/lib/attribution-server'

export const runtime = 'nodejs'

const LANDINGS = new Set(['issue9'])

/**
 * POST /api/attribution/signup  { landing: 'issue9', attribution?: { utm_* } }
 *
 * Called by a campaign landing page when a visitor returns from Google
 * sign-in. Records where the account came from — only if the account was
 * created in the last few minutes and has no attribution yet, so a returning
 * member signing in is never counted as a new sign-up. (Email/password
 * sign-ups are attributed directly in signupAction.)
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    landing?: unknown
    attribution?: unknown
  }
  const landing = typeof body.landing === 'string' ? body.landing : ''
  if (!LANDINGS.has(landing)) {
    return NextResponse.json({ error: 'Unknown landing' }, { status: 400 })
  }

  const { recorded } = await recordSignupAttribution({
    userId: session.user.id,
    landing,
    attribution: pickAttribution(
      body.attribution && typeof body.attribution === 'object'
        ? (body.attribution as Record<string, unknown>)
        : null
    ),
  })
  return NextResponse.json({ recorded })
}
