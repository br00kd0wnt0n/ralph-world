import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { default: 'Legal', template: '%s | Ralph.world' },
  robots: { index: true, follow: true },
}

const LEGAL_NAV = [
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/cookies', label: 'Cookies' },
]

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-black">
      <nav
        aria-label="Legal pages"
        className="flex flex-wrap gap-4 sm:gap-6 mb-10 pb-4 border-b border-black/15 text-sm"
      >
        {LEGAL_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-black/70 hover:text-black underline-offset-4 hover:underline"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="prose prose-sm sm:prose-base max-w-none [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_a]:text-ralph-pink [&_a]:underline">
        {children}
      </div>
    </div>
  )
}
