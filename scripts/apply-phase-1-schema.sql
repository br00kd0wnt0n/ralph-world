-- ─────────────────────────────────────────────────────────────────────
-- Phase 1 schema delta — Ralph World 2.0 unified accounts
-- Arch doc §6 (data model) + SOW §1.1
-- ─────────────────────────────────────────────────────────────────────
--
-- Hand-crafted mirror of what `drizzle-kit push` would produce against
-- the Phase-1 schema in lib/db/schema.ts. Every statement is IF NOT
-- EXISTS / additive — re-running is safe, and the script will NOT drop
-- or rename anything that currently exists in production.
--
-- Apply order:
--   1. THIS file              — additive schema delta
--   2. migrate-phase-1-access-tier.sql — data backfill (free → everyone,
--                                paid → paid_subscribers; tier from
--                                subscription_status)
--   3. db-roles-phase-1.sql   — DB role separation grants
--
-- Apply via:
--   psql "$DATABASE_URL_SUPERUSER" -f scripts/apply-phase-1-schema.sql
--
-- This runs against the prod owner role (postgres). Schema changes are
-- additive, so existing reads/writes continue to work during the apply
-- window. No downtime expected.
-- ─────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

BEGIN;

-- ── 1. users: add password_hash for Credentials provider (Task 1.3) ──

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash text;

-- ── 2. profiles: 8 new columns (Phase 1 additions) ──────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'guest';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamp;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS shipping_address_cached jsonb;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in_at timestamp;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in_source text;

-- ── 3. access_tier defaults (articles + lab_items) ──────────────────
-- Existing rows stay on their current value until the data migration
-- runs. Only NEW inserts pick up 'everyone'.

ALTER TABLE articles
  ALTER COLUMN access_tier SET DEFAULT 'everyone';

ALTER TABLE lab_items
  ALTER COLUMN access_tier SET DEFAULT 'everyone';

-- ── 4. New tables (8 of them) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id         text NOT NULL,
  status          text NOT NULL,
  source          text,
  subscribed_at   timestamp DEFAULT now(),
  unsubscribed_at timestamp
);

CREATE TABLE IF NOT EXISTS consent_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  consent_type   text NOT NULL,
  granted        boolean NOT NULL,
  source         text,
  policy_version text,
  at             timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  before      jsonb,
  after       jsonb,
  source      text,
  at          timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS shopify_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shopify_customer_id text NOT NULL UNIQUE,
  link_method         text NOT NULL,
  linked_at           timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  stripe_event_id   text NOT NULL UNIQUE,
  event_type        text NOT NULL,
  payload           jsonb NOT NULL,
  processing_status text DEFAULT 'received',
  received_at       timestamp DEFAULT now() NOT NULL,
  processed_at      timestamp
);

CREATE TABLE IF NOT EXISTS email_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  resend_event_id text,
  email           text NOT NULL,
  event_type      text NOT NULL,
  idempotency_key text,
  payload         jsonb,
  at              timestamp DEFAULT now() NOT NULL
);

-- Partial unique index — only rows we INSERT (which carry the key) are
-- subject to the dedupe constraint. Resend webhook rows write null and
-- are not constrained.
CREATE UNIQUE INDEX IF NOT EXISTS email_events_idempotency_key_unique
  ON email_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS magazine_issues (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  issue_number          integer NOT NULL UNIQUE,
  title                 text,
  status                text DEFAULT 'draft' NOT NULL,
  published_at          timestamp,
  shopify_variant_id    text,
  postage_pence_cached  integer,
  created_at            timestamp DEFAULT now() NOT NULL,
  updated_at            timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS magazine_shipments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id          uuid NOT NULL REFERENCES magazine_issues(id) ON DELETE CASCADE,
  shopify_order_id  text,
  newsstand_ref     text,
  shipped_at        timestamp,
  status            text DEFAULT 'queued' NOT NULL,
  error             text,
  created_at        timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS magazine_shipments_user_issue_unique
  ON magazine_shipments (user_id, issue_id);

-- ── 5. Sanity assertions ────────────────────────────────────────────
-- Each new table / column has to exist for Task 1.2 grants to land
-- without error. Anything missing here → ROLLBACK.

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO missing FROM (
    SELECT unnest(ARRAY[
      'email_subscriptions','consent_log','audit_log','shopify_links',
      'stripe_events','email_events','magazine_issues','magazine_shipments'
    ]) AS t
    EXCEPT
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  ) AS s;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 1 schema delta: missing tables: %', missing;
  END IF;
  RAISE NOTICE 'OK — all 8 Phase 1 tables present';
END
$$;

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(c, ', ') INTO missing FROM (
    SELECT unnest(ARRAY[
      'tier','stripe_customer_id','stripe_subscription_id',
      'subscription_current_period_end','shipping_address_cached',
      'marketing_opt_in','marketing_opt_in_at','marketing_opt_in_source'
    ]) AS c
    EXCEPT
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
  ) AS s;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 1 schema delta: missing profiles columns: %', missing;
  END IF;
  RAISE NOTICE 'OK — all 8 profiles columns present';
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='password_hash'
  ) THEN
    RAISE EXCEPTION 'Phase 1 schema delta: users.password_hash missing';
  END IF;
  RAISE NOTICE 'OK — users.password_hash present';
END
$$;

COMMIT;
