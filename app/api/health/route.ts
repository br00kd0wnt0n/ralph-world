import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * Liveness + DB reachability. Uses the shared pooled client (getDb) rather
 * than opening a fresh postgres() connection per request — an unauthenticated
 * flood of /api/health could otherwise exhaust Postgres max_connections.
 */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ status: 'error', db: 'not configured' }, { status: 503 })
  }
  try {
    await getDb().execute(sql`SELECT 1`)
    return NextResponse.json({ status: 'ok', db: 'connected' })
  } catch {
    return NextResponse.json({ status: 'error', db: 'unreachable' }, { status: 503 })
  }
}
