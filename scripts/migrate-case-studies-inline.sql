-- 2026-07-21 — case_studies gets the fields it needs to render the
-- full case-study viewer on ralph-world directly, instead of pointing
-- at the standalone casestudyviewer service.
--
-- The standalone viewer keeps running as a fallback; the new fields
-- give the CMS row everything the viewer's data/case-studies.json used
-- to hold, so case studies can be authored and rendered end-to-end
-- from the RW stack.
--
-- Idempotent — every column added with IF NOT EXISTS.

ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS client_logo_url text;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS tags            text[];
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS brand_colors    jsonb;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS subtitle_color  text;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS cta_color       text;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS outro_heading   text;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS outro_subtitle  text;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS sections        jsonb;

-- Re-grant runtime rights so the new columns are covered.
GRANT SELECT, INSERT, UPDATE, DELETE ON case_studies TO ralph_world;

DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(c, ', ') INTO missing
  FROM (VALUES
    ('client_logo_url'),
    ('tags'),
    ('brand_colors'),
    ('subtitle_color'),
    ('cta_color'),
    ('outro_heading'),
    ('outro_subtitle'),
    ('sections')
  ) AS v(c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='case_studies' AND column_name=v.c
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'case_studies missing columns after apply: %', missing;
  END IF;
  RAISE NOTICE 'OK — case_studies extended with inline viewer fields';
END $$;
