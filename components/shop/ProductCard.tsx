'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/shopify/format'
import { useCart } from '@/context/CartContext'
import type { ProductSummary } from '@/lib/shopify/types'

interface ProductCardProps {
  product: ProductSummary
  onClick: () => void
}

function getBadge(tags: string[]): string | null {
  if (tags.includes('badge-new')) return 'NEW'
  if (tags.includes('badge-hot')) return 'HOT'
  if (tags.includes('badge-limited')) return 'LIMITED'
  return null
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const badge = getBadge(product.tags)
  const { addItem, openCart } = useCart()
  const [adding, setAdding] = useState(false)

  async function handleAddToBag() {
    if (!product.variantId || !product.available || adding) return
    setAdding(true)
    try {
      await addItem(product.variantId, 1)
      openCart()
    } finally {
      setAdding(false)
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col w-full md:w-[224px]"
    >
      {/* Clickable area — opens the product overlay/detail */}
      <button
        type="button"
        onClick={onClick}
        className="text-left flex flex-col flex-1 cursor-pointer w-full"
      >
        {/* Framed image — shop_product_container.png decorative frame sits on
            top of the product photo. Frame PNG is 448 × 612, so card is
            224 × 306 at half scale. */}
        <div className="relative w-full" style={{ aspectRatio: '448 / 612' }}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted text-xs bg-gray-100">
              No image
            </div>
          )}
          {!product.available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <span className="text-white font-bold text-sm tracking-widest">SOLD OUT</span>
            </div>
          )}

          {/* Decorative frame — sits on top of the image. PNG must have
              transparency where the photo should show through. */}
          <img
            src="/imgs/shop_product_container.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />

          {/* Diagonal ribbon badge — top z so it overlays the frame */}
          {badge && (
            <div className="absolute top-0 left-0 z-30 overflow-hidden w-20 h-20 pointer-events-none">
              <div className="absolute top-3 -left-6 bg-black text-white text-[10px] font-bold px-8 py-1 uppercase tracking-widest -rotate-45">
                {badge}
              </div>
            </div>
          )}
        </div>

        {/* Title + date + price — below the framed image */}
        <div className="mt-3 flex-1 flex flex-col">
          <h3
            className="text-black line-clamp-4 mb-1 text-[20px] md:text-[24px] leading-[1.3]"
            style={{
              fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
              fontWeight: 600,
              // line-height kept at 1.3 (not 100% spec) so the clamp box has
              // room for Gooper Trial's descenders (g/p/y) without clipping.
              letterSpacing: 0,
            }}
          >
            {product.title}
          </h3>
          {product.date && (
            <p
              className="mb-2 text-[14px] md:text-[16px] leading-[22px] md:leading-[26px]"
              style={{
                color: '#000',
                fontFamily: 'var(--font-body), Arial, sans-serif',
                fontWeight: 600,
                letterSpacing: 0,
              }}
            >
              {product.date}
            </p>
          )}
          <p
            className="text-black mt-auto text-[18px] md:text-[22px] leading-[28px] md:leading-[37px]"
            style={{
              fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
              fontWeight: 600,
              letterSpacing: 0,
            }}
          >
            £{formatPrice(product.price)}
          </p>
        </div>
      </button>

      {/* Add to bag — below the price */}
      <button
        type="button"
        onClick={handleAddToBag}
        disabled={!product.available || adding}
        className="mt-3 w-full rounded-full py-2.5 text-white text-[15px] transition-colors bg-ralph-pink hover:bg-ralph-pink/90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ fontFamily: 'var(--font-intro, "Gooper Trial"), serif', fontWeight: 600 }}
      >
        {!product.available ? 'Sold out' : adding ? 'Adding…' : 'Add to bag'}
      </button>
    </motion.div>
  )
}
