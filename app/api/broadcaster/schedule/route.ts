import { NextResponse } from 'next/server'
import { getSchedule } from '@/lib/broadcaster/client'

// Schedule drifts in real time (pointer recomputes from wall clock), so
// the route handler must not be cached — otherwise the "on now" show
// sticks on whatever was current at first request.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET() {
  const schedule = await getSchedule()
  return NextResponse.json(schedule, { headers: NO_CACHE_HEADERS })
}
