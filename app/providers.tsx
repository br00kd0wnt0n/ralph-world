'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { MenuProvider } from '@/context/MenuContext'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user" makes every framer-motion animation on the site
    // honour the OS "reduce motion" setting (disables transform/layout motion,
    // keeps opacity) — covers the 31 framer files in one place, incl. the
    // MobileMenu decorative floats.
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <MenuProvider>{children}</MenuProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
