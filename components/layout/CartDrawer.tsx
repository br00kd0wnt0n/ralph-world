'use client'

import { Fragment, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { useFocusTrap } from '@/hooks/useFocusTrap'

// Gooper title face — shared by "Your basket", line totals, and the subtotal.
const gooperTitle: React.CSSProperties = {
  fontFamily: "'Gooper Trial', serif",
  fontWeight: 600,
  fontSize: 22,
  lineHeight: 1,
  letterSpacing: 0,
}

export default function CartDrawer() {
  const { cart, isOpen, closeCart, removeItem, updateQty, isLoading } = useCart()
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen)

  // ESC closes the drawer while open.
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCart()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, closeCart])

  const lines = cart?.lines.edges ?? []
  const subtotal = cart?.cost.subtotalAmount

  return (
    <AnimatePresence>
      {isOpen && (
        <>
      {/* z-300+ so the drawer sits above the footer, header and everything. */}
      <motion.div
        className="fixed inset-0 z-[300] bg-[#000000B2]"
        onClick={closeCart}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      />

      <motion.div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="fixed top-0 right-0 bottom-0 z-[310] w-full max-w-md bg-white text-black border-l border-black/10 shadow-xl flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="flex items-center justify-between p-4">
          <h2
            id="cart-drawer-title"
            className="text-black"
            style={gooperTitle}
          >
            Your basket
          </h2>
          <button
            onClick={closeCart}
            className="group relative w-9 h-9 shrink-0"
            aria-label="Close cart"
          >
            <img
              src="/imgs/closecircle_btn.svg"
              alt=""
              aria-hidden="true"
              className="w-full h-full block group-hover:hidden select-none"
            />
            <img
              src="/imgs/closecircle_btn_over.svg"
              alt=""
              aria-hidden="true"
              className="w-full h-full hidden group-hover:block select-none"
            />
          </button>
        </div>
        {/* Header divider */}
        <div
          aria-hidden="true"
          className="w-full shrink-0"
          style={{
            height: 8,
            backgroundImage: 'url(/imgs/divide_line_02.svg)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          }}
        />

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <p className="text-black/60 text-sm font-semibold text-center mt-8">
              Your basket is empty
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {lines.map((edge, i) => {
                const line = edge.node
                const image = line.merchandise.product.featuredImage
                return (
                  <Fragment key={line.id}>
                  <div
                    className="flex items-end gap-3"
                  >
                    <div className="w-24 aspect-square bg-black/5 rounded overflow-hidden shrink-0">
                      {image && (
                        <img
                          src={image.url}
                          alt={image.altText ?? ''}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-black line-clamp-2 mb-4"
                        style={{
                          fontFamily: "'Gooper Trial', serif",
                          fontWeight: 600,
                          fontSize: 18,
                          lineHeight: 1.15,
                        }}
                      >
                        {line.merchandise.product.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQty(line.id, Math.max(0, line.quantity - 1))
                          }
                          className="w-6 h-6 rounded border border-black/20 text-black text-sm"
                        >
                          &minus;
                        </button>
                        <span className="text-sm text-black w-6 text-center">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(line.id, line.quantity + 1)}
                          className="w-6 h-6 rounded border border-black/20 text-black text-sm"
                        >
                          +
                        </button>
                        <span className="ml-auto text-black" style={gooperTitle}>
                          £{line.cost.totalAmount.amount}
                        </span>
                        <button
                          onClick={() => removeItem(line.id)}
                          className="text-black/50 hover:text-ralph-pink text-xs ml-2"
                          aria-label="Remove"
                        >
                          &#10005;
                        </button>
                      </div>
                    </div>
                  </div>
                  {i < lines.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="w-full"
                      style={{
                        height: 4,
                        backgroundImage: 'url(/imgs/divide_line_01.svg)',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  )}
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-black/10 p-4">
          {subtotal && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-black" style={gooperTitle}>Subtotal</span>
              <span className="text-black" style={gooperTitle}>
                £{subtotal.amount}
              </span>
            </div>
          )}
          {lines.length > 0 ? (
            cart?.checkoutUrl ? (
              // Shadow button with a pink outline (pink rim + pink offset shadow)
              <div className="relative w-full">
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#EA128B',
                    pointerEvents: 'none',
                  }}
                />
                <a
                  href={cart.checkoutUrl}
                  className="btn-press relative w-full inline-flex items-center justify-center"
                  style={{
                    height: 48,
                    border: '2px solid #EA128B',
                    backgroundColor: 'white',
                    color: 'black',
                    fontFamily: "'Gooper Trial', serif",
                    fontWeight: 600,
                    fontSize: 16,
                    lineHeight: 1,
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {isLoading ? 'Updating…' : 'Checkout'}
                </a>
              </div>
            ) : (
              <div className="text-center text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md py-2 px-3">
                Checkout temporarily unavailable — please try again in a
                moment.
              </div>
            )
          ) : null}
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
