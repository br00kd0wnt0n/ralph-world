'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import ThemeToggle from './ThemeToggle'
import LanguageModal from './LanguageModal'
import MobileMenu from './MobileMenu'
import SubscribeModal from './SubscribeModal'

const NAV_ITEMS = [
  { label: 'Ralph TV', href: '/tv', color: 'bg-ralph-yellow', underline: { src: '/imgs/underline_tv.svg', w: 144, h: 12 } },
  { label: 'Magazine', href: '/magazine', color: 'bg-ralph-orange', underline: { src: '/imgs/underline_magazine.svg', w: 142, h: 10 } },
  { label: 'Events', href: '/events', color: 'bg-ralph-blue', underline: { src: '/imgs/underline_events.svg', w: 148, h: 14 } },
  { label: 'Lab', href: '/lab', color: 'bg-ralph-purple', underline: { src: '/imgs/underline_lab.svg', w: 73, h: 12 } },
  { label: 'Shop', href: '/shop', color: 'bg-ralph-green', underline: { src: '/imgs/underline_shop.svg', w: 148, h: 14 } },
]

function CartIcon({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative text-primary hover:text-ralph-pink transition-colors"
      aria-label="Cart"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[9px] text-primary font-medium">
        {count}
      </span>
    </button>
  )
}

// Persist nav state across route changes
const navState = { fixed: false, progress: 0, locked: false }

export default function Nav() {
  const pathname = usePathname()
  const { user, tier } = useAuth()
  const { itemCount, openCart } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(navState.progress)
  const [navFixed, setNavFixed] = useState(navState.fixed)
  const isFirstLoad = useRef(true)
  const prevPathname = useRef(pathname)

  // Handle route changes
  useEffect(() => {
    if (isFirstLoad.current) {
      // First load - check actual scroll position
      isFirstLoad.current = false
      const scrollY = window.scrollY
      const progress = Math.min(1, scrollY / 16)
      const fixed = scrollY >= 98
      setScrollProgress(progress)
      setNavFixed(fixed)
      navState.progress = progress
      navState.fixed = fixed
    } else if (pathname !== prevPathname.current) {
      // Route changed - lock the nav in current state
      // Only unlock after user scrolls down 200px
      if (navState.fixed) {
        navState.locked = true
      }
      setScrollProgress(navState.progress)
      setNavFixed(navState.fixed)
    }
    prevPathname.current = pathname
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY

      // If nav is locked (after navigation with fixed nav),
      // only unlock after scrolling down past 200px
      if (navState.locked) {
        if (scrollY >= 200) {
          navState.locked = false
        } else {
          return // Stay locked, don't update nav
        }
      }

      // Progress from 0 to 1 over the first 16px of scroll
      const progress = Math.min(1, scrollY / 16)
      setScrollProgress(progress)
      navState.progress = progress

      // Nav becomes fixed when it reaches the header button level (top: 16px)
      // Nav starts at: 16px padding + 98px logo = 114px
      // Fixed at top: 16px, so fix when scrollY >= 114 - 16 = 98px
      // Hysteresis: fix at 98px going down, unfix at 70px going up to prevent glitchy toggling
      const fixThreshold = 98
      const unfixThreshold = 70
      const currentlyFixed = navState.fixed
      const fixed = currentlyFixed
        ? scrollY >= unfixThreshold  // Once fixed, stay fixed until below unfix threshold
        : scrollY >= fixThreshold     // When not fixed, only fix when above fix threshold
      setNavFixed(fixed)
      navState.fixed = fixed
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Derived animation values
  const circleLogoScale = scrollProgress
  // Subscribe button: starts at 24px from edge, ends at 24px + 44px logo + 24px gap = 92px
  // Parent has px-6 (24px), so marginLeft goes from 0 to 68px
  const buttonMargin = scrollProgress * 68

  return (
    <>
      {/* ── Utility Bar (desktop) ── */}
      <div
        className="hidden min-[1200px]:flex items-center justify-between px-4 min-[420px]:px-6 md:px-16 text-xs fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: 77 }}
      >
        {/* Stepped blur background - 11 strips of 7px each with decreasing blur.
            pointer-events: none so clicks pass through to the main nav below it. */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            opacity: navFixed ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
          }}
        >
          {Array.from({ length: 11 }, (_, i) => {
            const blurAmount = 12 - (i * 1.2) // 12px to ~0px
            const opacity = 0.5 - (i * 0.045) // 0.5 to ~0
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: i * 7,
                  left: 0,
                  right: 0,
                  height: 7,
                  backdropFilter: `blur(${blurAmount}px)`,
                  WebkitBackdropFilter: `blur(${blurAmount}px)`,
                  backgroundColor: `rgba(0, 0, 0, ${opacity})`,
                }}
              />
            )
          })}
        </div>
        {/* Left: ralph world circle logo + Subscribe + Login */}
        <div className="flex items-center pointer-events-auto">
          {pathname === '/' ? (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="ralph-circle-logo absolute text-black hover:text-ralph-pink"
              aria-label="Scroll to top"
              style={{
                left: 24,
                top: '50%',
                transform: `translateY(-50%) scale(${circleLogoScale})`,
                opacity: circleLogoScale,
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out, color 0.15s ease-out',
                transformOrigin: 'center',
              }}
            >
              <svg width="43" height="43" viewBox="0 0 43 43" fill="none">
                <g clipPath="url(#ralph-logo-clip)">
                  <circle cx="21.5" cy="21.5" r="21.5" fill="#E3E3DB" />
                  <path
                    d="M11.3884 16.56C11.2412 16.2982 10.8157 16.3227 10.5376 16.3882C7.96053 16.9854 6.31612 20.446 6.25886 20.4542C6.2834 20.4542 6.21795 20.4869 6.20977 20.4624C6.07887 20.1106 5.89889 19.8079 5.85798 19.7097C5.61255 19.1452 4.70444 18.8507 4.16449 19.1534C4.00905 19.2434 3.95996 19.3334 4.03359 19.5215C4.23812 19.996 6.38975 26.77 6.87244 28.0954C7.10151 28.7253 7.98507 29.1098 8.60684 28.8644C8.81955 28.7826 8.9259 28.6598 8.82773 28.4062C8.63138 27.9072 8.4514 27.4 8.26323 26.8927C8.19778 26.7209 8.14051 26.5491 8.08325 26.3855C7.55965 24.8883 7.49421 22.5649 7.96053 21.0514C8.07507 20.6914 8.21414 20.3315 8.37777 19.996C9.01589 18.6952 9.90764 17.6644 11.2166 17.0181C11.4539 16.9036 11.4702 16.7236 11.3802 16.56"
                    fill="currentColor"
                  />
                  <path
                    d="M35.7026 19.5868C36.2099 19.1859 36.758 18.9241 37.437 19.0305C38.4188 19.1859 39.1878 20.2577 38.9424 21.223C38.2879 23.7837 36.848 26.0826 39.3432 28.3161C39.4332 28.3897 39.4905 28.4961 39.5068 28.6106C39.5968 29.3878 37.9361 28.5206 37.707 28.3815C37.0852 28.0216 36.5289 27.498 36.2835 26.8026C35.8744 25.6327 36.1853 24.4219 36.5944 23.3011C36.8234 22.6875 37.7315 20.9285 36.9625 20.5031C36.2426 20.1022 33.7064 24.5691 33.2483 26.2463C33.1828 26.4917 33.1256 26.7453 33.0683 26.9907C33.0192 27.2116 32.8883 27.2853 32.6674 27.2116C32.0784 27.0153 31.1703 26.3035 31.293 25.6981C31.5303 24.5609 31.972 22.8184 32.242 21.6894C32.9619 18.646 33.7228 15.6353 33.2156 12.4856C33.1174 11.8638 33.8619 11.8229 34.1073 12.2402C34.7373 13.3201 34.8682 14.6209 34.8109 15.8726C34.7209 17.6479 34.5654 19.4641 34.0991 21.174C34.0173 21.4685 33.9437 21.7712 33.8619 22.0657C34.0337 21.7957 35.0481 20.1268 35.7108 19.595"
                    fill="currentColor"
                  />
                  <path
                    d="M30.6549 18.2609C29.8531 16.6738 28.1351 16.4611 27.0388 17.8437C26.6216 18.3755 25.8198 20.2162 25.7217 20.5107C25.7135 20.1999 25.7298 19.889 25.7544 19.5863C25.7707 19.2754 25.7871 18.9727 25.8116 18.6618C25.8689 17.95 25.2062 17.2546 24.4945 17.2792C24.2654 17.2792 24.1672 17.3937 24.1754 17.631C24.1836 17.8355 24.1754 18.1709 24.1509 18.3755C24.0527 19.7008 24.0609 20.7153 23.9382 22.057C23.8645 22.8178 23.3246 23.9059 22.4492 23.865C21.672 23.8241 21.2629 23.0878 21.0911 22.3924C21.4347 21.2634 21.6393 19.9953 21.8847 18.76C21.9092 18.6209 22.441 14.6367 22.5965 12.7796C22.7274 11.1515 23.2264 6.85643 20.5675 7.00369C19.1031 7.08551 18.7186 9.02443 18.5304 10.1698C18.2686 11.7406 18.3423 13.3441 18.4077 14.9312C18.4568 16.0684 18.5304 17.2056 18.6859 18.3346C18.8741 19.7663 19.1768 22.2533 19.2013 22.4006C19.2013 22.4006 19.0049 23.8405 18.1132 23.9386C16.5015 24.1104 16.0597 20.4862 15.9288 19.7663C15.8634 19.4308 15.6425 19.3245 15.3398 19.4799C14.6935 19.8235 14.7262 20.5189 14.7099 21.157C14.6935 21.8524 14.7262 22.556 14.5544 23.235C14.3499 24.0204 13.5072 24.7813 12.7218 24.1513C12.3128 23.8241 12.1492 23.2841 12.1001 22.7605C12.0183 21.967 12.0183 21.1652 12.3701 20.4535C12.7873 19.6108 13.45 18.94 14.3908 18.7436C14.6935 18.6782 14.9962 18.6536 15.2989 18.6209C15.4789 18.6045 15.847 18.6209 15.8061 18.3427C15.7816 18.1791 15.5525 18.0728 15.4134 18.0237C15.1762 17.95 14.9144 17.9419 14.6608 17.9337C14.1863 17.9337 13.7036 18.0237 13.2536 18.1791C12.4928 18.4409 11.7892 18.9072 11.2983 19.5454C11.0856 19.8235 10.9138 20.1344 10.7993 20.4616C10.3984 21.6806 10.4475 22.8996 10.8156 24.1104C11.0365 24.8304 11.3556 25.4849 11.9528 25.9757C12.6728 26.5648 13.5236 26.622 14.2517 26.1475C15.2907 25.4685 15.438 24.2168 15.5525 23.7914C15.5852 23.8568 15.6261 23.9223 15.6752 23.9959C16.2152 24.7895 17.156 25.8203 18.2032 25.8039C19.2095 25.7876 19.7167 24.8304 19.9376 24.3804C20.4285 25.3294 21.1239 25.9103 22.1874 25.763C22.8664 25.6648 23.251 25.3376 23.7173 24.9531C23.6109 26.0984 23.0137 31.4571 22.9401 32.3734C22.8664 33.2897 23.39 34.1487 24.2736 34.2796C24.5927 34.3287 24.7317 34.0423 24.7399 33.7723C24.7972 32.3079 25.2635 26.5893 25.3208 25.1167C25.3208 25.0349 25.3126 25.0185 25.3453 25.0104C25.3862 25.0349 25.5008 25.1249 25.5417 25.1576C26.5889 25.9757 27.6933 26.0085 28.7569 25.2067C29.8613 24.3722 30.4912 23.2187 30.8676 21.9097C31.2194 20.6744 31.2521 19.4472 30.6549 18.2691M20.4285 19.4799C20.4285 19.4799 20.0767 16.4693 20.0685 14.9557C20.0521 12.9759 20.1012 10.8079 20.3057 9.67074C20.363 9.35168 20.363 9.26987 20.4612 8.97535C20.5103 8.82809 20.5757 8.68901 20.6657 8.68083C21.0257 8.66446 20.993 10.6443 20.993 11.1433C21.0011 14.3831 20.7066 17.8682 20.4366 19.4799M29.2068 19.9953C29.1577 21.2961 28.8387 22.4415 28.1924 23.5787C27.9796 23.9468 27.6442 24.2904 27.1861 24.225C26.8097 24.1759 26.5152 23.865 26.4089 23.5132C26.1389 22.646 26.8425 20.6089 27.0879 20.028C27.3252 19.4636 27.7424 18.6782 28.3069 18.3836C29.3214 17.8519 29.2314 19.4226 29.2068 20.0035"
                    fill="currentColor"
                  />
                </g>
                <defs>
                  <clipPath id="ralph-logo-clip">
                    <rect width="43" height="43" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </button>
          ) : (
            <Link
              href="/"
              className="ralph-circle-logo absolute text-black hover:text-ralph-pink"
              aria-label="ralph world"
              style={{
                left: 24,
                top: '50%',
                transform: `translateY(-50%) scale(${circleLogoScale})`,
                opacity: circleLogoScale,
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out, color 0.15s ease-out',
                transformOrigin: 'center',
              }}
            >
              <svg width="43" height="43" viewBox="0 0 43 43" fill="none">
                <g clipPath="url(#ralph-logo-clip)">
                  <circle cx="21.5" cy="21.5" r="21.5" fill="#E3E3DB" />
                  <path
                    d="M11.3884 16.56C11.2412 16.2982 10.8157 16.3227 10.5376 16.3882C7.96053 16.9854 6.31612 20.446 6.25886 20.4542C6.2834 20.4542 6.21795 20.4869 6.20977 20.4624C6.07887 20.1106 5.89889 19.8079 5.85798 19.7097C5.61255 19.1452 4.70444 18.8507 4.16449 19.1534C4.00905 19.2434 3.95996 19.3334 4.03359 19.5215C4.23812 19.996 6.38975 26.77 6.87244 28.0954C7.10151 28.7253 7.98507 29.1098 8.60684 28.8644C8.81955 28.7826 8.9259 28.6598 8.82773 28.4062C8.63138 27.9072 8.4514 27.4 8.26323 26.8927C8.19778 26.7209 8.14051 26.5491 8.08325 26.3855C7.55965 24.8883 7.49421 22.5649 7.96053 21.0514C8.07507 20.6914 8.21414 20.3315 8.37777 19.996C9.01589 18.6952 9.90764 17.6644 11.2166 17.0181C11.4539 16.9036 11.4702 16.7236 11.3802 16.56"
                    fill="currentColor"
                  />
                  <path
                    d="M35.7026 19.5868C36.2099 19.1859 36.758 18.9241 37.437 19.0305C38.4188 19.1859 39.1878 20.2577 38.9424 21.223C38.2879 23.7837 36.848 26.0826 39.3432 28.3161C39.4332 28.3897 39.4905 28.4961 39.5068 28.6106C39.5968 29.3878 37.9361 28.5206 37.707 28.3815C37.0852 28.0216 36.5289 27.498 36.2835 26.8026C35.8744 25.6327 36.1853 24.4219 36.5944 23.3011C36.8234 22.6875 37.7315 20.9285 36.9625 20.5031C36.2426 20.1022 33.7064 24.5691 33.2483 26.2463C33.1828 26.4917 33.1256 26.7453 33.0683 26.9907C33.0192 27.2116 32.8883 27.2853 32.6674 27.2116C32.0784 27.0153 31.1703 26.3035 31.293 25.6981C31.5303 24.5609 31.972 22.8184 32.242 21.6894C32.9619 18.646 33.7228 15.6353 33.2156 12.4856C33.1174 11.8638 33.8619 11.8229 34.1073 12.2402C34.7373 13.3201 34.8682 14.6209 34.8109 15.8726C34.7209 17.6479 34.5654 19.4641 34.0991 21.174C34.0173 21.4685 33.9437 21.7712 33.8619 22.0657C34.0337 21.7957 35.0481 20.1268 35.7108 19.595"
                    fill="currentColor"
                  />
                  <path
                    d="M30.6549 18.2609C29.8531 16.6738 28.1351 16.4611 27.0388 17.8437C26.6216 18.3755 25.8198 20.2162 25.7217 20.5107C25.7135 20.1999 25.7298 19.889 25.7544 19.5863C25.7707 19.2754 25.7871 18.9727 25.8116 18.6618C25.8689 17.95 25.2062 17.2546 24.4945 17.2792C24.2654 17.2792 24.1672 17.3937 24.1754 17.631C24.1836 17.8355 24.1754 18.1709 24.1509 18.3755C24.0527 19.7008 24.0609 20.7153 23.9382 22.057C23.8645 22.8178 23.3246 23.9059 22.4492 23.865C21.672 23.8241 21.2629 23.0878 21.0911 22.3924C21.4347 21.2634 21.6393 19.9953 21.8847 18.76C21.9092 18.6209 22.441 14.6367 22.5965 12.7796C22.7274 11.1515 23.2264 6.85643 20.5675 7.00369C19.1031 7.08551 18.7186 9.02443 18.5304 10.1698C18.2686 11.7406 18.3423 13.3441 18.4077 14.9312C18.4568 16.0684 18.5304 17.2056 18.6859 18.3346C18.8741 19.7663 19.1768 22.2533 19.2013 22.4006C19.2013 22.4006 19.0049 23.8405 18.1132 23.9386C16.5015 24.1104 16.0597 20.4862 15.9288 19.7663C15.8634 19.4308 15.6425 19.3245 15.3398 19.4799C14.6935 19.8235 14.7262 20.5189 14.7099 21.157C14.6935 21.8524 14.7262 22.556 14.5544 23.235C14.3499 24.0204 13.5072 24.7813 12.7218 24.1513C12.3128 23.8241 12.1492 23.2841 12.1001 22.7605C12.0183 21.967 12.0183 21.1652 12.3701 20.4535C12.7873 19.6108 13.45 18.94 14.3908 18.7436C14.6935 18.6782 14.9962 18.6536 15.2989 18.6209C15.4789 18.6045 15.847 18.6209 15.8061 18.3427C15.7816 18.1791 15.5525 18.0728 15.4134 18.0237C15.1762 17.95 14.9144 17.9419 14.6608 17.9337C14.1863 17.9337 13.7036 18.0237 13.2536 18.1791C12.4928 18.4409 11.7892 18.9072 11.2983 19.5454C11.0856 19.8235 10.9138 20.1344 10.7993 20.4616C10.3984 21.6806 10.4475 22.8996 10.8156 24.1104C11.0365 24.8304 11.3556 25.4849 11.9528 25.9757C12.6728 26.5648 13.5236 26.622 14.2517 26.1475C15.2907 25.4685 15.438 24.2168 15.5525 23.7914C15.5852 23.8568 15.6261 23.9223 15.6752 23.9959C16.2152 24.7895 17.156 25.8203 18.2032 25.8039C19.2095 25.7876 19.7167 24.8304 19.9376 24.3804C20.4285 25.3294 21.1239 25.9103 22.1874 25.763C22.8664 25.6648 23.251 25.3376 23.7173 24.9531C23.6109 26.0984 23.0137 31.4571 22.9401 32.3734C22.8664 33.2897 23.39 34.1487 24.2736 34.2796C24.5927 34.3287 24.7317 34.0423 24.7399 33.7723C24.7972 32.3079 25.2635 26.5893 25.3208 25.1167C25.3208 25.0349 25.3126 25.0185 25.3453 25.0104C25.3862 25.0349 25.5008 25.1249 25.5417 25.1576C26.5889 25.9757 27.6933 26.0085 28.7569 25.2067C29.8613 24.3722 30.4912 23.2187 30.8676 21.9097C31.2194 20.6744 31.2521 19.4472 30.6549 18.2691M20.4285 19.4799C20.4285 19.4799 20.0767 16.4693 20.0685 14.9557C20.0521 12.9759 20.1012 10.8079 20.3057 9.67074C20.363 9.35168 20.363 9.26987 20.4612 8.97535C20.5103 8.82809 20.5757 8.68901 20.6657 8.68083C21.0257 8.66446 20.993 10.6443 20.993 11.1433C21.0011 14.3831 20.7066 17.8682 20.4366 19.4799M29.2068 19.9953C29.1577 21.2961 28.8387 22.4415 28.1924 23.5787C27.9796 23.9468 27.6442 24.2904 27.1861 24.225C26.8097 24.1759 26.5152 23.865 26.4089 23.5132C26.1389 22.646 26.8425 20.6089 27.0879 20.028C27.3252 19.4636 27.7424 18.6782 28.3069 18.3836C29.3214 17.8519 29.2314 19.4226 29.2068 20.0035"
                    fill="currentColor"
                  />
                </g>
                <defs>
                  <clipPath id="ralph-logo-clip">
                    <rect width="43" height="43" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </Link>
          )}
          {!user && (
            <>
              <Link
                href="/join-ralph"
                className={`subscribe-btn text-header-btn border-2 border-white text-white px-4 flex items-center justify-center ${
                  pathname === '/join-ralph' ? 'bg-ralph-pink' : 'bg-transparent hover:bg-ralph-pink'
                }`}
                style={{
                  borderRadius: 22,
                  '--subscribe-margin': `${buttonMargin}px`,
                  marginLeft: buttonMargin,
                  transition: 'margin-left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s',
                } as React.CSSProperties}
              >
                Subscribe to Ralph
              </Link>
              <Link
                href="/login"
                className="text-header-btn border-2 border-white text-white px-4 ml-6 mid:ml-4 transition-colors flex items-center justify-center bg-transparent hover:bg-ralph-pink"
                style={{ borderRadius: 22 }}
              >
                Log in
              </Link>
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-6 mid:gap-4 pointer-events-auto">
          <Link
            href="/work-with-us"
            className={`text-header-btn border-2 border-white text-white px-4 transition-colors flex items-center justify-center ${
              pathname === '/work-with-us' ? 'bg-ralph-pink' : 'bg-transparent hover:bg-ralph-pink'
            }`}
            style={{ borderRadius: 22 }}
          >
            Work with us
          </Link>
          <ThemeToggle />
          {user ? (
            <Link
              href="/account"
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-ralph-pink text-white text-sm font-bold"
            >
              {user.email?.[0]?.toUpperCase() ?? 'R'}
              {tier === 'paid' && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-ralph-green border-2 border-surface" />
              )}
            </Link>
          ) : (
            <LanguageModal />
          )}
          <button
            onClick={openCart}
            className="basket-btn relative flex items-center justify-center transition-colors hover:opacity-80"
            style={{ borderRadius: 8 }}
            aria-label="Shopping basket"
          >
            <img
              src="/imgs/icon_shopping_basket.svg"
              alt=""
              aria-hidden="true"
              style={{ height: 44, width: 'auto' }}
            />
            <span className="basket-count absolute left-1/2 -translate-x-1/2 text-white font-bold">
              {itemCount}
            </span>
          </button>
        </div>
      </div>

      {/* ── Main Nav Bar ── */}
      <nav className="relative z-[70] pointer-events-none">
        {/* Desktop */}
        <div
          className="hidden min-[1200px]:flex flex-col items-center"
          style={{
            paddingTop: navFixed ? 0 : 16,
            paddingBottom: navFixed ? 0 : 32,
            transition: 'padding 0.3s ease-out',
          }}
        >
          {/* Logo - hidden when nav is fixed */}
          <Link
            href="/"
            className="pointer-events-auto"
            style={{
              opacity: navFixed ? 0 : 1,
              transform: navFixed ? 'translateY(-100%)' : 'translateY(0)',
              transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
              pointerEvents: navFixed ? 'none' : 'auto',
            }}
          >
            <Image
              src="/ralph-wordmark.png"
              alt="ralph"
              width={200}
              height={98}
              style={{ height: 98, width: 'auto' }}
              priority
            />
          </Link>

          {/* Nav items - becomes fixed when scrolled to header button level */}
          <div
            className={`nav-items-container flex items-center justify-center w-full pointer-events-none ${
              navFixed ? 'fixed left-0 right-0' : ''
            }`}
            style={{
              height: 44,
              gap: navFixed ? 32 : 70,
              top: navFixed ? 16 : 'auto',
              zIndex: 60,
              transition: 'gap 0.3s ease-out',
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`pointer-events-auto relative text-nav-link transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-ralph-pink hover:text-primary'
                  }`}
                  style={{
                    fontSize: navFixed ? '20px' : undefined,
                    transition: 'font-size 0.3s ease-out',
                  }}
                >
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <img
                      src={item.underline.src}
                      alt=""
                      aria-hidden="true"
                      className="absolute pointer-events-none -translate-x-1/2 z-0"
                      style={{
                        left: '50%',
                        top: '50%',
                        width: item.underline.w,
                        height: item.underline.h,
                        maxWidth: navFixed ? '130%' : 'none',
                        transition: 'max-width 0.3s ease-out',
                      }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
          {/* Spacer to prevent content jump when nav becomes fixed */}
          {navFixed && <div style={{ height: 44 }} aria-hidden="true" />}
        </div>

        {/* Mobile */}
        <div className="min-[1200px]:hidden">
          {/* Mobile utility bar - fixed */}
          <div
            className="pointer-events-auto fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 min-[420px]:px-6 md:px-16"
            style={{
              height: 60,
              background: navFixed
                ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%)'
                : 'transparent',
              backdropFilter: navFixed ? 'blur(12px)' : 'none',
              WebkitBackdropFilter: navFixed ? 'blur(12px)' : 'none',
              transition: 'background 0.3s ease-out, backdrop-filter 0.3s ease-out',
            }}
          >
            {/* Left: burger + circle logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="text-primary"
                aria-label="Open menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              {pathname === '/' ? (
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-black hover:text-ralph-pink"
                  aria-label="Scroll to top"
                  style={{
                    transform: `scale(${circleLogoScale})`,
                    opacity: circleLogoScale,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
                    transformOrigin: 'center',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 43 43" fill="none">
                    <g clipPath="url(#ralph-logo-clip-mobile)">
                      <circle cx="21.5" cy="21.5" r="21.5" fill="#E3E3DB" />
                      <path d="M11.3884 16.56C11.2412 16.2982 10.8157 16.3227 10.5376 16.3882C7.96053 16.9854 6.31612 20.446 6.25886 20.4542C6.2834 20.4542 6.21795 20.4869 6.20977 20.4624C6.07887 20.1106 5.89889 19.8079 5.85798 19.7097C5.61255 19.1452 4.70444 18.8507 4.16449 19.1534C4.00905 19.2434 3.95996 19.3334 4.03359 19.5215C4.23812 19.996 6.38975 26.77 6.87244 28.0954C7.10151 28.7253 7.98507 29.1098 8.60684 28.8644C8.81955 28.7826 8.9259 28.6598 8.82773 28.4062C8.63138 27.9072 8.4514 27.4 8.26323 26.8927C8.19778 26.7209 8.14051 26.5491 8.08325 26.3855C7.55965 24.8883 7.49421 22.5649 7.96053 21.0514C8.07507 20.6914 8.21414 20.3315 8.37777 19.996C9.01589 18.6952 9.90764 17.6644 11.2166 17.0181C11.4539 16.9036 11.4702 16.7236 11.3802 16.56" fill="currentColor" />
                      <path d="M35.7026 19.5868C36.2099 19.1859 36.758 18.9241 37.437 19.0305C38.4188 19.1859 39.1878 20.2577 38.9424 21.223C38.2879 23.7837 36.848 26.0826 39.3432 28.3161C39.4332 28.3897 39.4905 28.4961 39.5068 28.6106C39.5968 29.3878 37.9361 28.5206 37.707 28.3815C37.0852 28.0216 36.5289 27.498 36.2835 26.8026C35.8744 25.6327 36.1853 24.4219 36.5944 23.3011C36.8234 22.6875 37.7315 20.9285 36.9625 20.5031C36.2426 20.1022 33.7064 24.5691 33.2483 26.2463C33.1828 26.4917 33.1256 26.7453 33.0683 26.9907C33.0192 27.2116 32.8883 27.2853 32.6674 27.2116C32.0784 27.0153 31.1703 26.3035 31.293 25.6981C31.5303 24.5609 31.972 22.8184 32.242 21.6894C32.9619 18.646 33.7228 15.6353 33.2156 12.4856C33.1174 11.8638 33.8619 11.8229 34.1073 12.2402C34.7373 13.3201 34.8682 14.6209 34.8109 15.8726C34.7209 17.6479 34.5654 19.4641 34.0991 21.174C34.0173 21.4685 33.9437 21.7712 33.8619 22.0657C34.0337 21.7957 35.0481 20.1268 35.7108 19.595" fill="currentColor" />
                      <path d="M30.6549 18.2609C29.8531 16.6738 28.1351 16.4611 27.0388 17.8437C26.6216 18.3755 25.8198 20.2162 25.7217 20.5107C25.7135 20.1999 25.7298 19.889 25.7544 19.5863C25.7707 19.2754 25.7871 18.9727 25.8116 18.6618C25.8689 17.95 25.2062 17.2546 24.4945 17.2792C24.2654 17.2792 24.1672 17.3937 24.1754 17.631C24.1836 17.8355 24.1754 18.1709 24.1509 18.3755C24.0527 19.7008 24.0609 20.7153 23.9382 22.057C23.8645 22.8178 23.3246 23.9059 22.4492 23.865C21.672 23.8241 21.2629 23.0878 21.0911 22.3924C21.4347 21.2634 21.6393 19.9953 21.8847 18.76C21.9092 18.6209 22.441 14.6367 22.5965 12.7796C22.7274 11.1515 23.2264 6.85643 20.5675 7.00369C19.1031 7.08551 18.7186 9.02443 18.5304 10.1698C18.2686 11.7406 18.3423 13.3441 18.4077 14.9312C18.4568 16.0684 18.5304 17.2056 18.6859 18.3346C18.8741 19.7663 19.1768 22.2533 19.2013 22.4006C19.2013 22.4006 19.0049 23.8405 18.1132 23.9386C16.5015 24.1104 16.0597 20.4862 15.9288 19.7663C15.8634 19.4308 15.6425 19.3245 15.3398 19.4799C14.6935 19.8235 14.7262 20.5189 14.7099 21.157C14.6935 21.8524 14.7262 22.556 14.5544 23.235C14.3499 24.0204 13.5072 24.7813 12.7218 24.1513C12.3128 23.8241 12.1492 23.2841 12.1001 22.7605C12.0183 21.967 12.0183 21.1652 12.3701 20.4535C12.7873 19.6108 13.45 18.94 14.3908 18.7436C14.6935 18.6782 14.9962 18.6536 15.2989 18.6209C15.4789 18.6045 15.847 18.6209 15.8061 18.3427C15.7816 18.1791 15.5525 18.0728 15.4134 18.0237C15.1762 17.95 14.9144 17.9419 14.6608 17.9337C14.1863 17.9337 13.7036 18.0237 13.2536 18.1791C12.4928 18.4409 11.7892 18.9072 11.2983 19.5454C11.0856 19.8235 10.9138 20.1344 10.7993 20.4616C10.3984 21.6806 10.4475 22.8996 10.8156 24.1104C11.0365 24.8304 11.3556 25.4849 11.9528 25.9757C12.6728 26.5648 13.5236 26.622 14.2517 26.1475C15.2907 25.4685 15.438 24.2168 15.5525 23.7914C15.5852 23.8568 15.6261 23.9223 15.6752 23.9959C16.2152 24.7895 17.156 25.8203 18.2032 25.8039C19.2095 25.7876 19.7167 24.8304 19.9376 24.3804C20.4285 25.3294 21.1239 25.9103 22.1874 25.763C22.8664 25.6648 23.251 25.3376 23.7173 24.9531C23.6109 26.0984 23.0137 31.4571 22.9401 32.3734C22.8664 33.2897 23.39 34.1487 24.2736 34.2796C24.5927 34.3287 24.7317 34.0423 24.7399 33.7723C24.7972 32.3079 25.2635 26.5893 25.3208 25.1167C25.3208 25.0349 25.3126 25.0185 25.3453 25.0104C25.3862 25.0349 25.5008 25.1249 25.5417 25.1576C26.5889 25.9757 27.6933 26.0085 28.7569 25.2067C29.8613 24.3722 30.4912 23.2187 30.8676 21.9097C31.2194 20.6744 31.2521 19.4472 30.6549 18.2691M20.4285 19.4799C20.4285 19.4799 20.0767 16.4693 20.0685 14.9557C20.0521 12.9759 20.1012 10.8079 20.3057 9.67074C20.363 9.35168 20.363 9.26987 20.4612 8.97535C20.5103 8.82809 20.5757 8.68901 20.6657 8.68083C21.0257 8.66446 20.993 10.6443 20.993 11.1433C21.0011 14.3831 20.7066 17.8682 20.4366 19.4799M29.2068 19.9953C29.1577 21.2961 28.8387 22.4415 28.1924 23.5787C27.9796 23.9468 27.6442 24.2904 27.1861 24.225C26.8097 24.1759 26.5152 23.865 26.4089 23.5132C26.1389 22.646 26.8425 20.6089 27.0879 20.028C27.3252 19.4636 27.7424 18.6782 28.3069 18.3836C29.3214 17.8519 29.2314 19.4226 29.2068 20.0035" fill="currentColor" />
                    </g>
                    <defs>
                      <clipPath id="ralph-logo-clip-mobile">
                        <rect width="43" height="43" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </button>
              ) : (
                <Link
                  href="/"
                  className="text-black hover:text-ralph-pink"
                  aria-label="ralph world"
                  style={{
                    transform: `scale(${circleLogoScale})`,
                    opacity: circleLogoScale,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
                    transformOrigin: 'center',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 43 43" fill="none">
                    <g clipPath="url(#ralph-logo-clip-mobile2)">
                      <circle cx="21.5" cy="21.5" r="21.5" fill="#E3E3DB" />
                      <path d="M11.3884 16.56C11.2412 16.2982 10.8157 16.3227 10.5376 16.3882C7.96053 16.9854 6.31612 20.446 6.25886 20.4542C6.2834 20.4542 6.21795 20.4869 6.20977 20.4624C6.07887 20.1106 5.89889 19.8079 5.85798 19.7097C5.61255 19.1452 4.70444 18.8507 4.16449 19.1534C4.00905 19.2434 3.95996 19.3334 4.03359 19.5215C4.23812 19.996 6.38975 26.77 6.87244 28.0954C7.10151 28.7253 7.98507 29.1098 8.60684 28.8644C8.81955 28.7826 8.9259 28.6598 8.82773 28.4062C8.63138 27.9072 8.4514 27.4 8.26323 26.8927C8.19778 26.7209 8.14051 26.5491 8.08325 26.3855C7.55965 24.8883 7.49421 22.5649 7.96053 21.0514C8.07507 20.6914 8.21414 20.3315 8.37777 19.996C9.01589 18.6952 9.90764 17.6644 11.2166 17.0181C11.4539 16.9036 11.4702 16.7236 11.3802 16.56" fill="currentColor" />
                      <path d="M35.7026 19.5868C36.2099 19.1859 36.758 18.9241 37.437 19.0305C38.4188 19.1859 39.1878 20.2577 38.9424 21.223C38.2879 23.7837 36.848 26.0826 39.3432 28.3161C39.4332 28.3897 39.4905 28.4961 39.5068 28.6106C39.5968 29.3878 37.9361 28.5206 37.707 28.3815C37.0852 28.0216 36.5289 27.498 36.2835 26.8026C35.8744 25.6327 36.1853 24.4219 36.5944 23.3011C36.8234 22.6875 37.7315 20.9285 36.9625 20.5031C36.2426 20.1022 33.7064 24.5691 33.2483 26.2463C33.1828 26.4917 33.1256 26.7453 33.0683 26.9907C33.0192 27.2116 32.8883 27.2853 32.6674 27.2116C32.0784 27.0153 31.1703 26.3035 31.293 25.6981C31.5303 24.5609 31.972 22.8184 32.242 21.6894C32.9619 18.646 33.7228 15.6353 33.2156 12.4856C33.1174 11.8638 33.8619 11.8229 34.1073 12.2402C34.7373 13.3201 34.8682 14.6209 34.8109 15.8726C34.7209 17.6479 34.5654 19.4641 34.0991 21.174C34.0173 21.4685 33.9437 21.7712 33.8619 22.0657C34.0337 21.7957 35.0481 20.1268 35.7108 19.595" fill="currentColor" />
                      <path d="M30.6549 18.2609C29.8531 16.6738 28.1351 16.4611 27.0388 17.8437C26.6216 18.3755 25.8198 20.2162 25.7217 20.5107C25.7135 20.1999 25.7298 19.889 25.7544 19.5863C25.7707 19.2754 25.7871 18.9727 25.8116 18.6618C25.8689 17.95 25.2062 17.2546 24.4945 17.2792C24.2654 17.2792 24.1672 17.3937 24.1754 17.631C24.1836 17.8355 24.1754 18.1709 24.1509 18.3755C24.0527 19.7008 24.0609 20.7153 23.9382 22.057C23.8645 22.8178 23.3246 23.9059 22.4492 23.865C21.672 23.8241 21.2629 23.0878 21.0911 22.3924C21.4347 21.2634 21.6393 19.9953 21.8847 18.76C21.9092 18.6209 22.441 14.6367 22.5965 12.7796C22.7274 11.1515 23.2264 6.85643 20.5675 7.00369C19.1031 7.08551 18.7186 9.02443 18.5304 10.1698C18.2686 11.7406 18.3423 13.3441 18.4077 14.9312C18.4568 16.0684 18.5304 17.2056 18.6859 18.3346C18.8741 19.7663 19.1768 22.2533 19.2013 22.4006C19.2013 22.4006 19.0049 23.8405 18.1132 23.9386C16.5015 24.1104 16.0597 20.4862 15.9288 19.7663C15.8634 19.4308 15.6425 19.3245 15.3398 19.4799C14.6935 19.8235 14.7262 20.5189 14.7099 21.157C14.6935 21.8524 14.7262 22.556 14.5544 23.235C14.3499 24.0204 13.5072 24.7813 12.7218 24.1513C12.3128 23.8241 12.1492 23.2841 12.1001 22.7605C12.0183 21.967 12.0183 21.1652 12.3701 20.4535C12.7873 19.6108 13.45 18.94 14.3908 18.7436C14.6935 18.6782 14.9962 18.6536 15.2989 18.6209C15.4789 18.6045 15.847 18.6209 15.8061 18.3427C15.7816 18.1791 15.5525 18.0728 15.4134 18.0237C15.1762 17.95 14.9144 17.9419 14.6608 17.9337C14.1863 17.9337 13.7036 18.0237 13.2536 18.1791C12.4928 18.4409 11.7892 18.9072 11.2983 19.5454C11.0856 19.8235 10.9138 20.1344 10.7993 20.4616C10.3984 21.6806 10.4475 22.8996 10.8156 24.1104C11.0365 24.8304 11.3556 25.4849 11.9528 25.9757C12.6728 26.5648 13.5236 26.622 14.2517 26.1475C15.2907 25.4685 15.438 24.2168 15.5525 23.7914C15.5852 23.8568 15.6261 23.9223 15.6752 23.9959C16.2152 24.7895 17.156 25.8203 18.2032 25.8039C19.2095 25.7876 19.7167 24.8304 19.9376 24.3804C20.4285 25.3294 21.1239 25.9103 22.1874 25.763C22.8664 25.6648 23.251 25.3376 23.7173 24.9531C23.6109 26.0984 23.0137 31.4571 22.9401 32.3734C22.8664 33.2897 23.39 34.1487 24.2736 34.2796C24.5927 34.3287 24.7317 34.0423 24.7399 33.7723C24.7972 32.3079 25.2635 26.5893 25.3208 25.1167C25.3208 25.0349 25.3126 25.0185 25.3453 25.0104C25.3862 25.0349 25.5008 25.1249 25.5417 25.1576C26.5889 25.9757 27.6933 26.0085 28.7569 25.2067C29.8613 24.3722 30.4912 23.2187 30.8676 21.9097C31.2194 20.6744 31.2521 19.4472 30.6549 18.2691M20.4285 19.4799C20.4285 19.4799 20.0767 16.4693 20.0685 14.9557C20.0521 12.9759 20.1012 10.8079 20.3057 9.67074C20.363 9.35168 20.363 9.26987 20.4612 8.97535C20.5103 8.82809 20.5757 8.68901 20.6657 8.68083C21.0257 8.66446 20.993 10.6443 20.993 11.1433C21.0011 14.3831 20.7066 17.8682 20.4366 19.4799M29.2068 19.9953C29.1577 21.2961 28.8387 22.4415 28.1924 23.5787C27.9796 23.9468 27.6442 24.2904 27.1861 24.225C26.8097 24.1759 26.5152 23.865 26.4089 23.5132C26.1389 22.646 26.8425 20.6089 27.0879 20.028C27.3252 19.4636 27.7424 18.6782 28.3069 18.3836C29.3214 17.8519 29.2314 19.4226 29.2068 20.0035" fill="currentColor" />
                    </g>
                    <defs>
                      <clipPath id="ralph-logo-clip-mobile2">
                        <rect width="43" height="43" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </Link>
              )}
            </div>

            {/* Right: basket */}
            <button
              onClick={openCart}
              className="basket-btn relative flex items-center justify-center transition-colors hover:opacity-80"
              aria-label="Shopping basket"
            >
              <img
                src="/imgs/icon_shopping_basket.svg"
                alt=""
                aria-hidden="true"
                style={{ height: 32, width: 'auto' }}
              />
              <span className="absolute left-1/2 -translate-x-1/2 text-[10px] text-white font-bold" style={{ top: 14 }}>
                {itemCount}
              </span>
            </button>
          </div>

          {/* Mobile logo + nav */}
          <div
            className="flex flex-col items-center"
            style={{
              paddingTop: navFixed ? 0 : 24,
              paddingBottom: navFixed ? 0 : 32,
              transition: 'padding 0.3s ease-out',
            }}
          >
            <Link
              href="/"
              className="mb-4 pointer-events-auto"
              style={{
                opacity: navFixed ? 0 : 1,
                transform: navFixed ? 'translateY(-100%)' : 'translateY(0)',
                transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                pointerEvents: navFixed ? 'none' : 'auto',
              }}
            >
              <Image
                src="/ralph-wordmark.png"
                alt="ralph"
                width={200}
                height={98}
                style={{ height: 98, width: 'auto' }}
                priority
              />
            </Link>

            {/* Nav items - hidden on <767px, becomes fixed when scrolled */}
            <div
              className={`hidden min-[767px]:flex items-center justify-center w-full ${
                navFixed ? 'fixed left-0 right-0' : ''
              }`}
              style={{
                height: 44,
                gap: navFixed ? 32 : 48,
                top: navFixed ? 8 : 'auto',
                zIndex: 60,
                transition: 'gap 0.3s ease-out',
              }}
            >
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`pointer-events-auto relative text-nav-link transition-colors ${
                      isActive
                        ? 'text-primary'
                        : 'text-ralph-pink hover:text-primary'
                    }`}
                    style={{
                      fontSize: navFixed ? '20px' : undefined,
                      transition: 'font-size 0.3s ease-out',
                    }}
                  >
                    <span className="relative z-10">{item.label}</span>
                    {isActive && (
                      <img
                        src={item.underline.src}
                        alt=""
                        aria-hidden="true"
                        className="absolute pointer-events-none -translate-x-1/2 z-0"
                        style={{
                          left: '50%',
                          top: '50%',
                          width: item.underline.w,
                          height: item.underline.h,
                          maxWidth: navFixed ? '130%' : 'none',
                          transition: 'max-width 0.3s ease-out',
                        }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
            {navFixed && <div className="hidden min-[767px]:block" style={{ height: 44 }} aria-hidden="true" />}
          </div>
        </div>
      </nav>

      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSubscribe={() => setSubscribeOpen(true)}
      />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </>
  )
}
