'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const CATEGORIES = [
  { value: 'comedy', label: 'Comedy' },
  { value: 'music', label: 'Music' },
  { value: 'food', label: 'Food' },
  { value: 'film-tv', label: 'Film & TV' },
]

export default function CategoryTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('category') ?? ''

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== active) {
      params.set('category', value)
    } else {
      params.delete('category')
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Dotted separator */}
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
