# DB role separation runbook — Task 1.2

**Status:** SQL drafted (`scripts/db-roles-phase-1.sql`). Apply step blocks
on Railway provisioning of two DB users with distinct credentials.

> **Prerequisite — the Phase 1 schema delta must land first.** The grants
> reference tables (`audit_log`, `consent_log`, `email_events`, etc.) that
> only exist in `lib/db/schema.ts` until `scripts/apply-phase-1-schema.sql`
> has been applied. Run that script first; the grants will error out
> otherwise (and the sanity DO-blocks will roll back).

**Context:** Architecture doc §13 calls for two Postgres roles sharing one
DB. `ralph_cms` owns schema migrations and has full r/w on everything.
`ralph_world` is the runtime role used by the consumer site — column-level
restricted on `profiles.role` (so a compromised app can't self-promote to
admin) and INSERT-only on append-only tables (`audit_log`, `consent_log`,
`stripe_events`) so tamper-evidence holds.

## What the SQL does

| Step | Effect |
|---|---|
| 1 | `CREATE ROLE` for `ralph_cms` + `ralph_world` if missing |
| 2 | `GRANT USAGE ON SCHEMA public` to both |
| 3 | `GRANT ALL` on all tables + sequences to `ralph_cms` + default privileges |
| 4 | `ralph_world` full r/w on operational tables (users, sessions, shopify_links, email_events, etc.) |
| 5 | `ralph_world` `SELECT` only on CMS-owned content (articles, events, lab_items, magazine_issues) |
| 6 | `ralph_world` `SELECT + INSERT` only on append-only tables (audit_log, consent_log, stripe_events) — no UPDATE / DELETE |
| 7 | `ralph_world` `SELECT + INSERT` on profiles **plus** explicit column-level UPDATE on every column **except** `role` |
| 8 | Sequences usage + default privileges for future tables |
| 9 | Default privileges so future tables created by `ralph_cms` get `ralph_world` access without rerunning |
| 10 | Sanity DO blocks that `RAISE EXCEPTION` if the grants drift — fails the apply rather than silently leaving the DB insecure |

The script is **idempotent** — re-running is safe. The role-creation block
uses `DO` + `IF NOT EXISTS`; the `GRANT` statements are naturally
idempotent in Postgres.

## Apply procedure

### Step 0 — apply the Phase 1 schema delta + data migration

```bash
psql "$DATABASE_URL_SUPERUSER" -f scripts/apply-phase-1-schema.sql
psql "$DATABASE_URL_SUPERUSER" -f scripts/migrate-phase-1-access-tier.sql
```

Both scripts are idempotent and additive — re-running is safe and won't
drop / rename anything. Sanity DO-blocks at the bottom of each will
`RAISE EXCEPTION` (rolling the transaction back) if any new table or
column is missing afterward.

### One-time provisioning (Railway)

1. In Railway → Postgres service → **Connect** tab, copy the superuser
   `DATABASE_URL` (the one with the role that owns the DB — typically
   `postgres`). Export it locally:
   ```bash
   export DATABASE_URL_SUPERUSER='postgres://postgres:<pw>@<host>:<port>/<db>'
   ```
2. Generate two strong passwords (these become the role passwords):
   ```bash
   openssl rand -base64 32   # → ralph_cms password
   openssl rand -base64 32   # → ralph_world password
   ```
3. Apply the SQL with both passwords passed in as psql variables:
   ```bash
   psql "$DATABASE_URL_SUPERUSER" \
     -v ralph_cms_password="'$RALPH_CMS_PASSWORD'" \
     -v ralph_world_password="'$RALPH_WORLD_PASSWORD'" \
     -f scripts/db-roles-phase-1.sql
   ```
   You should see two `NOTICE` lines confirming the sanity assertions
   passed. If you see `EXCEPTION` instead, the apply rolled back and the
   grants drifted — investigate before re-running.

### Wire the new credentials into Railway

4. In the **ralph-cms** Railway service, set:
   ```
   DATABASE_URL=postgres://ralph_cms:<pw>@<host>:<port>/<db>
   ```
   In the **ralph-world** Railway service, set:
   ```
   DATABASE_URL=postgres://ralph_world:<pw>@<host>:<port>/<db>
   ```
5. Trigger a redeploy on each so the new DSN takes effect. Smoke-test
   `/api/health` on both.

### Verifying the grants are enforced

Connect as `ralph_world` and confirm the column-level restriction works:

```sql
-- Should succeed
UPDATE profiles SET tier = 'free' WHERE id = '<uuid>';

-- Should fail: permission denied for column role
UPDATE profiles SET role = 'admin' WHERE id = '<uuid>';

-- Should fail: permission denied for table audit_log
UPDATE audit_log SET action = 'tampered' WHERE id = '<uuid>';
DELETE FROM audit_log WHERE id = '<uuid>';

-- Should succeed (append-only INSERT allowed)
INSERT INTO audit_log (action, source) VALUES ('test', 'system');
```

## What this unblocks

- **Audit tamper-evidence** (`logAction` writes to `audit_log`): once
  `ralph_world` is INSERT-only, a compromised ralph.world process can't
  cover its tracks by rewriting history.
- **Consent log integrity** (`logConsent`): same property.
- **Privilege escalation defence**: a compromised ralph.world process
  can't promote its own user to `role='admin'` and gain CMS access.

## Rollback

If something breaks after the cutover, point both services back at the
superuser DSN as a temporary mitigation:

```
DATABASE_URL=$DATABASE_URL_SUPERUSER
```

To fully revert the role grants, run:

```sql
REASSIGN OWNED BY ralph_cms, ralph_world TO postgres;
DROP OWNED BY ralph_cms, ralph_world;
DROP ROLE ralph_world;
DROP ROLE ralph_cms;
```

(Don't run this without coordinating with Josh — it deletes the roles
and any default-privilege grants they own.)

## Open items

- ralph-cms still needs its `DATABASE_URL` swapped over too — coordinate
  the cutover with Josh so we don't take both services down at once.
- We should add an integration test that asserts the grants are enforced
  (a Vitest case that connects as `ralph_world` and expects the role
  UPDATE to throw) once a test DB lands.
