import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
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

// Allowlist — the CMS only ever revalidates these. Constrains the blast
// radius if REVALIDATE_SECRET leaks (no arbitrary-path cache poisoning / DoS).
const ALLOWED_TAGS = new Set(['site-copy'])
const ALLOWED_PATH_PREFIXES = [
  '/',
  '/magazine',
  '/events',
  '/tv',
  '/shop',
  '/lab',
  '/site-copy',
  '/homepage',
  '/issues',
  '/case-studies',
]
const MAX_ITEMS = 50

function pathAllowed(p: string): boolean {
  if (typeof p !== 'string' || p.length > 256 || !p.startsWith('/')) return false
  if (p === '/') return true
  return ALLOWED_PATH_PREFIXES.some((prefix) => prefix !== '/' && (p === prefix || p.startsWith(prefix + '/')))
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
  let tags: string[] = []
  try {
    const body = await request.json()
    if (Array.isArray(body.paths)) {
      paths = body.paths
    } else if (typeof body.path === 'string') {
      paths = [body.path]
    }
    if (Array.isArray(body.tags)) {
      tags = body.tags.filter((t: unknown): t is string => typeof t === 'string')
    } else if (typeof body.tag === 'string') {
      tags = [body.tag]
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Constrain to the allowlist + cap count before doing any work.
  paths = paths.filter(pathAllowed).slice(0, MAX_ITEMS)
  tags = tags.filter((t) => ALLOWED_TAGS.has(t)).slice(0, MAX_ITEMS)

  if (paths.length === 0 && tags.length === 0) {
    return NextResponse.json(
      { error: 'No allowed paths or tags provided' },
      { status: 400 }
    )
  }

  for (const path of paths) {
    revalidatePath(path)
  }
  // revalidatePath does NOT invalidate `unstable_cache` entries — we tag
  // those (e.g. 'site-copy' on `getSiteCopy`) and bust them explicitly
  // here. Without this, a CMS toggle change would wait up to 5 minutes
  // for the natural TTL to expire.
  //
  // Next.js 16 requires a profile argument; 'default' triggers an
  // immediate cache bust for tagged unstable_cache entries.
  for (const tag of tags) {
    revalidateTag(tag, 'default')
  }

  return NextResponse.json({ ok: true, revalidated: { paths, tags } })
}
