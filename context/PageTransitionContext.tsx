'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionContextValue {
  isExiting: boolean
  pathname: string
}

const PageTransitionContext = createContext<PageTransitionContextValue>({
  isExiting: false,
  pathname: '/',
})

export function usePageTransition() {
  return useContext(PageTransitionContext)
}

interface PageTransitionProviderProps {
  children: ReactNode
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()
  const previousPathRef = useRef(pathname)

  // Scroll to top on route change
  useEffect(() => {
    if (pathname !== previousPathRef.current) {
      previousPathRef.current = pathname
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [pathname])

  return (
    <PageTransitionContext.Provider value={{ isExiting: false, pathname }}>
      {children}
    </PageTransitionContext.Provider>
  )
}
