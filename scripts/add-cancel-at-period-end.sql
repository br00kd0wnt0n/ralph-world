-- Migration: add subscription_cancel_at_period_end to profiles
-- Run once against the Railway Postgres instance.
-- Safe to re-run: IF NOT EXISTS guard on the column addition.

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false;

-- Grant UPDATE on the new column to ralph_world (column-level grants don't
-- apply automatically to new columns added after the initial GRANT).
GRANT UPDATE (subscription_cancel_at_period_end) ON profiles TO ralph_world;

DO $$
BEGIN
  RAISE NOTICE 'subscription_cancel_at_period_end column: OK';
END $$;

COMMIT;
