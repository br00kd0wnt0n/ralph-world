import { NextResponse } from 'next/server'
import { getRelayStatus } from '@/lib/broadcaster/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET() {
  const status = await getRelayStatus()
  return NextResponse.json(status, { headers: NO_CACHE_HEADERS })
}
