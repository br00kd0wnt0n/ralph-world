import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAssets } from '@/lib/broadcaster/client'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const assets = await getAssets()
  return NextResponse.json(assets)
}
