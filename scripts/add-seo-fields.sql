-- 2026-11-12: optional "Search & sharing" overrides on articles, events and
-- case studies. Edited in the CMS editors; the public site falls back to its
-- existing logic when a column is NULL or blank:
--   seo_title       — page <title> / og:title (the site adds " | Ralph")
--   seo_description — meta description / og:description
--   seo_image_url   — og:image (share card)
--
-- Additive only, no new tables. ralph_world and ralph_cms already hold
-- table-level grants on all three tables, which cover new columns. The
-- check at the bottom confirms that rather than assuming it.
--
-- Idempotent: safe to re-run.
--   psql "$DATABASE_URL" -f scripts/add-seo-fields.sql

BEGIN;

ALTER TABLE articles     ADD COLUMN IF NOT EXISTS seo_title       text;
ALTER TABLE articles     ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE articles     ADD COLUMN IF NOT EXISTS seo_image_url   text;

ALTER TABLE events       ADD COLUMN IF NOT EXISTS seo_title       text;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS seo_image_url   text;

ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS seo_title       text;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS seo_image_url   text;

DO $$
DECLARE
  missing text;
  tbl text;
  col text;
BEGIN
  SELECT string_agg(v.t || '.' || v.c, ', ') INTO missing
  FROM (
    SELECT t, c
    FROM unnest(ARRAY['articles', 'events', 'case_studies']) AS t,
         unnest(ARRAY['seo_title', 'seo_description', 'seo_image_url']) AS c
  ) AS v
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = v.t AND column_name = v.c
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'columns missing after apply: %', missing;
  END IF;

  -- The site reads these columns as ralph_world; the CMS writes them as
  -- ralph_cms. Fail loudly if either role can't, instead of finding out
  -- from a production 500.
  FOREACH tbl IN ARRAY ARRAY['articles', 'events', 'case_studies'] LOOP
    FOREACH col IN ARRAY ARRAY['seo_title', 'seo_description', 'seo_image_url'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ralph_world')
         AND NOT has_column_privilege('ralph_world', 'public.' || tbl, col, 'SELECT') THEN
        RAISE EXCEPTION 'ralph_world cannot SELECT %.%', tbl, col;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ralph_cms')
         AND NOT has_column_privilege('ralph_cms', 'public.' || tbl, col, 'UPDATE') THEN
        RAISE EXCEPTION 'ralph_cms cannot UPDATE %.%', tbl, col;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'OK: seo_title, seo_description, seo_image_url on articles, events, case_studies; role privileges checked';
END $$;

COMMIT;
