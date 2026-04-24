'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ShopifyCart } from '@/lib/shopify/types'
import { safeGet, safeSet, safeRemove } from '@/lib/safe-storage'

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
const CART_TOKEN_KEY = 'ralph-cart-token'

// Cart created by /api/cart/create returns the HMAC token alongside the
// Shopify cart payload. Strip it before storing in React state so the
// rest of the app keeps seeing a plain ShopifyCart.
interface CartCreateResponse extends ShopifyCart {
  token?: string
}

function clearCartStorage() {
  safeRemove(CART_ID_KEY)
  safeRemove(CART_TOKEN_KEY)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // Token lives in a ref (not state) because the mutation callbacks don't
  // need to re-render when it changes — they just need the latest value.
  const tokenRef = useRef<string | null>(null)

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedId = safeGet(CART_ID_KEY)
    const storedToken = safeGet(CART_TOKEN_KEY)
    if (!storedId || !storedToken) {
      clearCartStorage()
      return
    }
    tokenRef.current = storedToken

    fetch(`/api/cart/${storedId}?token=${encodeURIComponent(storedToken)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.id) {
          setCart(data as ShopifyCart)
        } else {
          // Cart expired or token rejected — reset.
          tokenRef.current = null
          clearCartStorage()
        }
      })
      .catch(() => {
        tokenRef.current = null
        clearCartStorage()
      })
  }, [])

  const ensureCart = useCallback(
    async (variantId?: string): Promise<ShopifyCart | null> => {
      if (cart) return cart

      const res = await fetch('/api/cart/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId }),
      })

      if (!res.ok) return null
      const payload = (await res.json()) as CartCreateResponse
      if (!payload.token) return null
      tokenRef.current = payload.token
      safeSet(CART_ID_KEY, payload.id)
      safeSet(CART_TOKEN_KEY, payload.token)
      const { token: _, ...newCart } = payload
      void _
      setCart(newCart as ShopifyCart)
      return newCart as ShopifyCart
    },
    [cart]
  )

  const addItem = useCallback(
    async (variantId: string, qty = 1) => {
      setIsLoading(true)
      try {
        if (!cart || !tokenRef.current) {
          await ensureCart(variantId)
          return
        }

        const res = await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: cart.id,
            variantId,
            quantity: qty,
            token: tokenRef.current,
          }),
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
      if (!cart || !tokenRef.current) return
      setIsLoading(true)
      try {
        const res = await fetch('/api/cart/remove', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: cart.id,
            lineIds: [lineId],
            token: tokenRef.current,
          }),
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
      if (!cart || !tokenRef.current) return
      setIsLoading(true)
      try {
        const res = await fetch('/api/cart/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: cart.id,
            lineId,
            quantity: qty,
            token: tokenRef.current,
          }),
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
