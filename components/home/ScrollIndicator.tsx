'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function ScrollIndicator() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY < 50)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`flex flex-col items-center gap-3 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <motion.img
        src="/imgs/scroll-arrow.svg"
        alt=""
        aria-hidden="true"
        style={{ width: 34, height: 'auto' }}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span
        className="text-ralph-pink text-xs tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-body), Arial, sans-serif', fontWeight: 700 }}
      >
        SCROLL
      </span>
    </div>
  )
}
