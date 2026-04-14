'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { ShopifyCart } from '@/lib/shopify/types'

interface CartContextValue {
  cart: ShopifyCart | null
  isOpen: boolean
  itemCount: number
  isLoading: boolean
  addItem: (variantId: string, qty?: number) => Promise<void>
  removeItem: (lineId: string) => Promise<void>
  updateQty: (lineId: string, qty: number) => Promise<void>
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const CART_ID_KEY = 'ralph-cart-id'

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_ID_KEY)
    if (!stored) return

    fetch(`/api/cart/${stored}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.id) {
          setCart(data as ShopifyCart)
        } else {
          // Cart expired — clear localStorage
          localStorage.removeItem(CART_ID_KEY)
        }
      })
      .catch(() => {
        localStorage.removeItem(CART_ID_KEY)
      })
  }, [])

  const ensureCart = useCallback(async (variantId?: string): Promise<ShopifyCart | null> => {
    if (cart) return cart

    const res = await fetch('/api/cart/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId }),
    })

    if (!res.ok) return null
    const newCart = (await res.json()) as ShopifyCart
    localStorage.setItem(CART_ID_KEY, newCart.id)
    setCart(newCart)
    return newCart
  }, [cart])

  const addItem = useCallback(
    async (variantId: string, qty = 1) => {
      setIsLoading(true)
      try {
        if (!cart) {
          await ensureCart(variantId)
          return
        }

        const res = await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: cart.id, variantId, quantity: qty }),
        })

        if (res.ok) {
          const updated = (await res.json()) as ShopifyCart
          setCart(updated)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [cart, ensureCart]
  )

  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cart) return
      setIsLoading(true)
      try {
        const res = await fetch('/api/cart/remove', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: cart.id, lineIds: [lineId] }),
        })
        if (res.ok) {
          const updated = (await res.json()) as ShopifyCart
          setCart(updated)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [cart]
  )

  const updateQty = useCallback(
    async (lineId: string, qty: number) => {
      if (!cart) return
      setIsLoading(true)
      try {
        const res = await fetch('/api/cart/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: cart.id, lineId, quantity: qty }),
        })
        if (res.ok) {
          const updated = (await res.json()) as ShopifyCart
          setCart(updated)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [cart]
  )

  const itemCount = cart?.totalQuantity ?? 0

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        itemCount,
        isLoading,
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
