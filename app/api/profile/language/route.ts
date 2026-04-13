import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { language } = await request.json()
  if (!language || !['en', 'ja', 'hi'].includes(language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  const db = getDb()
  await db
    .update(profiles)
    .set({ languagePreference: language, updatedAt: new Date() })
    .where(eq(profiles.id, session.user.id))

  return NextResponse.json({ ok: true })
}
