import { NextResponse } from 'next/server'
import { getNowPlaying } from '@/lib/broadcaster/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET() {
  const nowPlaying = await getNowPlaying()
  return NextResponse.json(nowPlaying, { headers: NO_CACHE_HEADERS })
}
