import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json(
      { status: 'error', db: 'not configured' },
      { status: 503 }
    )
  }

  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.from('profiles').select('id').limit(1)

    if (error) throw error

    return NextResponse.json({ status: 'ok', db: 'connected' })
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'unreachable' },
      { status: 503 }
    )
  }
}
