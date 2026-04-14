'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

const NAV_ITEMS = [
  { label: 'Ralph TV', href: '/tv' },
  { label: 'Magazine', href: '/magazine' },
  { label: 'Events', href: '/events' },
  { label: 'Lab', href: '/lab' },
  { label: 'Shop', href: '/shop' },
]

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  onSubscribe: () => void
}

export default function MobileMenu({
  isOpen,
  onClose,
  onSubscribe,
}: MobileMenuProps) {
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-end p-4">
        <button
          onClick={onClose}
          className="text-white text-2xl"
          aria-label="Close menu"
        >
          &#10005;
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="mb-8">
          <Image
            src="/ralph-logo.png"
            alt="ralph world"
            width={100}
            height={100}
            className="rounded-full"
          />
        </div>

        <nav className="flex flex-col items-center gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="text-2xl font-bold text-white hover:text-ralph-pink transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 w-48 border-t border-white/20" />

        <div className="mt-6 flex flex-col items-center gap-3">
          {user ? (
            <Link
              href="/account"
              onClick={onClose}
              className="text-lg text-white hover:text-ralph-pink transition-colors"
            >
              Your account
            </Link>
          ) : (
            <button
              onClick={() => {
                onClose()
                onSubscribe()
              }}
              className="text-lg text-white hover:text-ralph-pink transition-colors"
            >
              Sign up
            </button>
          )}
        </div>

        <div className="mt-6 flex gap-4 text-sm text-secondary">
          <button className="hover:text-primary transition-colors">
            English
          </button>
          <span className="text-border">|</span>
          <button className="hover:text-primary transition-colors">
            日本語
          </button>
        </div>
      </div>
    </div>
  )
}
