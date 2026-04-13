'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface CartItem {
  id: string
  variantId: string
  title: string
  price: string
  quantity: number
  imageUrl?: string
}

interface CartContextValue {
  cartId: string | null
  lineItems: CartItem[]
  totalAmount: string
  checkoutUrl: string | null
  isOpen: boolean
  itemCount: number
  addItem: (variantId: string, qty?: number) => Promise<void>
  removeItem: (lineItemId: string) => Promise<void>
  updateQty: (lineItemId: string, qty: number) => Promise<void>
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ralph-cart-id')
    }
    return null
  })
  const [lineItems, setLineItems] = useState<CartItem[]>([])
  const [totalAmount, setTotalAmount] = useState('0.00')
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0)

  async function addItem(_variantId: string, _qty = 1) {
    // Phase 6: Shopify Storefront API integration
  }

  async function removeItem(_lineItemId: string) {
    // Phase 6
  }

  async function updateQty(_lineItemId: string, _qty: number) {
    // Phase 6
  }

  return (
    <CartContext.Provider
      value={{
        cartId,
        lineItems,
        totalAmount,
        checkoutUrl,
        isOpen,
        itemCount,
        addItem,
        removeItem,
        updateQty,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
