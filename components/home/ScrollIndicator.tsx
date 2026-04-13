'use client'

import { useEffect, useState } from 'react'

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
      className={`animate-bounce text-muted text-sm tracking-widest uppercase transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      SCROLL
      <div className="mt-1 text-center">&darr;</div>
    </div>
  )
}
