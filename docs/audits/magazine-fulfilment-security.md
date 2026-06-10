# Magazine Fulfilment — Security Audit

_Audit date: 2026-06-10. Scope: cross-service batch job (ralph-cms server action → ralph-world internal POST → Shopify Admin orders). Blast radius: fraudulent Shopify orders against paid subscribers._

> Status key: ✅ fine · ⚠️ tighten · ❌ block launch. See "Remediation status" at the bottom for what's been fixed.

## Punch list

**Block launch**
- **#3 No rate limit on POST** — token leak = unbounded Shopify spam.
- **#6 Audit log has no actor** — `actorId: null` defeats the whole point of `audit_log` (arch §13).

**Fix before launch**
- **#1 Replace `===` with `timingSafeEqual`** — cheap, pattern already in repo.
- **#5 Editor role too permissive** — gate on admin only.
- **#4 Tighten `issueId` validation** — UUID regex + length cap.

**Fix in first iteration**
- **#8 Document orphan-order remediation** — runbook + reconciliation script.
- **#9 Rate-limit dry runs too** (subsumed by #3 if applied globally).

**Monitor / accept**
- **#2 Token never echoed in logs/errors** — already safe.
- **#7 Mid-flight unpublish race** — acceptable; couple to #3 guard.
- **#10 Magazine-shipped email** — safe.
- **#11 Webhook HMAC** — verified safe.

---

## 1. Token comparison — Tighten ⚠️

`route.ts` — `return header === \`Bearer ${expected}\``. Code comment claimed "high entropy so a simple === is fine here in practice." Token entropy doesn't fully neutralise timing channels on a network-reachable endpoint, and `verifyHmac.ts` already uses `timingSafeEqual`. Zero-cost to align.

```ts
import { timingSafeEqual } from 'node:crypto'
const expected = Buffer.from(`Bearer ${process.env.INTERNAL_API_TOKEN}`)
const provided = Buffer.from(req.headers.get('authorization') ?? '')
if (expected.length !== provided.length) return false
return timingSafeEqual(expected, provided)
```

## 2. Token in logs / errors — Fine ✅

Route logs only `err` (never headers). 500 body is `err.message` only. `admin-client.ts` logs Shopify status + path, no `Authorization`. CMS `magazine-fulfilment.ts` echoes response *body* (not the token it sent). Safe.

## 3. Rate limiting — Block launch ❌

The POST endpoint had **zero** rate limiting. If `INTERNAL_API_TOKEN` leaks (Railway env screenshot, CI log, accidental `console.log`), an attacker hits this endpoint at line-speed. DB UNIQUE saves us from duplicate orders for the *same* issue, but it doesn't stop: (a) burning Shopify rate budget across many issue ids, (b) enumerating subscriber counts via dry-runs, (c) running fulfilment against any issue UUID an attacker can guess or scrape.

Recommended: per-issue serialisation table — correct, idempotent, audit-friendly.

```ts
// migration: magazine_fulfilment_runs (issue_id PK, started_at, finished_at, actor_id)
const ins = await db.insert(magazineFulfilmentRuns)
  .values({ issueId, startedAt: new Date(), actorId })
  .onConflictDoNothing({ target: magazineFulfilmentRuns.issueId })
if (ins.rowCount === 0) {
  const [row] = await db.select().from(magazineFulfilmentRuns)
    .where(eq(magazineFulfilmentRuns.issueId, issueId))
  if (Date.now() - row.startedAt.getTime() < 5 * 60_000)
    throw new Error('Fulfilment already running for this issue')
  // stale lock — overwrite started_at
}
// in finally: update finished_at
```

Layer a per-IP token bucket (e.g. 10 req / 60s) for GET + dry-runs — covers enumeration. Cloudflare WAF in front of Railway is fine as secondary.

## 4. Input validation — Tighten ⚠️

Route only checked `typeof === 'string'`. Drizzle parameterises, but unbounded input still hits the DB and `JSON.parse` first. Tight UUID regex:

```ts
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (typeof body.issueId !== 'string' || !UUID.test(body.issueId))
  return NextResponse.json({ error: 'issueId must be a UUID' }, { status: 400 })
```

Also cap raw body size — early `content-length` check, reject >2KB.

## 5. CMS auth check — Tighten to admin ⚠️

CMS server action used `hasAccess(session.role)` which permits **admin OR editor**. This is a money-equivalent action (real Shopify orders, stock decrement, shipping cost) and irreversible without manual remediation. Editor role is for content. Restrict to admin, and don't render the button to editors.

## 6. Audit log coverage — Block launch ❌

`fulfilIssue()` wrote `actorId: null`. The CMS knows the user from `auth()` but didn't pass it through. Without an actor, "who fulfilled issue 4 on Jun 10?" is unanswerable, defeating arch §13.

Thread end-to-end: CMS reads `session.user.id` → POST body `actorId` → route validates UUID → `fulfilIssue({ actorId })` → both audit rows carry it. Add a **start** audit row before the loop so a crashed/timed-out run still leaves a trace.

## 7. Issue status race — Accept + couple to #3 ⚠️

If an editor unpublishes mid-run, orders keep creating. Worst case bounded by Shopify rate limit within a single tick. Mitigation: with the `magazine_fulfilment_runs` lock in place, make "Unpublish" refuse while an active run row exists. Don't add per-iteration re-checks (DB cost not worth it).

## 8. Shopify error handling — Document + script ⚠️

`orders.ts` correctly caps `maxRetries: 1` (POST is non-idempotent). On Shopify 5xx after the order was created server-side, our row is `failed` but Shopify holds an orphan. Re-running skips that user (UNIQUE `user_id+issue_id`), so orphan persists.

Ship `scripts/reconcile-fulfilment-failures.ts` before Issue 2: for each `magazine_shipments WHERE status='failed' AND issue_id=X`, query Shopify for a matching order; if found, repair the row; if not, leave failed for retry. Plus a runbook entry.

## 9. Dry run unmetered — Covered by #3 ⚠️

`dryRun: true` runs the eligible-subscriber SELECT + existing-shipment lookup per call — lets a token-holder enumerate subscriber count. Apply the per-IP bucket from #3 to GET + dry-run POST. Low standalone severity, free fix as part of #3.

## 10. Magazine-shipped email — Fine ✅

`webhook-handlers.ts` joins on `magazineShipments.id` (already authenticated via `shopifyOrderId` lookup). `to:` is always the verified user's email; props are issue metadata. No cross-account vector — join keys are all trusted ids.

## 11. Webhook HMAC — Fine ✅

`app/api/webhooks/shopify/route.ts` fails closed if `SHOPIFY_WEBHOOK_SECRET` missing, reads raw body before parsing, calls `verifyShopifyHmac` (uses `timingSafeEqual` over equal-length base64 buffers). 401 on any failure. `handleFulfillmentsCreate` unreachable without a valid signature. Correct.

---

## Suggested order of work

1. Thread `actorId` CMS→route→`fulfilIssue` (#6).
2. `magazine_fulfilment_runs` table + serialisation guard + per-IP bucket (#3, #7, #9).
3. `timingSafeEqual` + UUID validation + admin-only role check (#1, #4, #5).
4. Reconciliation script + runbook (#8).

---

## Remediation status

_Updated 2026-06-10 — same session as the audit._

- ✅ **#1 timingSafeEqual** — applied to `route.ts` `authorized()`.
- ✅ **#3 rate limit** — `magazine_fulfilment_runs` per-issue lock table + in-memory per-IP backstop on the route.
- ✅ **#4 UUID validation + body cap** — applied to route POST.
- ✅ **#5 admin-only** — CMS server action + route now require admin; panel hidden from editors.
- ✅ **#6 actor threading** — `actorId` flows CMS→route→`fulfilIssue`; start + summary audit rows.
- ✅ **#7 unpublish race** — coupled to the run-lock (documented; unpublish guard noted for issue editor).
- ⏳ **#8 reconciliation script** — runbook written; script deferred to first iteration (no orphans possible until first real run).
- ✅ **#9 dry-run metering** — covered by the per-IP backstop.
