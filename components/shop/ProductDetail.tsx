'use client'

import { useRef, useState } from 'react'
import { formatPrice } from '@/lib/shopify/format'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import { useCart } from '@/context/CartContext'
import Button from '@/components/ui/Button'
import type { ShopifyProduct } from '@/lib/shopify/types'

interface ProductDetailProps {
  product: ShopifyProduct
  onBack: () => void
  onSubscribe: () => void
  soldoutHeading?: string
  soldoutBody?: string
}

/**
 * Inline product detail view — replaces the listings + category tabs in
 * the same content area on /shop. Visual swap is driven by the parent
 * (ShopClient) wrapping this and the listings in an AnimatePresence.
 */
export default function ProductDetail({
  product,
  onBack,
  onSubscribe,
  soldoutHeading = 'You snooze, you lose',
  soldoutBody = 'This issue is out in the world, being enjoyed by others, not in your hand...',
}: ProductDetailProps) {
  const { addItem, openCart, isLoading } = useCart()
  const swiperRef = useRef<SwiperType | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const images = product.images.edges.map((e) => e.node)
  // Always have at least one slide: fall back to featuredImage when the
  // `images` connection is empty.
  const slides = images.length > 0
    ? images
    : product.featuredImage
      ? [product.featuredImage]
      : []
  const firstVariant = product.variants.edges[0]?.node
  const price = product.priceRange.minVariantPrice
  const isAvailable = product.availableForSale
  // Mock products come from lib/shopify/mock.ts when Shopify isn't configured.
  const isDemoMode = product.id.startsWith('gid://mock/')

  async function handleBuy() {
    if (!firstVariant) return
    await addItem(firstVariant.id, 1)
    openCart()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-2 pb-16 md:pb-12">
      <button
        onClick={onBack}
        className="mb-[22px] inline-flex items-center justify-center text-ralph-pink hover:opacity-80 transition-opacity"
        style={{
          fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: 0,
        }}
      >
        &lt; Back
      </button>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        {/* Left column — Swiper image gallery */}
        <div className="min-w-0">
          <div className="relative w-full" style={{ aspectRatio: '1176 / 748' }}>
            {slides.length > 0 ? (
              <Swiper
                onSwiper={(s) => {
                  swiperRef.current = s
                }}
                onSlideChange={(s) => setActiveIndex(s.activeIndex)}
                slidesPerView={1}
                className="w-full h-full"
              >
                {slides.map((img, i) => (
                  <SwiperSlide key={i}>
                    <img
                      src={img.url}
                      alt={img.altText ?? product.title}
                      className="w-full h-full object-cover"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                No image
              </div>
            )}
            {!isAvailable && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 pointer-events-none">
                <span className="text-white font-bold text-lg tracking-widest">
                  SOLD OUT
                </span>
              </div>
            )}
          </div>

          {slides.length > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => swiperRef.current?.slideTo(i)}
                  aria-label={`Show image ${i + 1} of ${slides.length}`}
                  className="cursor-pointer"
                >
                  <img
                    src={
                      i === activeIndex
                        ? '/imgs/bullet_on.svg'
                        : '/imgs/bullet_off.svg'
                    }
                    alt=""
                    aria-hidden="true"
                    width={16}
                    height={16}
                    className="block"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column — title, tags, copy, price, CTA */}
        <div className="flex flex-col">
          <h1
            className={product.dateMetafield?.value ? 'text-black mb-2' : 'text-black mb-8'}
            style={{
              fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
              fontWeight: 600,
              fontSize: 32,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            {product.title}
          </h1>

          {product.dateMetafield?.value && (
            <p
              className="mb-8"
              style={{
                color: '#000',
                fontFamily: 'var(--font-body), Arial, sans-serif',
                fontWeight: 600,
                fontSize: 22,
                lineHeight: '32px',
                letterSpacing: 0,
              }}
            >
              {product.dateMetafield.value}
            </p>
          )}

          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
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

          {product.description && (
            <p
              className="text-black mb-8 whitespace-pre-line"
              style={{
                fontFamily: 'var(--font-body), Arial, sans-serif',
                fontWeight: 600,
                fontSize: 16,
                lineHeight: '23px',
                letterSpacing: 0,
              }}
            >
              {product.description}
            </p>
          )}

          {isDemoMode ? (
            <div className="space-y-3">
              <button
                disabled
                className="w-full rounded-full bg-gray-300 text-gray-500 py-4 font-medium cursor-not-allowed"
              >
                Buy now for £{formatPrice(price.amount)}
              </button>
              <p className="text-xs text-black text-center">
                Shop is in demo mode. Checkout goes live once Shopify is connected.
              </p>
            </div>
          ) : isAvailable ? (
            <Button
              label={isLoading ? 'Adding…' : `Buy now for £${formatPrice(price.amount)}`}
              onClick={firstVariant && !isLoading ? handleBuy : undefined}
              minWidth={230}
            />
          ) : (
            <div className="space-y-4">
              <button
                disabled
                className="w-full rounded-full bg-gray-300 text-gray-500 py-4 font-medium cursor-not-allowed"
              >
                SOLD OUT
              </button>
              <div className="bg-white border border-gray-900 p-5">
                <p className="font-bold text-black mb-2">{soldoutHeading}</p>
                <p className="text-black text-sm mb-4 leading-relaxed">
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

          {/* Subscribe upsell — 32px gap above the paragraph and another
              32px between paragraph and CTA. */}
          <div className="mt-8">
            <p
              className="mb-8"
              style={{
                color: '#000',
                fontFamily: 'var(--font-body), Arial, sans-serif',
                fontWeight: 400,
                fontSize: 16,
                lineHeight: '23px',
                letterSpacing: 0,
              }}
            >
              Love the idea of getting a shiny new Ralph Mag every quarter
              posted through your letterbox? Then subscribe to Ralph, then
              upgrade to &lsquo;full Ralph&rsquo;
            </p>
            <Button label="Subscribe now" href="/join-ralph" minWidth={230} />
          </div>
        </div>
      </div>
    </div>
  )
}
