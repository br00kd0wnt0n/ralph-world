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
    <div className="max-w-5xl mx-auto px-6">
      <div className="border-t border-dashed border-gray-400 mb-4" />

      <div className="flex justify-center gap-8 pb-4">
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => handleClick(cat.value)}
              className={`relative pb-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-ralph-orange'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
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
    </div>
  )
}
