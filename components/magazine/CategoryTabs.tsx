'use client'

import { usePathname } from 'next/navigation'

// Mirror this list in ralph-cms/components/cms/ArticleEditor.tsx
// (CONTENT_CATEGORIES) so editors and readers see the same set.
const CATEGORIES = [
  { value: 'comedy', label: 'Comedy' },
  { value: 'music', label: 'Music' },
  { value: 'food', label: 'Food' },
  { value: 'film-tv', label: 'Film & TV' },
  { value: 'fun', label: 'Fun' },
]

// Each tab gets an equal slice of the container width. Computed so the row
// still distributes evenly if categories are added/removed later.
const TAB_WIDTH = `${100 / CATEGORIES.length}%`

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
              className={`relative text-intro transition-colors flex items-center justify-center text-black ${
                !isActive ? 'hover:text-ralph-orange' : ''
              }`}
              style={{ fontSize: 18, lineHeight: 1, fontWeight: isActive ? 700 : 600, height: 50, padding: 0, width: TAB_WIDTH, textAlign: 'center' }}
            >
              <span className="relative z-10">{cat.label}</span>
              {isActive && (
                <img
                  src="/imgs/underline_magazine.svg"
                  alt=""
                  aria-hidden="true"
                  className="absolute pointer-events-none left-1/2 -translate-x-1/2"
                  style={{
                    top: '50%',
                    width: 114,
                    height: 8,
                    maxWidth: 'none',
                  }}
                />
              )}
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
