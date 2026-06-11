# Schema drift investigation — 2026-06-11

**Verdict: NO drift. No migration required.** The production database matches
`lib/db/schema.ts`. The earlier "add `articles_slug_unique` + truncate" prompt
was a false positive caused by running `drizzle-kit push` as the restricted
`ralph_world` role.

## Background

On 2026-06-10, `npm run db:push` (run with the `ralph_world` DATABASE_URL in
`.env.local`) proposed adding `articles_slug_unique` and offered to **truncate
the articles table**. That looked like real drift and the push was aborted
(correctly — never accept a truncate).

## Investigation (introspected as `ralph_cms`, full visibility)

Compared the live DB against `lib/db/schema.ts`:

- **Constraints / unique indexes — all present and correctly named.**
  `articles_slug_unique`, `events_slug_unique`, `lab_items_slug_unique`,
  `case_studies_slug_unique`, `tv_vod_broadcaster_id_unique`,
  `magazine_issues` unique `issue_number`, `magazine_shipments` unique
  `(user_id, issue_id)`, `event_rsvps` unique `(event_id, user_id)`,
  `shopify_links` unique `shopify_customer_id`, `stripe_events` unique
  `stripe_event_id`, `users` unique `email`, `cms_invites` unique `email`,
  plus every PK and FK. Nothing missing.
- **Columns — all match.** Spot-checked the actively-edited tables
  (articles incl. `card_image_url`; profiles incl. all Phase-1 columns;
  events incl. `rsvp_enabled`/`rsvp_capacity`; magazine_issues;
  magazine_shipments incl. `error`; tv_vod; lab_items). No missing or extra
  columns.
- **No duplicate slugs** in articles or events (so the unique constraints
  are valid and were never at risk).

## Root cause of the false positive

`information_schema.table_constraints` / `key_column_usage` only expose
constraints on tables the **current role has sufficient privilege on**.
`ralph_world` is SELECT-only on the CMS-owned content tables (articles,
events, lab_items, magazine_issues — see `db-role-separation.md`), and that
SELECT-only grant is **not enough** for those tables' constraints to appear in
`information_schema` for that role.

So when `drizzle-kit push` introspected the DB **as `ralph_world`**, it saw
articles/events/etc. with *no* unique constraint on `slug` (the constraint was
hidden by privilege), concluded they were missing, and proposed creating
them — with truncate as its "safe" fallback in case of duplicate values.

Proof: the same introspection run as `ralph_world` omits articles/events/
lab_items/tv_vod/magazine_issues/homepage_config entirely from the constraint
list; run as `ralph_cms` (GRANT ALL), every constraint appears.

## Operational rule (already in the DNS cutover checklist)

- **Never run `drizzle-kit push` / migrations as `ralph_world`.** It will
  always propose re-adding constraints it can't see, and the truncate prompts
  are dangerous false positives.
- DDL / `db:push` must run as `ralph_cms` (now has `CREATE ON SCHEMA public`)
  or the Postgres superuser. As `ralph_cms`, a `push` against today's prod
  shows **no changes** — confirming parity.

## Not exhaustively verified

Column nullability and default values were not diffed column-by-column across
all 23 tables. No functional issues observed (inserts via the CMS succeed for
every content type), and the constraint/column-name parity is complete. If a
belt-and-braces check is wanted later, run `drizzle-kit push` as `ralph_cms`
in a TTY and confirm it reports "No changes detected" rather than applying.
