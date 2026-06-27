'use client'

import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { MenuProvider } from '@/context/MenuContext'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <MenuProvider>{children}</MenuProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
