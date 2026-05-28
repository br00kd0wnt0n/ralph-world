'use client'

import { ReactNode, RefObject, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

interface PinkDropdownProps {
  width: number
  // How far the dropdown extends past the trigger's right edge.
  // Negative pushes the dropdown's right edge past the trigger's right edge
  // (e.g. right={-33} means the dropdown's right edge sits 33px past the
  // trigger.right). The notch is always 50px in from the dropdown's right
  // edge — set `right` so the notch points at the desired spot on the trigger.
  right: number
  // The element whose rect determines where the dropdown is positioned
  // (usually the trigger button's outer wrapper).
  triggerRef: RefObject<HTMLElement | null>
  // Optional ref forwarded onto the panel so callers can include the
  // portalled dropdown in their click-outside checks.
  panelRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
}

// Spring pop-in with a touch of wobble.
export const panelVariants = {
  hidden: { opacity: 0, scale: 0.7, rotate: -2 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 22 },
  },
}

// Wrap items in a motion.div with this variant to stagger them.
// staggerChildren only affects direct motion children, so this needs to
// sit immediately around the items.
export const stackVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

export const panelItemVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0 },
}

export default function PinkDropdown({
  width,
  right,
  triggerRef,
  panelRef,
  children,
}: PinkDropdownProps) {
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function update() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      // Right edge of the dropdown sits at trigger.right - right.
      // (right={-33} → dropdown.right edge = trigger.right + 33)
      const rightEdge = rect.right - right
      setPos({
        top: rect.bottom + 12, // 12 = previous marginTop
        left: rightEdge - width,
      })
    }
    update()
    // capture-phase scroll listener catches scrolling inside any ancestor.
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [triggerRef, right, width])

  if (!mounted || !pos) return null

  return createPortal(
    <motion.div
      ref={panelRef}
      initial="hidden"
      animate="visible"
      variants={panelVariants}
      className="fixed z-[100]"
      style={{
        top: pos.top,
        left: pos.left,
        width,
        transformOrigin: 'top right',
      }}
    >
      {/* Pink notch — sits behind the panel by DOM order, tip pokes above.
          69 = 50px visible from card right edge + 19px wrapper offset */}
      <div
        className="absolute bg-ralph-pink"
        style={{
          width: 12,
          height: 12,
          top: -6,
          right: 69,
          transform: 'rotate(45deg)',
        }}
        aria-hidden="true"
      />
      {/* Pink wrapper provides the solid offset on right + bottom,
          with 45° angled cuts at top-right and bottom-left */}
      <div
        className="bg-ralph-pink"
        style={{
          paddingRight: 19,
          paddingBottom: 19,
          clipPath:
            'polygon(0 0, calc(100% - 19px) 0, 100% 19px, 100% 100%, 19px 100%, 0 calc(100% - 19px))',
        }}
      >
        <div
          className="bg-white"
          style={{
            border: '3px solid #EA128B',
            padding: '16px 16px 16px 1.5rem',
          }}
        >
          {children}
        </div>
      </div>
    </motion.div>,
    document.body,
  )
}
