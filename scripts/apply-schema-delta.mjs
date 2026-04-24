// One-off: apply the two schema additions from this session against Railway.
// Safe to re-run — both statements use IF NOT EXISTS.
//
//   ALTER TABLE events ADD COLUMN IF NOT EXISTS country_code text;
//   CREATE TABLE IF NOT EXISTS case_studies (...);
//
// Usage: node scripts/apply-schema-delta.mjs
// Reads DATABASE_URL from .env.local.

import { readFileSync } from 'node:fs'
import postgres from 'postgres'

function loadEnv() {
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
      if (!m) continue
      const [, k, v] = m
      const unquoted = v.replace(/^['"]|['"]$/g, '')
      if (!process.env[k]) process.env[k] = unquoted
    }
  } catch {
    // ignore
  }
}

loadEnv()

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}

const sql = postgres(url, { max: 1 })

const statements = [
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS country_code text`,
  `CREATE TABLE IF NOT EXISTS case_studies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    status text DEFAULT 'draft',
    title text,
    subtitle text,
    thumbnail_url text,
    external_url_override text,
    sort_order integer DEFAULT 0,
    published_at timestamp,
    CONSTRAINT case_studies_slug_unique UNIQUE (slug)
  )`,
]

try {
  for (const s of statements) {
    console.log(
      '▶',
      s.replace(/\s+/g, ' ').slice(0, 90) + (s.length > 90 ? '…' : '')
    )
    await sql.unsafe(s)
  }
  console.log('\n✅ Applied.')
  const events = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='events' AND column_name='country_code'
  `
  const cs = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_name='case_studies'
  `
  console.log(
    'events.country_code:',
    events.length ? 'exists' : 'MISSING'
  )
  console.log('case_studies table:', cs.length ? 'exists' : 'MISSING')
} catch (err) {
  console.error('❌ Failed:', err.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
