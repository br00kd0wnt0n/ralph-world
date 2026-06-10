import { NextResponse, type NextRequest } from 'next/server'
import { fulfilIssue, getIssueShipmentSummary } from '@/lib/magazine-fulfilment'

export const runtime = 'nodejs'
// Fulfilment can take a while when there are many subscribers. Push the
// route timeout up — Railway default is fine but on Vercel/Edge runtimes
// the default 10s would cut off mid-batch. nodejs runtime above is the
// main lever; this hint just documents intent.
export const maxDuration = 300

/**
 * Internal magazine fulfilment endpoint — Task 3.9.
 *
 * Called by ralph-cms (server-side) to kick off the batch job for a
 * specific issue. Auth via shared bearer token in `Authorization`
 * header — env var INTERNAL_API_TOKEN must match on both services.
 *
 * POST { issueId, dryRun? } → { eligible, skipped_existing, orders_created, failed, failures[] }
 *
 * GET ?issueId=... → { queued, shopifyOrderCreated, fulfilled, failed, total }
 *
 * 401 — missing/wrong token
 * 400 — missing issueId
 * 500 — handler threw
 */

function authorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_TOKEN
  if (!expected) {
    // Fail closed if no token configured rather than letting any request through.
    console.error('[internal/magazine-fulfilment] INTERNAL_API_TOKEN is not set')
    return false
  }
  const header = req.headers.get('authorization') ?? ''
  // Constant-time-ish comparison (length + content). The token is high
  // entropy so a simple === is fine here in practice.
  return header === `Bearer ${expected}`
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { issueId?: string; dryRun?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.issueId || typeof body.issueId !== 'string') {
    return NextResponse.json({ error: 'issueId required' }, { status: 400 })
  }

  try {
    const result = await fulfilIssue({
      issueId: body.issueId,
      dryRun: Boolean(body.dryRun),
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
  const { searchParams } = new URL(req.url)
  const issueId = searchParams.get('issueId')
  if (!issueId) {
    return NextResponse.json({ error: 'issueId required' }, { status: 400 })
  }
  try {
    const summary = await getIssueShipmentSummary(issueId)
    return NextResponse.json(summary, { status: 200 })
  } catch (err) {
    console.error('[internal/magazine-fulfilment] summary threw', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
