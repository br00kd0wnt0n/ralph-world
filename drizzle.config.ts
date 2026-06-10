import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit is a standalone CLI and does NOT load Next.js env files the
// way `next dev`/`next build` do. Load them here so `npm run db:push`
// picks up DATABASE_URL. `.env.local` is loaded first and wins (dotenv
// does not override already-set keys), with `.env` as a fallback.
config({ path: '.env.local' })
config({ path: '.env' })

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add it to ralph-world/.env.local (or export it) before running db:push.'
  )
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
