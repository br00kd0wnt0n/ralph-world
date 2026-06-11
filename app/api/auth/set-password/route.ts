import { NextResponse, type NextRequest } from 'next/server'
import { consumePasswordResetToken } from '@/lib/auth/password-reset'
import { hashPassword, validatePassword } from '@/lib/auth/passwords'
import { logAction } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimited, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * POST /api/auth/set-password
 * Body: { email: string; token: string; password: string }
 *
 * Validates the reset token and updates the password hash.
 * On success redirects to /login?reset=ok.
 */
export async function POST(request: NextRequest) {
  if (rateLimited(`set-password:${clientIp(request.headers)}`, 10, 15 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429 }
    )
  }
  let email: string | undefined
  let token: string | undefined
  let password: string | undefined

  try {
    const body = await request.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
    token = typeof body?.token === 'string' ? body.token.trim() : undefined
    password = typeof body?.password === 'string' ? body.password : undefined
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!email || !token || !password) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }

  // Use the same policy as signup so a reset can't set a weaker password
  // than the signup floor (was hardcoded < 8; signup requires 10).
  const pwCheck = validatePassword(password)
  if (!pwCheck.ok) {
    return NextResponse.json(
      { ok: false, error: 'password_too_short', message: pwCheck.reason },
      { status: 400 }
    )
  }

  const result = await consumePasswordResetToken({ email, token })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 })
  }

  const hash = await hashPassword(password)
  await getDb()
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.id, result.userId))

  await logAction({
    actorId: result.userId,
    action: 'password_reset',
    targetType: 'user',
    targetId: result.userId,
    after: { method: 'reset_token' },
    source: 'portal',
  })

  return NextResponse.json({ ok: true })
}
