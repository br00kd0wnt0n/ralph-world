import { NextResponse, type NextRequest } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import crypto from 'crypto'
import { getDb } from '@/lib/db'
import { users, profiles, shopifyLinks } from '@/lib/db/schema'
import {
  isShopifyAdminConfigured,
  shopifyAdminFetch,
} from '@/lib/shopify/admin-client'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Shopify subscriber import — Phase 9 cutover tool.
 *
 * Pulls Shopify customers matching a tag (e.g. "Magazine Subscriber"),
 * creates a matching user + profile + shopify_link in ralph-world for
 * each, so the magazine-fulfilment batch (which queries
 * profiles.tier='paid' AND has shopify_link) ships them on the next
 * issue.
 *
 * Three outcomes per Shopify customer:
 *   - already_imported : email exists in users AND shopify_links row points
 *                        at the same Shopify customer id → skip.
 *   - linked_existing  : email exists in users but no shopify_links row →
 *                        add the link + bump profile to tier='paid'.
 *   - created          : no users row → create users + profiles + link.
 *
 * Imported users land with email_verified = null. They keep receiving
 * magazines (the fulfilment job doesn't care about verification); they
 * can later claim their account through the standard email/password
 * signup flow which collapses onto the existing users row by email.
 *
 * Auth: shared bearer token (INTERNAL_API_TOKEN) — same gate as the
 * other admin endpoints.
 *
 * Body:
 *   tag      string  required — Shopify customer tag (e.g. "subscriber").
 *   sinceId  string  optional — paginate by since_id (highest Shopify
 *                    customer id from previous response).
 *   limit    number  optional — page size, max 250, default 50.
 *   dryRun   boolean optional — defaults true; nothing is written.
 *
 * Idempotent: re-running with the same tag is safe because each candidate
 * is classified before action and "already_imported" is a no-op.
 */

function authorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_TOKEN
  if (!expected) {
    console.error('[shopify-import-subscribers] INTERNAL_API_TOKEN is not set')
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

interface ShopifyAddress {
  id?: number
  first_name?: string | null
  last_name?: string | null
  name?: string | null
  default?: boolean | null
}

interface ShopifyCustomer {
  id: number
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  default_address?: ShopifyAddress | null
  tags?: string | null
}

interface ShopifyCustomerSearchResponse {
  customers?: ShopifyCustomer[]
}

interface Candidate {
  shopifyCustomerId: string
  email: string
  name: string | null
  defaultAddress: ShopifyAddress | null
  action: 'already_imported' | 'linked_existing' | 'created' | 'skipped'
  reason?: string
}

interface Failure {
  shopifyCustomerId: string
  email: string | null
  error: string
}

function fullName(c: ShopifyCustomer): string | null {
  const first = c.first_name?.trim() ?? ''
  const last = c.last_name?.trim() ?? ''
  const joined = `${first} ${last}`.trim()
  return joined.length > 0 ? joined : null
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

  let body: {
    tag?: unknown
    sinceId?: unknown
    limit?: unknown
    dryRun?: unknown
  } = {}
  try {
    if (req.headers.get('content-length') !== '0') {
      body = await req.json()
    }
  } catch {
    /* empty body allowed for GET-style preview, but POST requires tag */
  }

  const tag = typeof body.tag === 'string' ? body.tag.trim() : ''
  if (!tag) {
    return NextResponse.json(
      { error: 'tag is required (Shopify customer tag, e.g. "subscriber")' },
      { status: 400 }
    )
  }

  const limit =
    typeof body.limit === 'number' && body.limit > 0
      ? Math.min(body.limit, 250)
      : 50
  const sinceId =
    typeof body.sinceId === 'string' && /^\d+$/.test(body.sinceId)
      ? body.sinceId
      : undefined
  // Default to dryRun unless the caller explicitly opts in by passing
  // dryRun=false. Belt-and-braces against an accidental import sweep.
  const dryRun = body.dryRun !== false

  // Fetch matching Shopify customers. The search endpoint supports
  // since_id pagination — pass the highest id from the previous response
  // to advance.
  const query: Record<string, string> = { query: `tag:${tag}`, limit: String(limit) }
  if (sinceId) query.since_id = sinceId

  const fetched = await shopifyAdminFetch<ShopifyCustomerSearchResponse>({
    method: 'GET',
    path: '/customers/search.json',
    query,
  })
  const customers = fetched.customers ?? []

  const db = getDb()
  const candidates: Candidate[] = []
  const failures: Failure[] = []

  let created = 0
  let linkedExisting = 0
  let alreadyImported = 0
  let skippedNoEmail = 0
  let failed = 0

  for (const c of customers) {
    const email = c.email?.trim().toLowerCase() ?? ''
    if (!email) {
      skippedNoEmail += 1
      candidates.push({
        shopifyCustomerId: String(c.id),
        email: '',
        name: fullName(c),
        defaultAddress: c.default_address ?? null,
        action: 'skipped',
        reason: 'no email on Shopify customer',
      })
      continue
    }

    try {
      // Existing user by email (case-insensitive). Auth.js stores email
      // already lowercased on create, but we lower() on both sides for
      // belt-and-braces against any inserts from earlier code.
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1)

      if (existingUser) {
        // Already linked?
        const [link] = await db
          .select({ id: shopifyLinks.id })
          .from(shopifyLinks)
          .where(eq(shopifyLinks.userId, existingUser.id))
          .limit(1)

        if (link) {
          alreadyImported += 1
          candidates.push({
            shopifyCustomerId: String(c.id),
            email,
            name: fullName(c),
            defaultAddress: c.default_address ?? null,
            action: 'already_imported',
          })
          continue
        }

        // User exists, no link yet — add link + bump tier to paid.
        if (!dryRun) {
          await db.insert(shopifyLinks).values({
            userId: existingUser.id,
            shopifyCustomerId: String(c.id),
            linkMethod: 'subscriber_import',
          })
          await db
            .update(profiles)
            .set({
              tier: 'paid',
              subscriptionStatus: 'paid',
              shippingAddressCached: c.default_address ?? null,
              updatedAt: new Date(),
            })
            .where(eq(profiles.id, existingUser.id))
        }
        linkedExisting += 1
        candidates.push({
          shopifyCustomerId: String(c.id),
          email,
          name: fullName(c),
          defaultAddress: c.default_address ?? null,
          action: 'linked_existing',
        })
        continue
      }

      // Brand-new user — create users + profiles + link.
      if (!dryRun) {
        const inserted = await db
          .insert(users)
          .values({ email, name: fullName(c) })
          .returning({ id: users.id })
        const userId = inserted[0]?.id
        if (!userId) throw new Error('user insert returned no id')

        await db.insert(profiles).values({
          id: userId,
          displayName: fullName(c),
          tier: 'paid',
          subscriptionStatus: 'paid',
          shippingAddressCached: c.default_address ?? null,
          marketingOptIn: false,
        })
        await db.insert(shopifyLinks).values({
          userId,
          shopifyCustomerId: String(c.id),
          linkMethod: 'subscriber_import',
        })
      }
      created += 1
      candidates.push({
        shopifyCustomerId: String(c.id),
        email,
        name: fullName(c),
        defaultAddress: c.default_address ?? null,
        action: 'created',
      })
    } catch (err) {
      failed += 1
      if (failures.length < 20) {
        failures.push({
          shopifyCustomerId: String(c.id),
          email,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  const maxId = customers.reduce((acc, c) => (c.id > acc ? c.id : acc), 0)
  const nextSinceId = customers.length === limit ? String(maxId) : null

  await logAction({
    actorId: null,
    action: 'shopify_subscriber_import_run',
    targetType: 'users',
    targetId: null,
    after: {
      tag,
      sinceId,
      limit,
      dryRun,
      totalFetched: customers.length,
      created,
      linkedExisting,
      alreadyImported,
      skippedNoEmail,
      failed,
      nextSinceId,
    },
    source: 'system',
  })

  return NextResponse.json({
    ok: true,
    dryRun,
    tag,
    totalFetched: customers.length,
    created,
    linkedExisting,
    alreadyImported,
    skippedNoEmail,
    failed,
    failures,
    nextSinceId,
    candidates,
    hint: nextSinceId
      ? `More candidates available — re-run with sinceId=${nextSinceId} to continue.`
      : 'All Shopify customers matching the tag have been processed.',
  })
}

/**
 * GET — config sanity. Doesn't hit Shopify (no good zero-cost count for
 * tag matches without paginating the whole result anyway).
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    shopifyAdminConfigured: isShopifyAdminConfigured(),
    usage:
      'POST { tag, sinceId?, limit?, dryRun? } — dryRun defaults to true.',
  })
}
