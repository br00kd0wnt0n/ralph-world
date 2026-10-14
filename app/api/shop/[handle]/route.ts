import { NextResponse } from 'next/server'
import { getProductByHandle } from '@/lib/shopify/client'
import { getIssue9ProductHandle } from '@/lib/issue9'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params
  // Issue 9 is sold only through /issue9; the shop overlay follows `redirect`.
  if (handle === getIssue9ProductHandle()) {
    return NextResponse.json({ redirect: '/issue9' }, { status: 409 })
  }
  const product = await getProductByHandle(handle)
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(product)
}
