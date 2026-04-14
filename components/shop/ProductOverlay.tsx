'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import type { ShopifyProduct } from '@/lib/shopify/types'

interface ProductOverlayProps {
  product: ShopifyProduct | null
  isOpen: boolean
  onClose: () => void
  onSubscribe: () => void
  soldoutHeading?: string
  soldoutBody?: string
}

export default function ProductOverlay({
  product,
  isOpen,
  onClose,
  onSubscribe,
  soldoutHeading = 'You snooze, you lose',
  soldoutBody = 'This issue is out in the world, being enjoyed by others, not in your hand...',
}: ProductOverlayProps) {
  const { addItem, openCart, isLoading } = useCart()
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    setSelectedImage(0)
  }, [product?.id])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isOpen, onClose])

  if (!product) return null

  const images = product.images.edges.map((e) => e.node)
  const mainImage = images[selectedImage] ?? product.featuredImage
  const firstVariant = product.variants.edges[0]?.node
  const price = product.priceRange.minVariantPrice
  const isAvailable = product.availableForSale
  // Mock products come from lib/shopify/mock.ts when Shopify isn't configured.
  // Disable Buy Now for them to avoid the cart create 503.
  const isDemoMode = product.id.startsWith('gid://mock/')

  async function handleBuy() {
    if (!firstVariant) return
    await addItem(firstVariant.id, 1)
    onClose()
    openCart()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-[#FAFAFA] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/10 backdrop-blur text-black flex items-center justify-center hover:bg-black/20 transition-colors"
            aria-label="Close"
          >
            &#10005;
          </button>

          <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
            <h1 className="text-3xl md:text-5xl font-bold text-center mb-4 text-black">
              {product.title}
            </h1>

            {product.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {product.tags
                  .filter((t) => !t.startsWith('badge-'))
                  .map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-ralph-green/10 text-ralph-green"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Right image (on md+) / top on mobile */}
              <div className="md:order-2">
                <div className="aspect-square bg-white border border-gray-900 relative overflow-hidden">
                  {mainImage ? (
                    <img
                      src={mainImage.url}
                      alt={mainImage.altText ?? product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      No image
                    </div>
                  )}
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white font-bold text-lg tracking-widest">
                        SOLD OUT
                      </span>
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`w-16 h-16 shrink-0 border-2 overflow-hidden ${
                          i === selectedImage ? 'border-ralph-green' : 'border-gray-300'
                        }`}
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Left content */}
              <div className="md:order-1 flex flex-col">
                {product.description && (
                  <p className="text-gray-700 text-sm md:text-base mb-6 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                )}

                <dl className="space-y-3 text-sm border-t border-gray-300 pt-6 mb-6">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 uppercase text-xs tracking-wide">Price</dt>
                    <dd className="text-black font-bold">
                      £{price.amount}
                    </dd>
                  </div>
                </dl>

                {isDemoMode ? (
                  <div className="space-y-3">
                    <button
                      disabled
                      className="w-full rounded-full bg-gray-300 text-gray-500 py-4 font-medium cursor-not-allowed"
                    >
                      Buy Now
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                      Shop is in demo mode. Checkout goes live once Shopify is connected.
                    </p>
                  </div>
                ) : isAvailable ? (
                  <button
                    onClick={handleBuy}
                    disabled={isLoading || !firstVariant}
                    className="w-full rounded-full bg-black text-white py-4 font-medium hover:bg-ralph-green transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Adding…' : 'Buy Now'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <button
                      disabled
                      className="w-full rounded-full bg-gray-300 text-gray-500 py-4 font-medium cursor-not-allowed"
                    >
                      SOLD OUT
                    </button>
                    <div className="bg-white border border-gray-900 p-5">
                      <p className="font-bold text-black mb-2">
                        {soldoutHeading}
                      </p>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        {soldoutBody}
                      </p>
                      <button
                        onClick={onSubscribe}
                        className="text-sm font-medium text-ralph-pink underline"
                      >
                        Find out more
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
