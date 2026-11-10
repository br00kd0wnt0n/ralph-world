-- Weekly Issue 9 visits by source, with what visitors did on the cookie
-- banner. Weeks start Monday, London time.
--   visits          page loads (one 'view' per load)
--   banner_shown    visits where the cookie banner was in front of them
--   accepted_all    chose "Accept all" (so Google Analytics and pixels ran)
--   necessary_only  chose "Necessary only"
--   no_choice       banner shown, no answer (GA never saw them)
-- Usage: psql "$DATABASE_URL" -f scripts/page-visits-report.sql
WITH v AS (
  SELECT
    visit_id,
    to_char(date_trunc('week', min(at) AT TIME ZONE 'Europe/London'), 'DD Mon') AS week,
    max(source) FILTER (WHERE event = 'view') AS source,
    bool_or(paid) AS paid,
    max(banner) FILTER (WHERE event = 'view') AS banner,
    bool_or(event = 'consent_all') AS accepted,
    bool_or(event = 'consent_necessary') AS necessary
  FROM page_visits
  WHERE path = '/issue9'
  GROUP BY visit_id
  HAVING bool_or(event = 'view')
)
SELECT
  week,
  source,
  CASE WHEN paid THEN 'paid' ELSE 'organic' END AS type,
  count(*) AS visits,
  count(*) FILTER (WHERE banner = 'shown') AS banner_shown,
  count(*) FILTER (WHERE accepted) AS accepted_all,
  count(*) FILTER (WHERE necessary) AS necessary_only,
  count(*) FILTER (WHERE banner = 'shown' AND NOT accepted AND NOT necessary) AS no_choice
FROM v
GROUP BY week, source, type
ORDER BY min(week), visits DESC;
