'use client'

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'

type FooterSlide = 'find' | 'contact'

interface MenuContextValue {
  /** Is the full-screen mobile/burger menu open? */
  open: boolean
  setOpen: (open: boolean) => void
  /** A request to open the footer's expanding panel on a given slide. The
      `n` nonce changes on every call so the Footer re-reacts to repeats. */
  footerRequest: { slide: FooterSlide; n: number } | null
  /** Close the menu and ask the footer to expand to the given slide. */
  openFooterPanel: (slide: FooterSlide) => void
  /** One-shot flag: skip the page-transition fade for the next navigation
      (set when navigating from the menu, so the new page is ready before the
      panel slides it in). The transition resets it once it has run. */
  instantNav: boolean
  setInstantNav: (v: boolean) => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [footerRequest, setFooterRequest] = useState<MenuContextValue['footerRequest']>(null)
  const [instantNav, setInstantNav] = useState(false)

  const openFooterPanel = useCallback((slide: FooterSlide) => {
    setOpen(false)
    setFooterRequest((r) => ({ slide, n: (r?.n ?? 0) + 1 }))
  }, [])

  const value = useMemo(
    () => ({ open, setOpen, footerRequest, openFooterPanel, instantNav, setInstantNav }),
    [open, footerRequest, openFooterPanel, instantNav],
  )
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error('useMenu must be used within a MenuProvider')
  return ctx
}
