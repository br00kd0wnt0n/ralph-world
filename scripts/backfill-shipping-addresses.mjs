#!/usr/bin/env node
// One-off: replay shipping addresses from stored Stripe checkout events into
// profiles.shipping_address_cached and the linked Shopify customer's default
// address.
//
// Why: until 2026-09-16 handleCheckoutSessionCompleted read
// session.shipping_details, but Stripe delivers the address under
// session.collected_information.shipping_details. So no Stripe-collected
// address ever reached profiles or Shopify. The payloads are all in
// stripe_events, so this replays them. Safe to re-run: it only touches paid
// profiles that still have no cached address (or all paid with --all).
//
// Usage (from ralph-world):
//   node scripts/backfill-shipping-addresses.mjs            # dry run, prints plan
//   node scripts/backfill-shipping-addresses.mjs --apply    # write DB + Shopify
//   node scripts/backfill-shipping-addresses.mjs --all      # include paid users that already have one
//
// Needs DATABASE_URL (.env.local) and, for --apply, SHOPIFY_STORE_DOMAIN +
// SHOPIFY_ADMIN_ACCESS_TOKEN (customers write scope).

import { config as loadEnv } from 'dotenv'
import postgres from 'postgres'

loadEnv({ path: '.env.local' })

const APPLY = process.argv.includes('--apply')
const ALL = process.argv.includes('--all')
// --skip a@b.com,c@d.com : leave these users untouched (e.g. a test account
// whose Stripe address is not shippable).
const skipIdx = process.argv.indexOf('--skip')
const SKIP = new Set(skipIdx > -1 ? process.argv[skipIdx + 1].split(',').map((e) => e.trim().toLowerCase()) : [])
const domain = (process.env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
const version = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-01'

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1) }
if (APPLY && (!domain || !token)) { console.error('--apply needs SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN'); process.exit(1) }

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require', connect_timeout: 30 })

// Paid users, their Shopify link, and whether an address is already cached.
const users = await sql`
  select u.id, u.email, p.shipping_address_cached as cached, sl.shopify_customer_id
  from profiles p
  join users u on u.id = p.id
  left join shopify_links sl on sl.user_id = p.id
  where p.tier = 'paid' ${ALL ? sql`` : sql`and p.shipping_address_cached is null`}
  order by u.email
`

const plan = []
for (const u of users) {
  // Latest checkout.session.completed for this user: by metadata.user_id
  // first, then by customer_email as a fallback for older sessions.
  const [ev] = await sql`
    select stripe_event_id, received_at,
      payload->'data'->'object'->'collected_information'->'shipping_details' as collected,
      payload->'data'->'object'->'shipping_details' as legacy,
      payload->'data'->'object'->'customer_details'->'address' as billing
    from stripe_events
    where event_type = 'checkout.session.completed'
      and (payload->'data'->'object'->'metadata'->>'user_id' = ${u.id}
           or lower(payload->'data'->'object'->>'customer_email') = ${u.email.toLowerCase()})
    order by received_at desc limit 1
  `
  const src = ev?.collected?.address ? { where: 'collected_information', name: ev.collected.name, address: ev.collected.address }
    : ev?.legacy?.address ? { where: 'shipping_details', name: ev.legacy.name, address: ev.legacy.address }
    : ev?.billing ? { where: 'customer_details', name: null, address: ev.billing }
    : null
  const a = src?.address
  const complete = a && a.line1 && a.city && a.postal_code && a.country
  plan.push({
    email: u.email,
    shopify: u.shopify_customer_id || 'NO LINK',
    event: ev?.stripe_event_id || 'NONE',
    from: src?.where || '-',
    name: src?.name || '',
    address: complete ? `${a.line1}, ${a.city}, ${a.postal_code}, ${a.country}` : a ? 'INCOMPLETE' : '',
    action: SKIP.has(u.email.toLowerCase()) ? 'skip: --skip' : !ev ? 'skip: no checkout event' : !complete ? 'skip: address incomplete' : 'write',
    _u: u, _src: src,
  })
}

console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (add --apply to write) ===')
console.table(plan.map(({ _u, _src, ...p }) => p))

if (!APPLY) { await sql.end(); process.exit(0) }

function splitName(name) {
  const t = (name || '').trim(); if (!t) return { first_name: '', last_name: '' }
  const i = t.indexOf(' '); return i === -1 ? { first_name: t, last_name: '' } : { first_name: t.slice(0, i), last_name: t.slice(i + 1) }
}

for (const p of plan) {
  if (p.action !== 'write') continue
  const { _u: u, _src: src } = p
  const a = src.address
  // 1. profiles — same shape the webhook handler stores (Stripe's, as-is).
  await sql`update profiles set shipping_address_cached = ${sql.json(a)}, updated_at = now() where id = ${u.id}`
  console.log(`profiles updated: ${u.email}`)
  // 2. Shopify default address — same body as lib/shopify/customer.ts updateCustomerAddress.
  if (!u.shopify_customer_id) { console.log(`  no shopify_links row for ${u.email}; Shopify skipped`); continue }
  // Shopify rejects `default: true` on address create ("Unexpected keys
  // given: default"). Create, then PUT .../addresses/{id}/default.json.
  const H = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json', Accept: 'application/json' }
  const base = `https://${domain}/admin/api/${version}/customers/${u.shopify_customer_id}/addresses`
  const body = { address: {
    ...splitName(src.name),
    address1: a.line1, address2: a.line2 ?? '', city: a.city, province: a.state ?? '',
    zip: a.postal_code, country_code: a.country, phone: '', company: '',
  } }
  const r = await fetch(`${base}.json`, { method: 'POST', headers: H, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  const addrId = j.customer_address?.id
  if (!addrId) { console.log(`  shopify create ${r.status}: ${JSON.stringify(j).slice(0, 200)}`); continue }
  const d = await fetch(`${base}/${addrId}/default.json`, { method: 'PUT', headers: H })
  console.log(`  shopify: address ${addrId} created, set default → ${d.status}`)
}

await sql.end()
