-- Phase 1 data migration — Ralph World 2.0
-- Run AFTER `npm run db:push` has applied the schema additions.
--
-- Two transformations:
--   1) Rename article/lab access_tier values: free → everyone, paid → paid_subscribers
--   2) Backfill profiles.tier from existing subscriptionStatus
--
-- Idempotent — safe to re-run. Each UPDATE is a no-op if values are already migrated.

BEGIN;

-- ── (1) Article + lab item access_tier rename (arch doc §6) ──
-- Pre-2.0 values: 'free' (anyone could read) | 'paid' (subscribers only).
-- New vocabulary: 'everyone' | 'members' | 'paid_subscribers'.
-- Launch tactic per arch doc §4: all content starts as 'everyone' — the
-- old 'free' maps cleanly. 'paid' becomes 'paid_subscribers'.
-- ('members' is a new tier; no existing rows match.)

UPDATE articles  SET access_tier = 'everyone'         WHERE access_tier = 'free';
UPDATE articles  SET access_tier = 'paid_subscribers' WHERE access_tier = 'paid';
UPDATE lab_items SET access_tier = 'everyone'         WHERE access_tier = 'free';
UPDATE lab_items SET access_tier = 'paid_subscribers' WHERE access_tier = 'paid';

-- ── (2) profiles.tier backfill ──
-- Column default is 'guest', but EXISTING rows are signed-in users
-- (profiles row implies a user exists). They should be 'free' or 'paid',
-- not 'guest'. Derive from the legacy subscription_status column.
--
-- Rule: subscription_status='paid' → tier='paid'; everything else → 'free'.
-- (subscription_status NULL is possible on legacy rows; treat as 'free'
-- since the user is signed in.)

UPDATE profiles
SET tier = CASE
  WHEN subscription_status = 'paid' THEN 'paid'
  ELSE 'free'
END
WHERE tier IS NULL OR tier = 'guest';

-- ── Sanity checks (no-op SELECTs; throw if anything looks wrong) ──
DO $$
DECLARE
  legacy_free_articles   INTEGER;
  legacy_paid_articles   INTEGER;
  legacy_free_lab        INTEGER;
  legacy_paid_lab        INTEGER;
  guest_profiles         INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_free_articles FROM articles  WHERE access_tier = 'free';
  SELECT COUNT(*) INTO legacy_paid_articles FROM articles  WHERE access_tier = 'paid';
  SELECT COUNT(*) INTO legacy_free_lab      FROM lab_items WHERE access_tier = 'free';
  SELECT COUNT(*) INTO legacy_paid_lab      FROM lab_items WHERE access_tier = 'paid';
  SELECT COUNT(*) INTO guest_profiles       FROM profiles  WHERE tier = 'guest';

  IF legacy_free_articles > 0 OR legacy_paid_articles > 0
     OR legacy_free_lab > 0 OR legacy_paid_lab > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: legacy access_tier values remain';
  END IF;

  IF guest_profiles > 0 THEN
    RAISE NOTICE 'WARNING: % profiles still tier=guest (expected 0 — every profile row implies a signed-in user)', guest_profiles;
  END IF;
END $$;

COMMIT;
