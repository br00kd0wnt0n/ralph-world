import { NextResponse, type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { getDb } from '@/lib/db'
import { profiles, users } from '@/lib/db/schema'
import { subscribeToAudience, isMailchimpConfigured } from '@/lib/mailchimp'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// A few thousand users * ~250ms each could easily blow past the default
// route timeout. 5 minutes is a hard ceiling Mailchimp/we can tolerate
// for one run; for larger lists, the loop is paginated so a second call
// continues where the first left off.
export const maxDuration = 300

/**
 * Mailchimp backfill endpoint — Task #30 (Mailchimp pre-launch safety).
 *
 * Calls `subscribeToAudience()` for every user with
 * `profiles.marketing_opt_in = true`. Used post-DNS-cutover to flush
 * the queue of opt-ins captured while MAILCHIMP_DRY_RUN was on.
 *
 * Idempotent: Mailchimp PUT-by-subscriber-hash upserts safely. Re-
 * running surfaces 'already_subscribed' as a success (not a failure).
 *
 * Auth: shared bearer token (`INTERNAL_API_TOKEN`). Same gate as the
 * magazine fulfilment endpoint, so existing operational tooling can
 * authenticate without a new secret.
 *
 * Body (optional):
 *   { limit?: number, offset?: number, dryRun?: boolean }
 *
 * Response:
 *   { ok, total, processed, succeeded, alreadySubscribed, failed,
 *     skippedNoEmail, failures: [...] }
 *
 *   `failures` capped at 20 — full picture is in audit_log and Railway
 *   logs.
 *
 * Note: respects MAILCHIMP_DRY_RUN. If you forget to flip it off before
 * running this, you'll get a run summary of dry_run results and the
 * audience will stay empty. Re-run after disabling the flag.
 */

function authorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_TOKEN
  if (!expected) {
    console.error('[mailchimp-backfill] INTERNAL_API_TOKEN is not set')
    return false
  }
  const header = req.headers.get('authorization') ?? ''
  // Constant-time-ish compare (sensitive to length and content). The
  // token is high-entropy so a plain === is also safe in practice;
  // timingSafeEqual is belt-and-braces.
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

  if (!isMailchimpConfigured()) {
    return NextResponse.json(
      { error: 'Mailchimp env vars not set on this service' },
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
    typeof body.limit === 'number' && body.limit > 0 ? Math.min(body.limit, 1000) : 500
  const offset = typeof body.offset === 'number' && body.offset >= 0 ? body.offset : 0
  const localDryRun = body.dryRun === true

  const db = getDb()

  // Pull eligible profiles + their user emails in one join.
  const rows = await db
    .select({
      userId: profiles.id,
      email: users.email,
      name: users.name,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.id))
    .where(eq(profiles.marketingOptIn, true))
    .limit(limit)
    .offset(offset)

  let processed = 0
  let succeeded = 0
  let alreadySubscribed = 0
  let failed = 0
  let skippedNoEmail = 0
  const failures: Failure[] = []

  // Sequential — Mailchimp's API rate-limit ceiling is ~10 concurrent
  // connections per audience, but the documented sustainable rate for
  // automation work is much lower. Going one-at-a-time also keeps the
  // log readable.
  for (const r of rows) {
    if (!r.email) {
      skippedNoEmail += 1
      continue
    }

    processed += 1

    if (localDryRun) {
      // Per-request dry-run — useful for previewing the eligible set
      // without touching Mailchimp even if the env flag is off.
      continue
    }

    const result = await subscribeToAudience({
      email: r.email,
      name: r.name ?? null,
      status: 'subscribed',
      tags: ['backfill'],
    })

    if (result.ok) {
      if (result.status === 'already_subscribed') alreadySubscribed += 1
      else if (result.status === 'dry_run') {
        // Env-level dry run is on. Track as 'succeeded' for the summary
        // so the caller sees the run reached every record, but mention
        // the flag in the response.
        succeeded += 1
      } else {
        succeeded += 1
      }
    } else if ('skipped' in result && result.skipped) {
      // missing_env shouldn't happen — we checked above — but be safe.
      failed += 1
      if (failures.length < 20) {
        failures.push({
          userId: r.userId,
          email: r.email,
          error: 'missing_env (mid-run)',
        })
      }
    } else {
      failed += 1
      if (failures.length < 20) {
        failures.push({
          userId: r.userId,
          email: r.email,
          error: 'error' in result ? result.error : 'unknown',
        })
      }
    }
  }

  await logAction({
    actorId: null,
    action: 'mailchimp_backfill_run',
    targetType: 'audience',
    targetId: process.env.MAILCHIMP_AUDIENCE_ID ?? null,
    after: {
      limit,
      offset,
      processed,
      succeeded,
      alreadySubscribed,
      failed,
      skippedNoEmail,
      envDryRun: process.env.MAILCHIMP_DRY_RUN ?? null,
      localDryRun,
    },
    source: 'system',
  })

  return NextResponse.json({
    ok: true,
    total: rows.length,
    processed,
    succeeded,
    alreadySubscribed,
    failed,
    skippedNoEmail,
    failures,
    envDryRun: process.env.MAILCHIMP_DRY_RUN === 'true',
    localDryRun,
    hint:
      rows.length === limit
        ? `Hit page limit (${limit}). Re-run with offset=${offset + limit} to continue.`
        : 'All eligible profiles processed.',
  })
}

/**
 * GET — count eligible profiles without writing anything. Useful for
 * pre-flight ("how many people would the backfill touch?").
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.marketingOptIn, true))

  return NextResponse.json({
    eligibleCount: rows.length,
    envDryRun: process.env.MAILCHIMP_DRY_RUN === 'true',
    mailchimpConfigured: isMailchimpConfigured(),
  })
}
