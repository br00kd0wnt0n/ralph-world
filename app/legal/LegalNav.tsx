'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LEGAL_NAV = [
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/cookies', label: 'Cookies' },
]

/**
 * Legal pages tab nav. Pink-pill active tab (solid ralph-pink + white text);
 * inactive tabs are dark text on transparent with a subtle grey hover pill.
 * Client component so it can read the current route for the active state.
 */
export default function LegalNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Legal pages"
      className="flex flex-wrap gap-2 mb-10 pb-4 border-b border-black/10"
    >
      {LEGAL_NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              active
                ? 'bg-ralph-pink text-black'
                : 'text-black/70 hover:bg-black/5 hover:text-black'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
