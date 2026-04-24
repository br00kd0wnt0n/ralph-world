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

// ── Auth.js required tables ──

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
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
  subscriptionStatus: text('subscription_status'), // null | 'free' | 'paid'
  subscriptionStart: timestamp('subscription_start', { mode: 'date' }),
  subscriptionEnd: timestamp('subscription_end', { mode: 'date' }),
  shopifyCustomerId: text('shopify_customer_id'),
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
  titleImageUrl: text('title_image_url'),
  articleType: text('article_type'), // Editorial | Pictorial | List
  contentTags: text('content_tags').array(),
  isCoverStory: boolean('is_cover_story').default(false),
  issueNumber: integer('issue_number'),
  accessTier: text('access_tier').default('free'),
  contentBlocks: jsonb('content_blocks'), // ContentBlock[]
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
  accessTier: text('access_tier').default('free'),
  sortOrder: integer('sort_order'),
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
