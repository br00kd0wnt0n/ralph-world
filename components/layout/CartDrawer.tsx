'use client'

import { useCart } from '@/context/CartContext'

export default function CartDrawer() {
  const { cart, isOpen, closeCart, removeItem, updateQty, isLoading } = useCart()

  if (!isOpen) return null

  const lines = cart?.lines.edges ?? []
  const subtotal = cart?.cost.subtotalAmount

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={closeCart}
      />

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
          {lines.length === 0 ? (
            <p className="text-secondary text-sm text-center mt-8">
              Your basket is empty
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {lines.map((edge) => {
                const line = edge.node
                const image = line.merchandise.product.featuredImage
                return (
                  <div
                    key={line.id}
                    className="flex gap-3 border-b border-border/30 pb-3"
                  >
                    <div className="w-16 h-16 bg-background rounded overflow-hidden shrink-0">
                      {image && (
                        <img
                          src={image.url}
                          alt={image.altText ?? ''}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary line-clamp-2">
                        {line.merchandise.product.title}
                      </p>
                      {line.merchandise.title !== 'Default Title' && (
                        <p className="text-xs text-muted mb-1">
                          {line.merchandise.title}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() =>
                            updateQty(line.id, Math.max(0, line.quantity - 1))
                          }
                          className="w-6 h-6 rounded border border-border text-primary text-sm"
                        >
                          &minus;
                        </button>
                        <span className="text-sm text-primary w-6 text-center">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(line.id, line.quantity + 1)}
                          className="w-6 h-6 rounded border border-border text-primary text-sm"
                        >
                          +
                        </button>
                        <span className="ml-auto text-sm text-secondary">
                          £{line.cost.totalAmount.amount}
                        </span>
                        <button
                          onClick={() => removeItem(line.id)}
                          className="text-muted hover:text-ralph-pink text-xs ml-2"
                          aria-label="Remove"
                        >
                          &#10005;
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          {subtotal && (
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-primary">Subtotal</span>
              <span className="font-bold text-primary">
                £{subtotal.amount}
              </span>
            </div>
          )}
          {lines.length > 0 ? (
            cart?.checkoutUrl ? (
              <a
                href={cart.checkoutUrl}
                className="block w-full rounded-full bg-ralph-pink py-3 text-center text-white font-medium hover:bg-ralph-pink/90 transition-colors"
              >
                {isLoading ? 'Updating…' : 'Checkout'}
              </a>
            ) : (
              <div className="text-center text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-md py-2 px-3">
                Checkout temporarily unavailable — please try again in a
                moment.
              </div>
            )
          ) : null}
        </div>
      </div>
    </>
  )
}
