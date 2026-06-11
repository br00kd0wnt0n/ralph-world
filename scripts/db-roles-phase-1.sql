-- ─────────────────────────────────────────────────────────────────────
-- Task 1.2 — DB role separation (Phase 1, SOW)
-- Arch doc §13 "Security model — DB roles"
-- ─────────────────────────────────────────────────────────────────────
--
-- Two roles share one Postgres:
--   ralph_cms     — full r/w; owns schema migrations.
--   ralph_world   — runtime role used by the consumer site. Limited:
--                   no UPDATE on profiles.role (would let a compromised
--                   ralph.world process self-promote to admin), and
--                   INSERT-only on append-only tables (audit_log,
--                   consent_log, email_events, stripe_events) so
--                   tamper-evidence holds even under app-side compromise.
--
-- Idempotent — re-running this script is safe. Uses DO blocks for
-- role creation; the GRANTs are naturally idempotent in Postgres.
--
-- Apply via:
--   psql "$DATABASE_URL_SUPERUSER" -v ralph_cms_password="'…'" \
--        -v ralph_world_password="'…'" -f scripts/db-roles-phase-1.sql
--
-- See docs/db-role-separation.md for the full runbook.
-- ─────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

-- ── 1. Create roles if missing ────────────────────────────────────────
-- psql does not substitute :'var' inside dollar-quoted blocks, so
-- password assignment lives outside the DO blocks. Re-running this
-- script will also rotate the passwords, which is the intended
-- behaviour for a secret-rotation workflow.

DO $$
BEGIN
  CREATE ROLE ralph_cms WITH LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE ROLE ralph_world WITH LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

ALTER ROLE ralph_cms   WITH PASSWORD :'ralph_cms_password';
ALTER ROLE ralph_world WITH PASSWORD :'ralph_world_password';

-- ── 2. Schema usage ───────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO ralph_cms, ralph_world;

-- ralph_cms owns schema migrations, so it needs CREATE on the schema —
-- not just USAGE. Without this it can operate on existing tables (via the
-- GRANT ALL below) but cannot CREATE new ones, so `db:push` / migration
-- DDL fails with "permission denied for schema public" and all DDL falls
-- back to the superuser. (Fixed 2026-06-10 — originally only USAGE was
-- granted, which silently blocked ralph_cms from creating tables.)
GRANT CREATE ON SCHEMA public TO ralph_cms;

-- ── 3. ralph_cms — full r/w everywhere ────────────────────────────────

GRANT ALL ON ALL TABLES IN SCHEMA public TO ralph_cms;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ralph_cms;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO ralph_cms;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO ralph_cms;

-- ── 4. ralph_world — full r/w on operational tables ───────────────────
-- These the consumer app legitimately mutates: identity, sessions,
-- transient state, link tables, webhook-event ledgers (the consumer
-- writes 'send_attempted'/'sent' rows; INSERT-only would block that).
-- (stripe_events stays INSERT-only — see step 6.)

GRANT SELECT, INSERT, UPDATE, DELETE ON
  users,
  accounts,
  sessions,
  verification_tokens,
  event_rsvps,
  email_subscriptions,
  shopify_links,
  email_events,
  magazine_shipments
TO ralph_world;

-- ── 5. ralph_world — read-only on CMS-owned content ───────────────────

GRANT SELECT ON
  articles,
  events,
  lab_items,
  tv_vod,
  case_studies,
  homepage_config,
  magazine_issues
TO ralph_world;

-- ── 6. ralph_world — append-only on audit + consent + webhook ─────────
-- The arch doc says these must survive even app-side compromise:
-- INSERT only, no UPDATE, no DELETE. SELECT stays on so the consumer
-- app can read its own history (e.g. "did we already log this consent?").

GRANT SELECT, INSERT ON
  audit_log,
  consent_log,
  webhook_log
TO ralph_world;

-- stripe_events needs UPDATE so the webhook handler can flip
-- processing_status from 'received' → 'processed'/'failed'.
-- Append-only is not sufficient here (idempotency INSERT + status UPDATE
-- are both required for correct operation).
GRANT SELECT, INSERT, UPDATE ON
  stripe_events
TO ralph_world;

-- ── 7. ralph_world — profiles with column-level UPDATE ───────────────
-- The critical column-level restriction: NO update on `role`. A
-- compromised ralph.world process can't self-promote to admin. The
-- CMS migrates `role` via its own ralph_cms grants.

GRANT SELECT, INSERT ON profiles TO ralph_world;
GRANT UPDATE (
  display_name,
  tier,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  subscription_current_period_end,
  subscription_cancel_at_period_end,
  shipping_address_cached,
  shopify_customer_id,
  marketing_opt_in,
  marketing_opt_in_at,
  marketing_opt_in_source,
  theme_preference,
  language_preference,
  updated_at
) ON profiles TO ralph_world;
-- Explicitly: NO grant on `role` column. Trying to UPDATE it from the
-- ralph_world session will fail with insufficient_privilege.

-- ── 8. Sequences ──────────────────────────────────────────────────────
-- ralph_world inserts into tables with serial / uuid_generate columns;
-- it needs USAGE on the underlying sequences. Default-privileges line
-- keeps future tables consistent without re-running this script.

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ralph_world;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ralph_world;

-- ── 9. Future tables ──────────────────────────────────────────────────
-- Default privileges so tables created later by ralph_cms automatically
-- get sensible ralph_world grants. Anything append-only created later
-- still needs a manual REVOKE UPDATE/DELETE step.

ALTER DEFAULT PRIVILEGES FOR ROLE ralph_cms IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ralph_world;

-- ── 10. Sanity assertions ────────────────────────────────────────────
-- These RAISE NOTICE on success and ROLLBACK on failure so a botched
-- apply leaves the DB in its previous state.

DO $$
DECLARE
  has_role_update boolean;
BEGIN
  -- ralph_world must NOT have UPDATE on profiles.role.
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.column_privileges
    WHERE grantee = 'ralph_world'
      AND table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
      AND privilege_type = 'UPDATE'
  ) INTO has_role_update;
  IF has_role_update THEN
    RAISE EXCEPTION 'ralph_world has UPDATE on profiles.role — grants are not restrictive enough';
  END IF;
  RAISE NOTICE 'OK — ralph_world cannot UPDATE profiles.role';
END
$$;

DO $$
DECLARE
  bad_priv text;
BEGIN
  -- ralph_world must NOT have UPDATE or DELETE on the truly append-only
  -- tables. stripe_events is deliberately EXCLUDED here — step 6 grants it
  -- UPDATE (status flips), so listing it would make this assertion abort a
  -- fresh apply (the contradiction the security sweep flagged).
  SELECT string_agg(table_name || '.' || privilege_type, ', ')
    INTO bad_priv
    FROM information_schema.table_privileges
   WHERE grantee = 'ralph_world'
     AND table_schema = 'public'
     AND table_name IN ('audit_log', 'consent_log', 'webhook_log')
     AND privilege_type IN ('UPDATE', 'DELETE');
  IF bad_priv IS NOT NULL THEN
    RAISE EXCEPTION 'ralph_world has UPDATE/DELETE on append-only tables: %', bad_priv;
  END IF;
  RAISE NOTICE 'OK — audit_log / consent_log / webhook_log are append-only for ralph_world';
END
$$;
