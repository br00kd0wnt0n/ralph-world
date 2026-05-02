'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionIntro from '@/components/layout/SectionIntro'
import ProductCard from './ProductCard'
import ProductOverlay from './ProductOverlay'
import SubscribeModal from '@/components/layout/SubscribeModal'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import type {
  ProductSummary,
  ShopifyProduct,
  ShopCategory,
} from '@/lib/shopify/types'
import type { SiteCopy } from '@/lib/data/site-copy'

const CATEGORIES: { handle: ShopCategory; label: string; hint: string }[] = [
  {
    handle: 'magazine',
    label: 'The Mag',
    hint: 'Magazines / Magazines & Newspapers',
  },
  {
    handle: 'merch',
    label: 'Merch',
    hint: 'Apparel, Hats, Hoodies, Tote Bags, Socks, etc.',
  },
  {
    handle: 'random',
    label: 'Random S**t',
    hint: 'Anything else (Pins, Stickers, Mugs, Candles, Prints…)',
  },
]

interface ShopClientProps {
  collections: Record<ShopCategory, ProductSummary[]>
  heading?: string
  intro?: string
  soldoutHeading?: string
  soldoutBody?: string
  copy?: Partial<SiteCopy>
}

export default function ShopClient({
  collections,
  heading = 'BUY RALPH STUFF',
  intro = 'Magazines, merch, and random things we think are brilliant.',
  soldoutHeading,
  soldoutBody,
  copy,
}: ShopClientProps) {
  const [activeCollection, setActiveCollection] = useState<ShopCategory>(
    CATEGORIES[0].handle
  )
  const activeCategory = CATEGORIES.find((c) => c.handle === activeCollection)
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
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Intro section with transparent bg */}
      <SectionIntro
        section="shop"
        heading={heading}
        lines={[intro]}
      />

      {/* Planet + white bg layered with content */}
      <section className="relative">
        <div className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
              style={{
                backgroundImage: 'url(/imgs/planet_background_tv.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_tv.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          <div
            className="absolute bg-white"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </div>

        {/* Content layer */}
        <div
          className="relative z-10 pb-8 min-h-[50vh]"
          style={{ paddingTop: 200 }}
        >
          {/* Category tabs */}
          <div className="w-full mx-auto px-6" style={{ maxWidth: 502 }}>
            <img
              src="/imgs/dashed_separator_top.svg"
              alt=""
              aria-hidden="true"
              className="w-full"
            />

            <div className="flex justify-center">
              {CATEGORIES.map((cat) => {
                const isActive = activeCollection === cat.handle
                return (
                  <button
                    key={cat.handle}
                    onClick={() => setActiveCollection(cat.handle)}
                    className={`relative text-intro transition-colors flex items-center justify-center ${
                      isActive
                        ? 'text-ralph-orange'
                        : 'text-black hover:text-ralph-orange'
                    }`}
                    style={{ fontSize: 18, lineHeight: 1, fontWeight: isActive ? 700 : 600, height: 50, padding: 0, width: '33.333%', textAlign: 'center' }}
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

            <img
              src="/imgs/dashed_separator_bottom.svg"
              alt=""
              aria-hidden="true"
              className="w-full"
            />
          </div>

          {/* Product grid */}
          <div className="px-6 py-8">
            {products.length === 0 ? (
              <div className="max-w-2xl mx-auto text-center py-16 space-y-3">
                <p className="text-gray-500 text-sm">Products coming soon.</p>
                <p className="text-gray-400 text-xs italic">
                  Content team: products appear here once their <strong>Category</strong>{' '}
                  in Shopify Admin matches this tab
                  {activeCategory ? ` (${activeCategory.hint})` : ''}.
                </p>
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
          </div>
        </div>
      </section>

      <ProductOverlay
        product={overlayProduct}
        isOpen={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        onSubscribe={() => {
          setOverlayOpen(false)
          setSubscribeOpen(true)
        }}
        soldoutHeading={soldoutHeading}
        soldoutBody={soldoutBody}
      />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
