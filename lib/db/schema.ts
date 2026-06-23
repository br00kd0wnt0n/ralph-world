import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Auth.js required tables ──

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  // Credentials provider (Task 1.3). Null for OAuth-only users.
  // bcrypt hash — never returned by selects that flow to the client.
  passwordHash: text('password_hash'),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ]
)

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
)

// ── App tables ──

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  // ── Phase 1 additions per arch doc §6 ──
  tier: text('tier').default('guest'), // 'guest' | 'free' | 'paid' — cached, backfilled from subscriptionStatus
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', { mode: 'date' }),
  subscriptionCancelAtPeriodEnd: boolean('subscription_cancel_at_period_end').default(false),
  shippingAddressCached: jsonb('shipping_address_cached'),
  marketingOptIn: boolean('marketing_opt_in').default(false),
  marketingOptInAt: timestamp('marketing_opt_in_at', { mode: 'date' }),
  marketingOptInSource: text('marketing_opt_in_source'),
  // ── Deprecated, kept until Phase 4 cutover (per SOW §1.1) ──
  subscriptionStatus: text('subscription_status'), // null | 'free' | 'paid' — deprecated; superseded by tier
  subscriptionStart: timestamp('subscription_start', { mode: 'date' }), // deprecated
  subscriptionEnd: timestamp('subscription_end', { mode: 'date' }), // deprecated
  shopifyCustomerId: text('shopify_customer_id'), // deprecated; superseded by shopify_links table
  // ── Unchanged ──
  role: text('role').default('user'), // 'user' | 'admin' | 'editor'
  themePreference: text('theme_preference').default('cosy-dynamics'),
  languagePreference: text('language_preference').default('en'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})

export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  status: text('status').default('draft'), // draft | review | published | archived
  title: text('title'),
  subtitle: text('subtitle'),
  bylineAuthor: text('byline_author'),
  bylinePhotographer: text('byline_photographer'),
  intro: text('intro'),
  backgroundCanvasColour: text('background_canvas_colour'),
  backgroundFrameType: text('background_frame_type'),
  backgroundFrameValue: text('background_frame_value'),
  leadMediaUrl: text('lead_media_url'),
  leadMediaType: text('lead_media_type'),
  // Dedicated square thumbnail for the magazine grid card; falls back to
  // leadMediaUrl when empty (lead images often have text that crops badly).
  cardImageUrl: text('card_image_url'),
  titleImageUrl: text('title_image_url'),
  articleType: text('article_type'), // Editorial | Pictorial | List
  contentTags: text('content_tags').array(),
  isCoverStory: boolean('is_cover_story').default(false),
  issueNumber: integer('issue_number'),
  // Per arch doc §4: 'everyone' | 'members' | 'paid_subscribers'.
  // Existing rows migrated free→everyone, paid→paid_subscribers (see scripts/migrate-phase-1-access-tier.sql).
  accessTier: text('access_tier').default('everyone'),
  contentBlocks: jsonb('content_blocks'), // ContentBlock[]
  // Manual sort order for the magazine grid + category-filtered views.
  // NULL = no explicit position; falls back to publishedAt DESC. Articles
  // with explicit sort_order come BEFORE unordered ones. Set via
  // drag-to-reorder in the CMS articles list.
  sortOrder: integer('sort_order'),
  // Optional "AS SEEN IN RALPH" shop callout — when URL is set, the
  // frontend renders a starburst badge near the lead image linking to
  // the shop product (or any URL). Label overrides the default text.
  shopCalloutUrl: text('shop_callout_url'),
  shopCalloutLabel: text('shop_callout_label'),
  shopCalloutEyebrow: text('shop_callout_eyebrow'),
  shopCalloutCta: text('shop_callout_cta'),
  publishedAt: timestamp('published_at', { mode: 'date' }),
})

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  status: text('status').default('draft'),
  isPast: boolean('is_past').default(false),
  title: text('title'),
  descriptionShort: text('description_short'),
  eventDate: timestamp('event_date', { mode: 'date' }),
  locationName: text('location_name'),
  locationAddress: text('location_address'),
  locationPostcode: text('location_postcode'),
  countryCode: text('country_code'),
  accentColour: text('accent_colour'),
  thumbnailUrl: text('thumbnail_url'),
  badge: text('badge'),
  creatureX: numeric('creature_x'),
  creatureY: numeric('creature_y'),
  verdict: text('verdict'),
  rsvpEnabled: boolean('rsvp_enabled').default(false),
  rsvpCapacity: integer('rsvp_capacity'),
  externalTicketUrl: text('external_ticket_url'),
})

export const eventRsvps = pgTable(
  'event_rsvps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [uniqueIndex('event_rsvps_unique').on(table.eventId, table.userId)]
)

export const tvVod = pgTable('tv_vod', {
  id: uuid('id').defaultRandom().primaryKey(),
  broadcasterId: text('broadcaster_id').unique(),
  titleOverride: text('title_override'),
  description: text('description'),
  thumbnailUrlOverride: text('thumbnail_url_override'),
  accessTier: text('access_tier').default('free'),
  isFeatured: boolean('is_featured').default(false),
  sortOrder: integer('sort_order'),
  isPublished: boolean('is_published').default(false),
})

export const labItems = pgTable('lab_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  status: text('status').default('draft'),
  title: text('title'),
  description: text('description'),
  externalUrl: text('external_url'),
  thumbnailUrl: text('thumbnail_url'),
  badge: text('badge'),
  // Per arch doc §4: 'everyone' | 'members' | 'paid_subscribers'.
  accessTier: text('access_tier').default('everyone'),
  sortOrder: integer('sort_order'),
  publishedAt: timestamp('published_at', { mode: 'date' }),
})

export const caseStudies = pgTable('case_studies', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  status: text('status').default('draft'),
  title: text('title'),
  subtitle: text('subtitle'),
  thumbnailUrl: text('thumbnail_url'),
  externalUrlOverride: text('external_url_override'),
  sortOrder: integer('sort_order').default(0),
  publishedAt: timestamp('published_at', { mode: 'date' }),
})

export const homepageConfig = pgTable('homepage_config', {
  key: text('key').primaryKey(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})

export const webhookLog = pgTable('webhook_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: text('source').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload'),
  processedAt: timestamp('processed_at', { mode: 'date' }).defaultNow(),
})

// ──────────────────────────────────────────────────────────────────────────
// Phase 1 additions — Ralph World 2.0 unified user accounts (arch doc §6)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Mailchimp list memberships. One row per (user, list) subscription state.
 * Status mirrors Mailchimp's lifecycle so we can reconcile via webhook.
 */
export const emailSubscriptions = pgTable('email_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  listId: text('list_id').notNull(), // Mailchimp list id
  status: text('status').notNull(), // 'subscribed' | 'unsubscribed' | 'cleaned'
  source: text('source'), // 'signup' | 'portal' | 'import' | 'substack_migration'
  subscribedAt: timestamp('subscribed_at', { mode: 'date' }).defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at', { mode: 'date' }),
})

/**
 * GDPR consent audit. Append-only — DB grants for ralph_world deny UPDATE
 * once Task 1.2 lands. user_id is nullable so it can be set to null on
 * account erasure while the legal record survives (arch doc §14).
 */
export const consentLog = pgTable('consent_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  consentType: text('consent_type').notNull(), // 'marketing' | 'terms' | 'privacy'
  granted: boolean('granted').notNull(),
  source: text('source'), // 'signup_form' | 'portal' | 'api' | 'substack_migration'
  policyVersion: text('policy_version'),
  at: timestamp('at', { mode: 'date' }).defaultNow().notNull(),
})

/**
 * Generic audit log for sensitive mutations (arch doc §13). Append-only,
 * enforced via DB grants in Task 1.2. actor_id nullable for system actions
 * and post-erasure retention.
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // e.g. 'role_changed', 'sub_status_changed', 'email_changed', 'account_deleted'
  targetType: text('target_type'),
  targetId: text('target_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  source: text('source'), // 'system' | 'cms' | 'portal' | 'webhook'
  at: timestamp('at', { mode: 'date' }).defaultNow().notNull(),
})

/**
 * Links a Ralph.world user to their Shopify customer record. Created
 * proactively for every signup (Task 1.6). Unique on shopify_customer_id
 * so the same Shopify customer can't be claimed twice.
 */
export const shopifyLinks = pgTable('shopify_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  shopifyCustomerId: text('shopify_customer_id').notNull().unique(),
  linkMethod: text('link_method').notNull(), // 'auto_signup_create' | 'auto_email_match_at_signup' | 'auto_checkout' | 'manual_verification' | 'admin' | 'subscriber_import'
  linkedAt: timestamp('linked_at', { mode: 'date' }).defaultNow().notNull(),
})

/**
 * Idempotent webhook intake for Stripe (Task 2.3). Unique on
 * stripe_event_id so replays don't re-process. processing_status
 * tracks 'received' → 'processed' / 'failed'.
 */
export const stripeEvents = pgTable('stripe_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processingStatus: text('processing_status').default('received'), // 'received' | 'processed' | 'failed'
  receivedAt: timestamp('received_at', { mode: 'date' }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { mode: 'date' }),
})

/**
 * Delivery / engagement events from Resend (Task 1.4). Records both our
 * own send attempts AND the delivery events Resend pushes back at us.
 *
 * `idempotency_key` is set on rows we INSERT before calling Resend — the
 * shape is `${userId}:${templateId}:${contextHash}`. UNIQUE so a duplicate
 * send attempt with the same key is a no-op (insert fails, send skipped).
 * Rows pushed by the Resend webhook have null idempotency_key (Resend
 * doesn't know our key).
 */
export const emailEvents = pgTable(
  'email_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resendEventId: text('resend_event_id'),
    email: text('email').notNull(),
    // 'send_attempted' (we initiated) | 'sent' (Resend accepted) |
    // 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked'
    eventType: text('event_type').notNull(),
    idempotencyKey: text('idempotency_key'),
    payload: jsonb('payload'),
    at: timestamp('at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('email_events_idempotency_key_unique')
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
  ]
)

/**
 * Magazine issues — editorial owns the lifecycle in ralph-cms (Phase 3
 * task 3.9). status flips draft → published; "current issue" =
 * MAX(issue_number) WHERE status='published'. shopify_variant_id maps an
 * issue to its Shopify product variant SKU (EAN). postage_pence_cached
 * holds the negotiated postage rate (per Open dependencies — Newsstand
 * postage default = static rate per issue).
 */
export const magazineIssues = pgTable('magazine_issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueNumber: integer('issue_number').notNull().unique(),
  title: text('title'),
  status: text('status').default('draft').notNull(), // 'draft' | 'published'
  publishedAt: timestamp('published_at', { mode: 'date' }),
  shopifyVariantId: text('shopify_variant_id'),
  postagePenceCached: integer('postage_pence_cached'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
})

/**
 * Per-subscriber-per-issue shipment ledger (Phase 3 task 3.9). UNIQUE
 * (user_id, issue_id) prevents duplicate orders on retry — the idempotency
 * lever for the synthetic-Shopify-order flow. newsstand_ref is reserved
 * for the future direct Newsstand API path (v2).
 */
export const magazineShipments = pgTable(
  'magazine_shipments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => magazineIssues.id, { onDelete: 'cascade' }),
    shopifyOrderId: text('shopify_order_id'),
    newsstandRef: text('newsstand_ref'), // reserved for v2 direct Newsstand API
    shippedAt: timestamp('shipped_at', { mode: 'date' }),
    status: text('status').default('queued').notNull(), // 'queued' | 'shopify_order_created' | 'fulfilled' | 'failed'
    error: text('error'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('magazine_shipments_user_issue_unique').on(table.userId, table.issueId),
  ]
)

/**
 * Per-issue fulfilment run lock (security hardening — audit item #3/#7).
 * One row per issue id (PK). A run inserts/claims the row before doing any
 * Shopify work; a second concurrent or rapid-repeat request for the same
 * issue is refused while the lock is fresh (< 5 min). This is the primary
 * defence against a leaked INTERNAL_API_TOKEN being used to spam real
 * Shopify orders, AND it makes the issue editor's "Unpublish" able to
 * refuse while a run is active. actor_id records who started the active
 * run. finished_at is set when the run completes (lock released early).
 */
export const magazineFulfilmentRuns = pgTable('magazine_fulfilment_runs', {
  issueId: uuid('issue_id')
    .primaryKey()
    .references(() => magazineIssues.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { mode: 'date' }).notNull(),
  finishedAt: timestamp('finished_at', { mode: 'date' }),
  actorId: uuid('actor_id'),
})
