'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'
import ProductOverlay from './ProductOverlay'
import SubscribeModal from '@/components/layout/SubscribeModal'
import Footer from '@/components/layout/Footer'
import type { ProductSummary, ShopifyProduct } from '@/lib/shopify/types'

const CATEGORIES = [
  { handle: 'ralph-magazine', label: 'The Mag' },
  { handle: 'ralph-merch', label: 'Merch' },
  { handle: 'ralph-random', label: 'Random S**t' },
]

interface ShopClientProps {
  collections: Record<string, ProductSummary[]>
}

export default function ShopClient({ collections }: ShopClientProps) {
  const [activeCollection, setActiveCollection] = useState(CATEGORIES[0].handle)
  const [overlayProduct, setOverlayProduct] = useState<ShopifyProduct | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  const products = collections[activeCollection] ?? []

  async function openProduct(handle: string) {
    const res = await fetch(`/api/shop/${handle}`)
    if (res.ok) {
      const data = (await res.json()) as ShopifyProduct
      setOverlayProduct(data)
      setOverlayOpen(true)
    }
  }

  return (
    <>
      <section className="bg-[#E5E5E5] px-6 py-16 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-black mb-4 font-[family-name:var(--font-display)]">
          BUY RALPH STUFF
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Magazines, merch, and random things we think are brilliant.
        </p>
      </section>

      {/* Category tabs */}
      <div className="bg-[#E5E5E5] border-b border-gray-300">
        <div className="max-w-6xl mx-auto px-6 flex justify-center gap-8 pb-4">
          {CATEGORIES.map((cat) => {
            const isActive = activeCollection === cat.handle
            return (
              <button
                key={cat.handle}
                onClick={() => setActiveCollection(cat.handle)}
                className={`relative pb-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-ralph-green'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {cat.label}
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 rounded transition-colors ${
                    isActive ? 'bg-ralph-green' : 'bg-transparent'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Product grid */}
      <section className="bg-[#FAFAFA] px-6 py-8 min-h-[50vh]">
        {products.length === 0 ? (
          <div className="max-w-6xl mx-auto text-center py-16 text-gray-500 text-sm">
            Products coming soon.
          </div>
        ) : (
          <motion.div
            key={activeCollection}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => openProduct(product.handle)}
              />
            ))}
          </motion.div>
        )}
      </section>

      <Footer variant="light" />

      <ProductOverlay
        product={overlayProduct}
        isOpen={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        onSubscribe={() => {
          setOverlayOpen(false)
          setSubscribeOpen(true)
        }}
      />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </>
  )
}
