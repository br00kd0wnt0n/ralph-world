import { NextResponse } from 'next/server'
import postgres from 'postgres'

export async function GET() {
  const url = process.env.DATABASE_URL

  if (!url) {
    return NextResponse.json(
      { status: 'error', db: 'not configured' },
      { status: 503 }
    )
  }

  try {
    const sql = postgres(url, { max: 1 })
    await sql`SELECT 1`
    await sql.end()
    return NextResponse.json({ status: 'ok', db: 'connected' })
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'unreachable' },
      { status: 503 }
    )
  }
}
