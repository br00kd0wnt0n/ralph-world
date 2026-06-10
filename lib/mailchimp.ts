import 'server-only'

/**
 * Mailchimp newsletter integration — Task 3.6.
 *
 * Wraps Mailchimp Marketing API v3 lists/{id}/members. Only one entry
 * point: `subscribeToAudience()`. Callers (signup flow, account toggle)
 * fire-and-forget — Mailchimp failures must never block signup or
 * preference saves.
 *
 * Env vars (set on Railway):
 *   MAILCHIMP_API_KEY        — `xxxx-us21` (the part after the dash is the server prefix)
 *   MAILCHIMP_AUDIENCE_ID    — list id, looks like `a1b2c3d4e5`
 *   MAILCHIMP_SERVER_PREFIX  — optional override; falls back to parsing from key suffix
 *
 * If any required env is missing, all calls return { ok: false,
 * skipped: true } without throwing — keeps local dev quiet and means
 * production going down on a credential rotation won't take signup
 * with it.
 *
 * Idempotency: Mailchimp returns 400 with `title: "Member Exists"` for
 * re-subscribing an already-subscribed email. We treat that as success
 * (already_subscribed). For an opt-out flow, calling with
 * `status: 'unsubscribed'` is also idempotent.
 *
 * Dry-run kill switch: set MAILCHIMP_DRY_RUN=true to short-circuit
 * EVERY call before it hits Mailchimp. The function still resolves to
 * a success result so the caller's flow proceeds normally (consent_log
 * + profile.marketingOptIn still update); only the HTTP request is
 * skipped. Used during the pre-DNS-cutover window so that any
 * misconfigured welcome automation or double-opt-in confirmation can't
 * email the audience by accident. Switch off after cutover, then run
 * the /api/admin/mailchimp-backfill endpoint to sync the backlog.
 *
 * The Mailchimp Marketing API docs:
 * https://mailchimp.com/developer/marketing/api/list-members/
 */

const TIMEOUT_MS = 5_000

export type MemberStatus = 'subscribed' | 'unsubscribed' | 'pending' | 'cleaned'

export interface SubscribeToAudienceInput {
  email: string
  /** Used to populate Mailchimp FNAME / LNAME merge fields. Split on first whitespace. */
  name?: string | null
  /** 'subscribed' (default) for opt-in; 'unsubscribed' for opt-out. */
  status?: MemberStatus
  /** Optional tags to apply to the member, e.g. ['signup_form']. */
  tags?: string[]
}

export type SubscribeToAudienceResult =
  | { ok: true; status: 'subscribed' | 'already_subscribed' | 'pending' | 'unsubscribed' | 'dry_run' }
  | { ok: false; skipped: true; reason: 'missing_env' }
  | { ok: false; skipped?: false; status: 'failed'; error: string }

/**
 * Read MAILCHIMP_DRY_RUN as a strict boolean — only the literal string
 * 'true' (case-insensitive) counts. Anything else (unset, '0', 'false',
 * 'yes', a typo) means "go live". This is deliberate: a typo on Railway
 * shouldn't accidentally activate sends to the audience.
 */
function isDryRun(): boolean {
  const raw = process.env.MAILCHIMP_DRY_RUN
  if (!raw) return false
  return raw.toLowerCase() === 'true'
}

interface MailchimpErrorBody {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
}

interface MailchimpMemberBody {
  id?: string
  email_address?: string
  status?: MemberStatus
}

function getCredentials(): { apiKey: string; serverPrefix: string; audienceId: string } | null {
  const apiKey = process.env.MAILCHIMP_API_KEY
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID
  if (!apiKey || !audienceId) return null

  // Mailchimp keys end with `-<server>` (e.g. `…-us21`). The override env
  // wins so editors can pin a different DC for testing.
  const fromKey = apiKey.split('-')[1] ?? null
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX || fromKey
  if (!serverPrefix) return null
  return { apiKey, serverPrefix, audienceId }
}

function splitName(name: string | null | undefined): {
  FNAME?: string
  LNAME?: string
} {
  if (!name) return {}
  const trimmed = name.trim()
  if (!trimmed) return {}
  const firstSpace = trimmed.indexOf(' ')
  if (firstSpace === -1) return { FNAME: trimmed }
  return {
    FNAME: trimmed.slice(0, firstSpace),
    LNAME: trimmed.slice(firstSpace + 1).trim() || undefined,
  }
}

/**
 * PUT lists/{id}/members/{subscriber_hash} — UPSERT semantics. Creates
 * the member if absent, updates status/merge_fields if present. This is
 * the documented-by-Mailchimp pattern for an idempotent opt-in /
 * opt-out endpoint (POST would error on re-subscribe).
 */
export async function subscribeToAudience(
  input: SubscribeToAudienceInput
): Promise<SubscribeToAudienceResult> {
  const creds = getCredentials()
  if (!creds) {
    return { ok: false, skipped: true, reason: 'missing_env' }
  }

  const email = input.email.trim().toLowerCase()

  // Kill switch: log the intended call but don't fire HTTP. Logged at
  // info-level so Railway logs let you confirm the integration is
  // wired correctly without anything reaching Mailchimp.
  if (isDryRun()) {
    console.info(
      `[mailchimp:dry-run] would PUT lists/${creds.audienceId}/members for ${email} status=${
        input.status ?? 'subscribed'
      } tags=${(input.tags ?? []).join(',') || '-'}`
    )
    return { ok: true, status: 'dry_run' }
  }
  // Mailchimp's subscriber_hash is the MD5 of the lowercased email.
  const subscriberHash = await md5Hex(email)
  const url = `https://${creds.serverPrefix}.api.mailchimp.com/3.0/lists/${encodeURIComponent(
    creds.audienceId
  )}/members/${subscriberHash}`

  const status = input.status ?? 'subscribed'
  const body = {
    email_address: email,
    status_if_new: status, // applies on create
    status, // applies on update — together these make PUT idempotent
    merge_fields: splitName(input.name),
    tags: input.tags ?? [],
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `apikey ${creds.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (res.ok) {
      const json = (await res.json()) as MailchimpMemberBody
      const resolved = json.status ?? status
      if (resolved === 'subscribed') return { ok: true, status: 'subscribed' }
      if (resolved === 'pending') return { ok: true, status: 'pending' }
      if (resolved === 'unsubscribed') return { ok: true, status: 'unsubscribed' }
      // 'cleaned' shouldn't happen via our writes; treat as failure so we
      // notice.
      return { ok: false, status: 'failed', error: `unexpected_status:${resolved}` }
    }

    // Mailchimp error envelope (JSON:API problem document).
    const errBody = (await res.json().catch(() => null)) as MailchimpErrorBody | null
    if (res.status === 400 && errBody?.title === 'Member Exists') {
      return { ok: true, status: 'already_subscribed' }
    }
    // 404 from the lists endpoint = bad audience id. Surface explicitly
    // so config rot doesn't fail silently.
    if (res.status === 404) {
      return {
        ok: false,
        status: 'failed',
        error: 'audience_not_found — check MAILCHIMP_AUDIENCE_ID',
      }
    }
    const detail = errBody?.detail || errBody?.title || `http_${res.status}`
    return { ok: false, status: 'failed', error: detail }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      return { ok: false, status: 'failed', error: 'timeout' }
    }
    return {
      ok: false,
      status: 'failed',
      error: err instanceof Error ? err.message : 'network_error',
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Subscriber hash = MD5 hex of lowercased email. Uses the Web Crypto
 * SubtleCrypto API — runs in both Node.js (>=18) and edge runtimes
 * without bringing in a hashing dep.
 *
 * MD5 isn't built into SubtleCrypto, so we use Node's `crypto`
 * directly. This file is `server-only` so import-time is safe.
 */
async function md5Hex(input: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('md5').update(input).digest('hex')
}

export function isMailchimpConfigured(): boolean {
  return getCredentials() !== null
}
