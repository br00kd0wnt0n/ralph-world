-- 2026-06-19 — additive columns on `articles` for fully-editable shop callout:
--   shop_callout_eyebrow — small text at top of starburst (default: "AS SEEN IN RALPH")
--   shop_callout_cta     — bottom CTA text (default: "SHOP NOW →")
--
-- Idempotent — re-running is safe.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS shop_callout_eyebrow text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS shop_callout_cta     text;

GRANT SELECT, INSERT, UPDATE, DELETE ON articles TO ralph_world;

DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(c, ', ') INTO missing
  FROM (VALUES ('shop_callout_eyebrow'), ('shop_callout_cta')) AS v(c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='articles' AND column_name=v.c
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'columns missing after apply: %', missing;
  END IF;
  RAISE NOTICE 'OK — shop_callout_eyebrow, shop_callout_cta present on articles';
END $$;
