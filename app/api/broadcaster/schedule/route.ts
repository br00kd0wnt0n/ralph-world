import { NextResponse } from 'next/server'
import { getSchedule } from '@/lib/broadcaster/client'

export async function GET() {
  const schedule = await getSchedule()
  return NextResponse.json(schedule)
}
