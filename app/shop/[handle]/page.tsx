import { redirect } from 'next/navigation'

interface ShopHandlePageProps {
  params: Promise<{ handle: string }>
}

// Direct visits to /shop/[handle] (deep link, refresh, share) redirect to
// /shop?product=handle. ShopClient reads the query param, opens the
// inline product detail view, then pushState's the nice slug URL back
// into the address bar.
export default async function ShopHandlePage({ params }: ShopHandlePageProps) {
  const { handle } = await params
  redirect(`/shop?product=${encodeURIComponent(handle)}`)
}
