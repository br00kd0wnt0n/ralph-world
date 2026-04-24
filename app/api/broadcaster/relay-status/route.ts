import { NextResponse } from 'next/server'
import { getRelayStatus } from '@/lib/broadcaster/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const status = await getRelayStatus()
  return NextResponse.json(status)
}
