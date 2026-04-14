import { NextResponse } from 'next/server'
import { getProductByHandle } from '@/lib/shopify/client'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(product)
}
