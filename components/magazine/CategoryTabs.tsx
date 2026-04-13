'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'music', label: 'Music' },
  { value: 'food', label: 'Food' },
  { value: 'film-tv', label: 'Film & TV' },
]

export default function CategoryTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('category') ?? ''

  return (
    <div className="flex gap-6 px-6 py-4 max-w-5xl mx-auto border-b border-gray-200">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => {
            const url = cat.value
              ? `/magazine?category=${cat.value}`
              : '/magazine'
            router.push(url)
          }}
          className={`relative pb-2 text-sm font-medium transition-colors ${
            active === cat.value
              ? 'text-ralph-orange'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {cat.label}
          {active === cat.value && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ralph-orange rounded" />
          )}
        </button>
      ))}
    </div>
  )
}
