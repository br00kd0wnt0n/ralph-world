'use client'

import { motion } from 'framer-motion'
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

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="relative text-left bg-white border border-gray-900 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Diagonal ribbon badge */}
      {badge && (
        <div className="absolute top-0 left-0 z-10 overflow-hidden w-20 h-20 pointer-events-none">
          <div className="absolute top-3 -left-6 bg-black text-white text-[10px] font-bold px-8 py-1 uppercase tracking-widest -rotate-45">
            {badge}
          </div>
        </div>
      )}

      {/* Square thumbnail */}
      <div className="aspect-square bg-gray-100 relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">
            No image
          </div>
        )}
        {!product.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-widest">SOLD OUT</span>
          </div>
        )}
      </div>

      {/* Title + price */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-black line-clamp-4 mb-2">
          {product.title}
        </h3>
        <p className="text-sm text-gray-700 font-medium mt-auto">
          £{product.price}
        </p>
      </div>
    </motion.button>
  )
}
