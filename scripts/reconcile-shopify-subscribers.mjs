#!/usr/bin/env node
// Read-only reconciliation: which Shopify customers look like magazine
// subscribers but are NOT in our paid set (profiles.tier='paid')?
//
// Why: profiles.tier='paid' is only ever set by the Stripe webhook handlers
// (lib/stripe/webhook-handlers.ts). Subscribers from the previous site paid
// through Shopify and never touched Stripe, so Fulfil Issue N in the CMS
// cannot see them. Before the first real fulfilment run we need the list.
//
// Requires read_customers on the Admin token (the fulfilment token already
// has customers r/w). read_orders is optional: with it, the report includes
// each customer's last magazine order; without it, the script says so and
// falls back to orders_count / total_spent / tags from the customer record.
//
// Usage (from ralph-world):
//   SHOPIFY_STORE_DOMAIN=xxx.myshopify.com \
//   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... \
//   node scripts/reconcile-shopify-subscribers.mjs [--csv out.csv]
//
// DATABASE_URL is read from .env.local. Nothing is written anywhere except
// the optional CSV.

import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
import postgres from 'postgres'
import { writeFileSync } from 'node:fs'

loadEnv({ path: '.env.local' })

const domain = (process.env.SHOPIFY_STORE_DOMAIN || '')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
const version = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-01'
if (!domain || !token) {
  console.error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN.')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing (expected in .env.local).')
  process.exit(1)
}

const csvIdx = process.argv.indexOf('--csv')
const csvPath = csvIdx > -1 ? process.argv[csvIdx + 1] : null

// ── Shopify REST with Link-header pagination ─────────────────────────
async function* paginate(path, params) {
  let url = `https://${domain}/admin/api/${version}${path}?${new URLSearchParams({ limit: '250', ...params })}`
  while (url) {
    const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': token, Accept: 'application/json' } })
    if (res.status === 403 || res.status === 401) {
      const body = await res.text().catch(() => '')
      throw Object.assign(new Error(`Shopify ${res.status} on ${path}: ${body.slice(0, 200)}`), { scope: true })
    }
    if (!res.ok) throw new Error(`Shopify ${res.status} on ${path}`)
    const json = await res.json()
    const key = Object.keys(json)[0]
    yield* json[key]
    const link = res.headers.get('link') || ''
    const next = link.split(',').find((l) => l.includes('rel="next"'))
    url = next ? next.match(/<([^>]+)>/)?.[1] : null
  }
}

// ── 1. Shopify customers ─────────────────────────────────────────────
console.error('Fetching Shopify customers…')
const customers = []
for await (const c of paginate('/customers.json', {})) customers.push(c)
console.error(`  ${customers.length} customers`)

// ── 2. Shopify orders (optional) → last order per customer ───────────
const lastOrder = new Map() // customerId -> { at, name, items }
let ordersAvailable = true
try {
  console.error('Fetching Shopify orders (status=any)…')
  let n = 0
  for await (const o of paginate('/orders.json', { status: 'any', fields: 'id,name,created_at,customer,line_items,tags' })) {
    n++
    const cid = o.customer?.id
    if (!cid) continue
    const prev = lastOrder.get(cid)
    if (!prev || o.created_at > prev.at) {
      lastOrder.set(cid, {
        at: o.created_at,
        name: o.name,
        items: (o.line_items || []).map((li) => li.title).join(' | '),
        tags: o.tags,
      })
    }
  }
  console.error(`  ${n} orders`)
} catch (e) {
  if (e.scope) {
    ordersAvailable = false
    console.error('  read_orders not granted on this token; continuing without order detail.')
  } else throw e
}

// ── 3. Our DB: paid profiles + shopify links, keyed by email ─────────
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require' })
const dbRows = await sql`
  select lower(u.email) as email, p.tier, sl.shopify_customer_id
  from users u
  join profiles p on p.id = u.id
  left join shopify_links sl on sl.user_id = u.id
`
await sql.end()
const dbByEmail = new Map(dbRows.map((r) => [r.email, r]))
const dbByShopifyId = new Map(dbRows.filter((r) => r.shopify_customer_id).map((r) => [String(r.shopify_customer_id), r]))

// ── 4. Diff ──────────────────────────────────────────────────────────
const rows = customers.map((c) => {
  const email = (c.email || '').toLowerCase()
  const db = dbByEmail.get(email) || dbByShopifyId.get(String(c.id))
  const lo = lastOrder.get(c.id)
  return {
    shopify_id: c.id,
    email,
    name: [c.first_name, c.last_name].filter(Boolean).join(' '),
    tags: c.tags || '',
    orders: c.orders_count ?? 0,
    spent: c.total_spent ?? '',
    last_order: lo ? lo.at.slice(0, 10) : '',
    last_items: lo ? lo.items : '',
    in_db: db ? 'yes' : 'NO',
    db_tier: db?.tier ?? '',
    linked: db?.shopify_customer_id ? 'yes' : '',
  }
})

// Candidates: bought something, not paid in our DB.
const candidates = rows
  .filter((r) => r.orders > 0 && r.db_tier !== 'paid')
  .sort((a, b) => (b.last_order || '').localeCompare(a.last_order || ''))

console.log(`\nShopify customers: ${rows.length}`)
console.log(`Our paid profiles:  ${dbRows.filter((r) => r.tier === 'paid').length}`)
console.log(`Bought in Shopify but NOT paid in our DB: ${candidates.length}${ordersAvailable ? '' : '  (no order detail: read_orders missing)'}\n`)
console.table(candidates.map(({ shopify_id, email, name, tags, orders, spent, last_order, last_items, in_db, db_tier }) => ({ email, name, tags, orders, spent, last_order, last_items: last_items.slice(0, 40), in_db, db_tier })))

const paidNotLinked = dbRows.filter((r) => r.tier === 'paid' && !r.shopify_customer_id)
if (paidNotLinked.length) {
  console.log('\nPaid in our DB but NO shopify_links row (fulfilment will skip these):')
  console.table(paidNotLinked.map((r) => ({ email: r.email })))
}

if (csvPath) {
  const header = Object.keys(rows[0] || {}).join(',')
  const body = rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  writeFileSync(csvPath, `${header}\n${body}\n`)
  console.log(`\nFull customer list written to ${csvPath}`)
}
