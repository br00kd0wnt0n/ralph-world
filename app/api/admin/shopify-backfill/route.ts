import { NextResponse, type NextRequest } from 'next/server'
import { eq, isNull, sql } from 'drizzle-orm'
import crypto from 'crypto'
import { getDb } from '@/lib/db'
import { users, shopifyLinks } from '@/lib/db/schema'
import { findOrCreateCustomer } from '@/lib/shopify/customer'
import { isShopifyAdminConfigured } from '@/lib/shopify/admin-client'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Backfilling ~hundreds of users hits Shopify Admin sequentially at ~1
// req/s safe rate. 5 minutes covers ~300 users; bigger backfills paginate
// via the offset param so a second call resumes where the first left off.
export const maxDuration = 300

/**
 * Shopify customer auto-link backfill — one-off post-config-fix tool.
 *
 * Reason this exists: `findOrCreateCustomer` only fires on first signup
 * (from lib/auth/signup.ts and the Auth.js createUser event). Anyone who
 * signed up BEFORE the Shopify Admin env vars were correctly set on
 * Railway (or whose call failed for any other reason) is now stuck
 * without a `shopify_links` row, and so invisible to magazine fulfilment
 * even if they're paid subscribers.
 *
 * This route loops every user without a `shopify_links` row and calls
 * findOrCreateCustomer for each. `findOrCreateCustomer` is already
 * idempotent: if a row appeared between selection and execution it
 * short-circuits as 'alreadyLinked'. So this endpoint is safe to re-run.
 *
 * Auth: shared bearer token (INTERNAL_API_TOKEN) — same gate as the
 * magazine-fulfilment + mailchimp-backfill internal endpoints.
 *
 * Body (optional): { limit?: number, offset?: number, dryRun?: boolean }
 *
 * Response: { ok, total, processed, succeeded, alreadyLinked, failed,
 *             skippedNoEmail, failures: [...] }
 */

function authorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_TOKEN
  if (!expected) {
    console.error('[shopify-backfill] INTERNAL_API_TOKEN is not set')
    return false
  }
  const header = req.headers.get('authorization') ?? ''
  if (header.length !== `Bearer ${expected}`.length) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(header),
      Buffer.from(`Bearer ${expected}`)
    )
  } catch {
    return false
  }
}

interface Failure {
  userId: string
  email: string | null
  error: string
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isShopifyAdminConfigured()) {
    return NextResponse.json(
      { error: 'Shopify Admin env vars not set on this service' },
      { status: 500 }
    )
  }

  let body: { limit?: unknown; offset?: unknown; dryRun?: unknown } = {}
  try {
    if (req.headers.get('content-length') !== '0') {
      body = await req.json()
    }
  } catch {
    /* allow empty body */
  }
  const limit =
    typeof body.limit === 'number' && body.limit > 0
      ? Math.min(body.limit, 1000)
      : 500
  const offset =
    typeof body.offset === 'number' && body.offset >= 0 ? body.offset : 0
  const localDryRun = body.dryRun === true

  const db = getDb()

  // Users without a shopify_links row. ORDER BY users.id keeps pagination
  // stable across calls; users.id is a primary key so the order is total.
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .leftJoin(shopifyLinks, eq(shopifyLinks.userId, users.id))
    .where(isNull(shopifyLinks.id))
    .orderBy(users.id)
    .limit(limit)
    .offset(offset)

  let processed = 0
  let succeeded = 0
  let alreadyLinked = 0
  let failed = 0
  let skippedNoEmail = 0
  const failures: Failure[] = []

  // Sequential — Shopify Admin REST rate-limit is ~2 calls/sec at the low
  // end, and findOrCreateCustomer does 1-2 calls per user. Going parallel
  // would just trigger 429 backoff in the admin-client wrapper and produce
  // a noisier log without finishing meaningfully faster.
  for (const r of rows) {
    if (!r.email) {
      skippedNoEmail += 1
      continue
    }

    processed += 1

    if (localDryRun) {
      // Preview-only: don't touch Shopify. Useful to confirm the
      // candidate-user set before committing.
      continue
    }

    try {
      const result = await findOrCreateCustomer({
        userId: r.userId,
        email: r.email,
        name: r.name ?? null,
      })
      if (result.alreadyLinked) {
        alreadyLinked += 1
      } else {
        succeeded += 1
      }
    } catch (err) {
      failed += 1
      if (failures.length < 20) {
        failures.push({
          userId: r.userId,
          email: r.email,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  await logAction({
    actorId: null,
    action: 'shopify_backfill_run',
    targetType: 'users',
    targetId: null,
    after: {
      limit,
      offset,
      total_candidates: rows.length,
      processed,
      succeeded,
      alreadyLinked,
      failed,
      skippedNoEmail,
      localDryRun,
    },
    source: 'system',
  })

  return NextResponse.json({
    ok: true,
    total: rows.length,
    processed,
    succeeded,
    alreadyLinked,
    failed,
    skippedNoEmail,
    failures,
    localDryRun,
    hint:
      rows.length === limit
        ? `Hit page limit (${limit}). Re-run with offset=${offset + limit} to continue.`
        : 'All candidate users processed.',
  })
}

/**
 * GET — count users without a Shopify link, without touching Shopify.
 * Pre-flight ("how many would the backfill process?").
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .leftJoin(shopifyLinks, eq(shopifyLinks.userId, users.id))
    .where(isNull(shopifyLinks.id))

  return NextResponse.json({
    candidateCount: row?.n ?? 0,
    shopifyAdminConfigured: isShopifyAdminConfigured(),
  })
}
