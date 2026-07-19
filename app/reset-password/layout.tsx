import type { Metadata } from 'next'

// reset-password/page.tsx is a client component and can't export metadata,
// so the noindex lives here in a thin server layout.
export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
