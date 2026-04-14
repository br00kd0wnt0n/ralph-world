import { NextResponse } from 'next/server'
import { getRelayStatus } from '@/lib/broadcaster/client'

export async function GET() {
  const status = await getRelayStatus()
  return NextResponse.json(status)
}
