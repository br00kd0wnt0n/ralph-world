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

interface CategoryTabsProps {
  active: string
  onChange: (category: string) => void
  /** Category slugs that have articles; others are hidden. Omit to show all. */
  available?: string[]
}

export default function CategoryTabs({
  active,
  onChange,
  available,
}: CategoryTabsProps) {
  const pathname = usePathname()

  // Hide categories with no articles. Each visible tab gets an equal slice of
  // the container width.
  const categories = available
    ? CATEGORIES.filter((c) => available.includes(c.value))
    : CATEGORIES
  const TAB_WIDTH = `${100 / Math.max(categories.length, 1)}%`

  function handleClick(value: string) {
    const next = value === active ? '' : value
    onChange(next)
    // Update URL without server re-fetch
    const url = next ? `${pathname}?category=${next}` : pathname
    window.history.pushState(null, '', url)
  }

  return (
    <div className="w-full mx-auto px-6" style={{ maxWidth: 540 }}>
      {/* Top separator */}
      <img
        src="/imgs/dashed_separator_top.svg"
        alt=""
        aria-hidden="true"
        className="w-full light:invert"
      />

      <div className="flex justify-center">
        {categories.map((cat) => {
          const isActive = active === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => handleClick(cat.value)}
              className={`relative transition flex items-center justify-center text-black light:text-white light:hover:opacity-60 text-[14px] min-[576px]:text-[18px] ${
                !isActive ? 'hover:text-ralph-orange' : ''
              }`}
              style={{ fontFamily: 'var(--font-intro, "Gooper Trial"), serif', lineHeight: 1, fontWeight: isActive ? 700 : 600, height: 50, padding: 0, width: TAB_WIDTH, textAlign: 'center' }}
            >
              <span className="relative z-10">{cat.label}</span>
              {isActive && (
                <img
                  src="/imgs/underline_magazine.svg"
                  alt=""
                  aria-hidden="true"
                  className="absolute pointer-events-none left-1/2 -translate-x-1/2 w-[68px] min-[576px]:w-[114px] h-auto light:brightness-0 light:invert"
                  style={{
                    // +15px below centre so it reads as an underline, not a strikethrough.
                    top: 'calc(50% + 15px)',
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
        className="w-full light:invert"
      />
    </div>
  )
}
