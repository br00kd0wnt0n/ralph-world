import { NextResponse } from 'next/server'
import { getSchedule } from '@/lib/broadcaster/client'

// Schedule drifts in real time (pointer recomputes from wall clock), so
// the route handler must not be cached — otherwise the "on now" show
// sticks on whatever was current at first request.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const schedule = await getSchedule()
  return NextResponse.json(schedule)
}
