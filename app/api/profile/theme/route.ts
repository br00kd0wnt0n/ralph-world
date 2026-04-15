import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Kept in sync with THEMES in context/ThemeContext.tsx — a mismatch here
// just means the POST returns 400 until the list is updated. Worst case.
const VALID_THEMES = [
  'cosy-dynamics',
  'light',
  '8-bit-nostalgia',
  '1980s-fever-dream',
]

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { theme } = await request.json()
  if (!theme || !VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }

  const db = getDb()
  await db
    .update(profiles)
    .set({ themePreference: theme, updatedAt: new Date() })
    .where(eq(profiles.id, session.user.id))

  return NextResponse.json({ ok: true })
}
