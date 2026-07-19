'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionIntro from '@/components/layout/SectionIntro'
import ProductCard from './ProductCard'
import ProductDetail from './ProductDetail'
import SubscribeModal from '@/components/layout/SubscribeModal'
import {
  sectionContainerVariants,
  sectionBgVariants,
  sectionContentVariants,
} from '@/lib/animation/page-transitions'
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
  /** Set by the /shop/[handle] server route — opens that product immediately
      (no client fetch / no listing flash on a direct hit). */
  initialProduct?: ShopifyProduct | null
}

export default function ShopClient({
  collections,
  heading = 'BUY RALPH STUFF',
  intro = 'Magazines, merch, and random things we think are brilliant.',
  soldoutHeading,
  soldoutBody,
  copy,
  initialProduct,
}: ShopClientProps) {
  const [activeCollection, setActiveCollection] = useState<ShopCategory>(
    CATEGORIES[0].handle
  )
  const activeCategory = CATEGORIES.find((c) => c.handle === activeCollection)
  // selectedProduct drives the inline view swap — when non-null, the
  // category tabs + product grid fade out and the product detail fades
  // into the same space (no overlay).
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(
    initialProduct ?? null,
  )
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  const products = collections[activeCollection] ?? []

  async function fetchProduct(handle: string): Promise<ShopifyProduct | null> {
    const res = await fetch(`/api/shop/${handle}`)
    if (!res.ok) return null
    return (await res.json()) as ShopifyProduct
  }

  // openProduct: called from a card click. Push the nice URL, then load.
  async function openProduct(handle: string) {
    // Use the un-patched History.prototype.pushState so Next.js 16's App
    // Router doesn't treat the path change as a soft navigation (which
    // would fire the /shop/[handle] redirect → re-mount and lose state).
    History.prototype.pushState.call(window.history, null, '', `/shop/${handle}`)
    const data = await fetchProduct(handle)
    if (data) setSelectedProduct(data)
  }

  function closeProduct() {
    History.prototype.pushState.call(window.history, null, '', '/shop')
    setSelectedProduct(null)
  }

  // Legacy fallback: open a product from ?product= (old links / OAuth return).
  // The /shop/[handle] route now passes initialProduct directly (no fetch).
  useEffect(() => {
    if (initialProduct) return
    const params = new URLSearchParams(window.location.search)
    const handle = params.get('product')
    if (!handle) return
    let cancelled = false
    fetchProduct(handle).then((data) => {
      if (cancelled || !data) return
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProduct(data)
      History.prototype.replaceState.call(
        window.history,
        null,
        '',
        `/shop/${handle}`,
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Close the detail view on back/forward navigation.
  useEffect(() => {
    function onPopState() {
      setSelectedProduct(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <motion.div
      variants={sectionContainerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Intro section - animates itself via heroContainerVariants */}
      <SectionIntro
        section="shop"
        heading={heading}
        lines={[intro]}
      />

      {/* Planet + white bg layered with content.
          min-height ensures the white background extends to the footer on
          tall viewports so the page never shows the body bg between the
          shop content and the footer. 200px is approximate
          SectionIntro + Footer total — tweak as needed. */}
      <section
        className="relative"
        style={{ minHeight: 'calc(100svh - 200px)' }}
      >
        {/* Background - animates SECOND */}
        <motion.div variants={sectionBgVariants} className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full planet-bg-cover"
              style={{
                backgroundImage: 'url(/imgs/planet_background_shop.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none planet-bg-cover"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_shop.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          <div
            className="absolute bg-white"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </motion.div>

        {/* Content layer - animates LAST */}
        <motion.div
          variants={sectionContentVariants}
          className="relative z-10 pb-8 min-h-[50vh]"
          style={{ paddingTop: 120 }}
        >
          {/* Cross-fade between the listings view (tabs + grid) and the
              inline product detail view. mode="wait" so the outgoing view
              completes its fade-out before the incoming one fades in,
              avoiding overlap in the same space. */}
          <AnimatePresence mode="wait">
            {selectedProduct ? (
              <motion.div
                key={`product-${selectedProduct.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <ProductDetail
                  product={selectedProduct}
                  onBack={closeProduct}
                  onSubscribe={() => {
                    closeProduct()
                    setSubscribeOpen(true)
                  }}
                  soldoutHeading={soldoutHeading}
                  soldoutBody={soldoutBody}
                />
              </motion.div>
            ) : (
              <motion.div
                key="listings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
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
                          className="relative text-intro transition-colors flex items-center justify-center text-black"
                          style={{ fontSize: 18, lineHeight: 1, fontWeight: isActive ? 700 : 600, height: 50, padding: 0, width: '33.333%', textAlign: 'center' }}
                        >
                          <span className="relative z-10">{cat.label}</span>
                          {isActive && (
                            <img
                              src="/imgs/underline_shop.svg"
                              alt=""
                              aria-hidden="true"
                              className="absolute pointer-events-none left-1/2 -translate-x-1/2 z-0"
                              style={{
                                top: '50%',
                                width: 118,
                                height: 11,
                                maxWidth: 'none',
                              }}
                            />
                          )}
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
                <div className="px-6 pb-24 md:pb-8" style={{ paddingTop: 64 }}>
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
                      className="max-w-6xl mx-auto grid justify-center grid-cols-2 gap-x-4 gap-y-12 min-[576px]:grid-cols-[repeat(auto-fill,224px)] min-[576px]:gap-8 md:gap-16 md:pb-20"
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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
