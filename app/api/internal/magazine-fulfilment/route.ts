import { NextResponse, type NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { fulfilIssue, getIssueShipmentSummary } from '@/lib/magazine-fulfilment'

export const runtime = 'nodejs'
// Fulfilment can take a while when there are many subscribers. Push the
// route timeout up — Railway default is fine but on Vercel/Edge runtimes
// the default 10s would cut off mid-batch. nodejs runtime above is the
// main lever; this hint just documents intent.
export const maxDuration = 300

/**
 * Internal magazine fulfilment endpoint — Task 3.9 + security hardening.
 *
 * Called by ralph-cms (server-side) to kick off the batch job for a
 * specific issue. Auth via shared bearer token in `Authorization`
 * header — env var INTERNAL_API_TOKEN must match on both services.
 *
 * POST { issueId, dryRun?, actorId? } → run summary
 * GET ?issueId=... → { queued, shopifyOrderCreated, fulfilled, failed, total }
 *
 * 401 — missing/wrong token
 * 400 — missing / malformed issueId, oversized body
 * 429 — per-IP rate limit tripped
 * 500 — handler threw
 *
 * Defence in depth (audit items #1, #3, #4, #6, #9):
 *   - timingSafeEqual bearer check (no early-exit timing channel)
 *   - strict UUID validation on issueId + actorId
 *   - request body size cap
 *   - in-memory per-IP rate limit backstop (the real money-spend guard
 *     is the per-issue DB run-lock inside fulfilIssue)
 *   - actorId threaded through to the audit trail
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BODY_BYTES = 2_048

// ── In-memory per-IP rate limiter (fixed window) ──────────────────────
// Backstop only — defends against a leaked token being scripted against
// this endpoint (enumeration via dry-run / GET, Shopify-budget burn via
// many issue ids). The authoritative money-spend guard is the per-issue
// run-lock in fulfilIssue(). This map lives in module scope; on Railway's
// long-running Node process that persists across requests. If the service
// ever scales horizontally the limit becomes per-instance — acceptable
// for a backstop, and Cloudflare WAF is the recommended belt-and-braces.
const RATE_LIMIT = 20 // requests
const RATE_WINDOW_MS = 60_000 // per minute, per IP
const ipHits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(req: NextRequest): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (ipHits.size > 1_000) {
      for (const [k, v] of ipHits) if (now > v.resetAt) ipHits.delete(k)
    }
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT
}

function authorized(req: NextRequest): boolean {
  const token = process.env.INTERNAL_API_TOKEN
  if (!token) {
    // Fail closed if no token configured rather than letting any request through.
    console.error('[internal/magazine-fulfilment] INTERNAL_API_TOKEN is not set')
    return false
  }
  const provided = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${token}`)
  // timingSafeEqual throws if lengths differ, so guard first. The length
  // check itself is not secret (token length is fixed by our config).
  if (provided.length !== expected.length) return false
  try {
    return timingSafeEqual(provided, expected)
  } catch {
    return false
  }
}

function tooLarge(req: NextRequest): boolean {
  const len = Number(req.headers.get('content-length') ?? '0')
  return Number.isFinite(len) && len > MAX_BODY_BYTES
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (rateLimited(req)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  if (tooLarge(req)) {
    return NextResponse.json({ error: 'Body too large' }, { status: 400 })
  }

  let body: { issueId?: unknown; dryRun?: unknown; actorId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.issueId !== 'string' || !UUID_RE.test(body.issueId)) {
    return NextResponse.json({ error: 'issueId must be a UUID' }, { status: 400 })
  }
  // actorId is optional but, if present, must be a UUID — never trust a
  // free-form string into the audit log.
  let actorId: string | null = null
  if (body.actorId != null) {
    if (typeof body.actorId !== 'string' || !UUID_RE.test(body.actorId)) {
      return NextResponse.json({ error: 'actorId must be a UUID' }, { status: 400 })
    }
    actorId = body.actorId
  }

  try {
    const result = await fulfilIssue({
      issueId: body.issueId,
      dryRun: body.dryRun === true,
      actorId,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (err) {
    console.error('[internal/magazine-fulfilment] handler threw', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Internal error',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (rateLimited(req)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  const { searchParams } = new URL(req.url)
  const issueId = searchParams.get('issueId')
  if (!issueId || !UUID_RE.test(issueId)) {
    return NextResponse.json({ error: 'issueId must be a UUID' }, { status: 400 })
  }
  try {
    const summary = await getIssueShipmentSummary(issueId)
    return NextResponse.json(summary, { status: 200 })
  } catch (err) {
    console.error('[internal/magazine-fulfilment] summary threw', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
