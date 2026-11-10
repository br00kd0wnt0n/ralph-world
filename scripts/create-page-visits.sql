-- Anonymous page visit stats. See pageVisits in lib/db/schema.ts.
-- Idempotent: safe to run more than once.
CREATE TABLE IF NOT EXISTS page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  visit_id uuid NOT NULL,
  event text NOT NULL,
  path text NOT NULL,
  source text NOT NULL,
  click_id boolean NOT NULL DEFAULT false,
  paid boolean NOT NULL DEFAULT false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer_host text,
  browser text,
  device text,
  banner text
);
CREATE INDEX IF NOT EXISTS page_visits_at_idx ON page_visits (at);
CREATE UNIQUE INDEX IF NOT EXISTS page_visits_visit_event_unique ON page_visits (visit_id, event);
