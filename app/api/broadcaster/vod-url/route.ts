import { NextResponse } from 'next/server'
import { auth, type SessionWithProfile } from '@/lib/auth'
import { getVodUrl } from '@/lib/broadcaster/client'

export async function GET(request: Request) {
  const session = (await auth()) as SessionWithProfile | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Paid subscription required for VOD
  if (session.profile?.subscriptionStatus !== 'paid') {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const assetId = searchParams.get('id')
  if (!assetId) {
    return NextResponse.json({ error: 'Missing asset id' }, { status: 400 })
  }

  const url = await getVodUrl(assetId)
  if (!url) {
    return NextResponse.json({ error: 'Asset unavailable' }, { status: 404 })
  }

  return NextResponse.json({ url })
}
