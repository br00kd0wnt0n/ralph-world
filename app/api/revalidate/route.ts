import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

function verifyBearer(authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * On-demand revalidation triggered by the CMS after content changes.
 * Secured with REVALIDATE_SECRET shared between ralph-world and ralph-cms.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Revalidation not configured' },
      { status: 500 }
    )
  }

  if (!verifyBearer(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let paths: string[] = []
  try {
    const body = await request.json()
    if (Array.isArray(body.paths)) {
      paths = body.paths
    } else if (typeof body.path === 'string') {
      paths = [body.path]
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (paths.length === 0) {
    return NextResponse.json({ error: 'No paths provided' }, { status: 400 })
  }

  for (const path of paths) {
    revalidatePath(path)
  }

  return NextResponse.json({ ok: true, revalidated: paths })
}
