import { NextResponse } from 'next/server'

// The HLS relay URL used to live in NEXT_PUBLIC_BROADCASTER_RELAY_URL,
// which Next.js inlines at BUILD time. If Railway's build didn't have
// the var set, the client bundle silently baked `undefined` and the
// player rendered a black screen with no runtime way to recover.
//
// This route reads the URL from a regular runtime env var so it can be
// rotated / added without a rebuild, and the failure mode is loud:
// { url: null, reason: 'not_configured' } instead of a silent black
// square in the video pane.
//
// Not auth-gated — the URL is a public HLS endpoint anyone can watch
// (same visibility as embedding it in the client bundle).
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const url = process.env.BROADCASTER_RELAY_URL?.trim() || null
  if (!url) {
    return NextResponse.json(
      { url: null, reason: 'not_configured' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
  return NextResponse.json(
    { url },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
