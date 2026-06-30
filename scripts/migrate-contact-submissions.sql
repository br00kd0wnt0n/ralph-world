-- 2026-06-19 — contact_submissions table for the /jp/contact form.
--
-- Public-facing contact form on /jp/contact writes one row per submit.
-- needs + project_size are JSONB arrays of short stable identifiers
-- (e.g. "branding_strategy"); display labels live in the page + email
-- templates so we can rewrite copy without losing history.
--
-- notified_at records when the team notification email was sent
-- (NULL = send failed; chase those manually until we add an admin view).
--
-- ralph_world is the runtime role — public form posts as ralph_world,
-- so the INSERT grant is mandatory.
--
-- Idempotent — re-running is safe.

CREATE TABLE IF NOT EXISTS contact_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at  timestamp NOT NULL DEFAULT now(),
  locale        text NOT NULL,
  needs         jsonb NOT NULL,
  project_size  jsonb NOT NULL,
  name          text NOT NULL,
  company       text,
  email         text NOT NULL,
  message       text,
  ip            text,
  user_agent    text,
  notified_at   timestamp
);

GRANT SELECT, INSERT, UPDATE, DELETE ON contact_submissions TO ralph_world;

-- Lookups by recent submissions first (admin/log view, future).
CREATE INDEX IF NOT EXISTS contact_submissions_submitted_at_idx
  ON contact_submissions (submitted_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='contact_submissions'
      AND column_name='notified_at'
  ) THEN
    RAISE EXCEPTION 'contact_submissions missing expected columns after apply';
  END IF;
  RAISE NOTICE 'OK — contact_submissions table present + grants applied';
END $$;
