'use client'

import { usePathname } from 'next/navigation'

const CATEGORIES = [
  { value: 'comedy', label: 'Comedy' },
  { value: 'music', label: 'Music' },
  { value: 'food', label: 'Food' },
  { value: 'film-tv', label: 'Film & TV' },
]

interface CategoryTabsProps {
  active: string
  onChange: (category: string) => void
}

export default function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  const pathname = usePathname()

  function handleClick(value: string) {
    const next = value === active ? '' : value
    onChange(next)
    // Update URL without server re-fetch
    const url = next ? `${pathname}?category=${next}` : pathname
    window.history.pushState(null, '', url)
  }

  return (
    <div className="w-full mx-auto px-6" style={{ maxWidth: 502 }}>
      {/* Top separator */}
      <img
        src="/imgs/dashed_separator_top.svg"
        alt=""
        aria-hidden="true"
        className="w-full"
      />

      <div className="flex justify-center">
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => handleClick(cat.value)}
              className={`relative text-intro transition-colors flex items-center justify-center ${
                isActive
                  ? 'text-ralph-orange'
                  : 'text-black hover:text-ralph-orange'
              }`}
              style={{ fontSize: 18, lineHeight: 1, fontWeight: isActive ? 700 : 600, height: 50, padding: 0, width: '25%', textAlign: 'center' }}
            >
              {cat.label}
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded transition-colors ${
                  isActive ? 'bg-ralph-orange' : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* Bottom separator */}
      <img
        src="/imgs/dashed_separator_bottom.svg"
        alt=""
        aria-hidden="true"
        className="w-full"
      />
    </div>
  )
}
