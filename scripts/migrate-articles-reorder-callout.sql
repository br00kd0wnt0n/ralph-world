-- 2026-06-18 — additive columns on `articles`:
--   sort_order        — manual drag-to-reorder (NULL = falls back to publishedAt DESC)
--   shop_callout_url  — "AS SEEN IN RALPH" badge link
--   shop_callout_label — optional label override (default copy in code)
--
-- Apply as ralph_cms (after `GRANT CREATE ON SCHEMA public TO ralph_cms`)
-- or as the Postgres superuser. Idempotent — re-running is safe.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS sort_order        integer;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS shop_callout_url  text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS shop_callout_label text;

-- ralph_world is the runtime role. The Phase 1 role grants give it full
-- r/w on `articles`, BUT column-level UPDATE grants don't auto-cover
-- columns added later — re-grant explicitly so the CMS write path
-- (which uses ralph_cms) AND any future runtime writes work.
GRANT SELECT, INSERT, UPDATE, DELETE ON articles TO ralph_world;

-- Verify
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(c, ', ') INTO missing
  FROM (VALUES ('sort_order'), ('shop_callout_url'), ('shop_callout_label')) AS v(c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='articles' AND column_name=v.c
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'columns missing after apply: %', missing;
  END IF;
  RAISE NOTICE 'OK — sort_order, shop_callout_url, shop_callout_label present on articles';
END $$;
