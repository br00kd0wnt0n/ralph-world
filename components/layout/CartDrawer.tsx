'use client'

import { useCart } from '@/context/CartContext'

export default function CartDrawer() {
  const { isOpen, closeCart, lineItems, totalAmount, checkoutUrl } = useCart()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-surface border-l border-border shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-primary">Your basket</h2>
          <button
            onClick={closeCart}
            className="text-secondary hover:text-primary text-xl"
            aria-label="Close cart"
          >
            &#10005;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lineItems.length === 0 ? (
            <p className="text-secondary text-sm text-center mt-8">
              Your basket is empty
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 border-b border-border/30 pb-3"
                >
                  {item.imageUrl && (
                    <div className="w-16 h-16 bg-background rounded overflow-hidden shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-secondary">
                      {item.price} &times; {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium text-primary">Subtotal</span>
            <span className="font-bold text-primary">
              &pound;{totalAmount}
            </span>
          </div>
          {checkoutUrl && (
            <a
              href={checkoutUrl}
              className="block w-full rounded-full bg-ralph-pink py-3 text-center text-white font-medium hover:bg-ralph-pink/90 transition-colors"
            >
              Checkout
            </a>
          )}
        </div>
      </div>
    </>
  )
}
