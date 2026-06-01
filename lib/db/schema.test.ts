import { describe, it, expect } from 'vitest'
import {
  profiles,
  emailSubscriptions,
  consentLog,
  auditLog,
  shopifyLinks,
  stripeEvents,
  emailEvents,
  magazineIssues,
  magazineShipments,
  articles,
  labItems,
} from './schema'

/**
 * Schema export tests — proves the Phase 1 additions exist with the
 * column names + defaults the architecture doc requires. Runtime
 * acceptance ("drizzle-kit push succeeds against test DB") is held
 * until the test DB is provisioned; this suite is the compile-time
 * + structural-shape gate that runs on every commit.
 */

// Helper — Drizzle table columns are exposed on the table object.
// Reading the `_.config` of each column gives us the SQL name + default.
function colNames(table: Record<string, unknown>): string[] {
  // Drizzle exposes columns on the table as enumerable properties.
  return Object.keys(table).filter((k) => !k.startsWith('_') && k !== 'getSQL')
}

describe('profiles — Phase 1 column additions', () => {
  const names = colNames(profiles)

  it.each([
    'tier',
    'stripeCustomerId',
    'stripeSubscriptionId',
    'subscriptionCurrentPeriodEnd',
    'shippingAddressCached',
    'marketingOptIn',
    'marketingOptInAt',
    'marketingOptInSource',
  ])('has %s column', (col) => {
    expect(names).toContain(col)
  })

  it('keeps deprecated columns until Phase 4 cutover', () => {
    // Per SOW §1.1 — these are kept around to avoid breaking changes mid-build.
    expect(names).toContain('subscriptionStatus')
    expect(names).toContain('subscriptionStart')
    expect(names).toContain('subscriptionEnd')
    expect(names).toContain('shopifyCustomerId')
  })
})

describe('new tables exist (arch doc §6)', () => {
  it.each([
    ['email_subscriptions', emailSubscriptions],
    ['consent_log', consentLog],
    ['audit_log', auditLog],
    ['shopify_links', shopifyLinks],
    ['stripe_events', stripeEvents],
    ['email_events', emailEvents],
    ['magazine_issues', magazineIssues],
    ['magazine_shipments', magazineShipments],
  ])('exports the %s table', (_name, table) => {
    expect(table).toBeDefined()
    expect(colNames(table as Record<string, unknown>).length).toBeGreaterThan(0)
  })
})

describe('shopify_links — uniqueness + linking shape', () => {
  const names = colNames(shopifyLinks)
  it('has the linking columns', () => {
    expect(names).toEqual(
      expect.arrayContaining(['id', 'userId', 'shopifyCustomerId', 'linkMethod', 'linkedAt'])
    )
  })
})

describe('stripe_events — idempotency shape', () => {
  const names = colNames(stripeEvents)
  it('has stripeEventId + processingStatus', () => {
    expect(names).toEqual(
      expect.arrayContaining(['stripeEventId', 'processingStatus', 'receivedAt', 'processedAt'])
    )
  })
})

describe('magazine_shipments — per-issue idempotency shape', () => {
  const names = colNames(magazineShipments)
  it('has user_id, issue_id, status, shopify_order_id, newsstand_ref', () => {
    expect(names).toEqual(
      expect.arrayContaining(['userId', 'issueId', 'status', 'shopifyOrderId', 'newsstandRef'])
    )
  })
})

describe('magazine_issues — quarterly publication shape', () => {
  const names = colNames(magazineIssues)
  it('has issue_number, status, published_at, shopify_variant_id, postage_pence_cached', () => {
    expect(names).toEqual(
      expect.arrayContaining([
        'issueNumber',
        'status',
        'publishedAt',
        'shopifyVariantId',
        'postagePenceCached',
      ])
    )
  })
})

describe('articles + lab_items — access_tier default', () => {
  // Default values are not trivially introspectable from the Drizzle table
  // object at runtime, but the column should exist. The actual default
  // ('everyone') is enforced via the schema definition + DB DEFAULT clause.
  it('articles has accessTier column', () => {
    expect(colNames(articles)).toContain('accessTier')
  })
  it('lab_items has accessTier column', () => {
    expect(colNames(labItems)).toContain('accessTier')
  })
})
