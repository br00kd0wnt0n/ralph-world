'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Ralph TV', href: '/tv', color: 'bg-ralph-yellow' },
  { label: 'Magazine', href: '/magazine', color: 'bg-ralph-orange' },
  { label: 'Events', href: '/events', color: 'bg-ralph-blue' },
  { label: 'Lab', href: '/lab', color: 'bg-ralph-purple' },
  { label: 'Shop', href: '/shop', color: 'bg-ralph-green' },
]

export default function PageNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col items-center" style={{ paddingTop: 16, paddingBottom: 50 }}>
      {/* Logo */}
      <Link href="/" className="mb-4">
        <Image
          src="/ralph-wordmark.png"
          alt="ralph"
          width={200}
          height={98}
          style={{ height: 98, width: 'auto' }}
          priority
        />
      </Link>

      {/* Nav items */}
      <nav className="flex items-center justify-center" style={{ gap: 70 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative pb-1.5 text-btn text-[22px] transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-ralph-pink hover:text-primary'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 rounded ${item.color}`}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
