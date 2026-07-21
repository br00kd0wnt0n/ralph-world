'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { SiteCopy } from '@/lib/data/site-copy'

/**
 * Site copy carried through React context so client components deep in
 * the tree (SubscribeModal, cookie banner, etc.) can read the same
 * CMS-editable values the server layout has already fetched — without
 * threading it through every intermediate component as a prop.
 *
 * The root layout wraps its children in <SiteCopyProvider value={copy} />
 * once per request. Consumers read via useSiteCopy().
 *
 * Falls back to an empty object if a consumer somehow sits outside the
 * provider (should never happen in practice) so calls don't crash —
 * template code should always default individual keys.
 */
const SiteCopyContext = createContext<Partial<SiteCopy>>({})

export function SiteCopyProvider({
  value,
  children,
}: {
  value: Partial<SiteCopy>
  children: ReactNode
}) {
  return (
    <SiteCopyContext.Provider value={value}>
      {children}
    </SiteCopyContext.Provider>
  )
}

/** Read the current site copy inside a client component. */
export function useSiteCopy(): Partial<SiteCopy> {
  return useContext(SiteCopyContext)
}
