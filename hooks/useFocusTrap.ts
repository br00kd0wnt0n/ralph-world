'use client'

import { useEffect, useRef } from 'react'

// Focus trap for modals and overlays. While `active` is true:
//  - focus moves into the container on mount (first focusable element)
//  - Tab / Shift-Tab wrap at the boundary so keyboard users stay in the
//    modal instead of escaping to the background
//  - on close (or component unmount), focus restores to whatever had it
//    before the modal opened
//
// Used by SubscribeModal, ArticleOverlay, CartDrawer, EventFlyout (full).
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function getFocusable(): HTMLElement[] {
      if (!container) return []
      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => el.offsetParent !== null)
    }

    // Move initial focus to the first focusable element.
    const initial = getFocusable()[0]
    if (initial) initial.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeEl = document.activeElement as HTMLElement

      if (e.shiftKey) {
        if (activeEl === first || !container!.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (activeEl === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restore focus to whatever had it before the modal opened.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [active])

  return containerRef
}
