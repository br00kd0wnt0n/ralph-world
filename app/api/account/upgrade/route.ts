import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createSubscriptionCheckout } from '@/lib/shopify/client'

// Starts the paid-tier checkout flow.
// Must be authenticated — we need the user's email to pre-fill the
// Shopify checkout and later match the webhook back to a profile.
// On success: 303 redirect to the Shopify-hosted checkout.
// On failure: redirects back to /account with an error flag so the UI
// can surface a "try again" message instead of silently failing.
export async function GET() {
  const session = await auth()
  const email = session?.user?.email

  if (!email) {
    return NextResponse.redirect(
      new URL('/login?callbackUrl=/account', baseUrl())
    )
  }

  const checkoutUrl = await createSubscriptionCheckout(email)

  if (!checkoutUrl) {
    return NextResponse.redirect(
      new URL('/account?upgrade=error', baseUrl())
    )
  }

  return NextResponse.redirect(checkoutUrl, { status: 303 })
}

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    'http://localhost:3000'
  )
}
