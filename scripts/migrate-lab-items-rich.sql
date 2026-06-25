-- 2026-06-19 — bring lab_items up to article-grade rich content.
--
-- New columns:
--   subtitle       — sub-heading sitting above the headline on the tile
--   posted_by      — author nod ("Posted by Brook")
--   tags           — JSONB array of { label, color } (max 5, enforced in app)
--   content_blocks — JSONB ContentBlock[] (same shape as articles)
--
-- Existing `description` column repurposed as the rich-text intro
-- (Tiptap HTML); `badge` column kept for legacy rows but no longer surfaced
-- in the editor — tags supersede it.
--
-- Idempotent — re-running is safe.

ALTER TABLE lab_items ADD COLUMN IF NOT EXISTS subtitle       text;
ALTER TABLE lab_items ADD COLUMN IF NOT EXISTS posted_by      text;
ALTER TABLE lab_items ADD COLUMN IF NOT EXISTS tags           jsonb;
ALTER TABLE lab_items ADD COLUMN IF NOT EXISTS content_blocks jsonb;

-- Re-grant after adding columns. ralph_world had table-level grants
-- already but new columns aren't automatically covered for UPDATE.
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_items TO ralph_world;

DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(c, ', ') INTO missing
  FROM (VALUES ('subtitle'), ('posted_by'), ('tags'), ('content_blocks')) AS v(c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='lab_items' AND column_name=v.c
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'columns missing after apply: %', missing;
  END IF;
  RAISE NOTICE 'OK — subtitle, posted_by, tags, content_blocks present on lab_items';
END $$;
