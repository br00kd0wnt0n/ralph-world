'use client'

import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useMenu } from '@/context/MenuContext'
import { shouldRecoverPop } from '@/lib/overlay-history'

// Context to let children know if we're exiting
interface TransitionContextValue {
  isExiting: boolean
}

const TransitionContext = createContext<TransitionContextValue>({ isExiting: false })

export function useTransitionState() {
  return useContext(TransitionContext)
}

// Freeze the children while animating out
function FrozenRouter({ children }: { children: ReactNode }) {
  const context = useContext(LayoutRouterContext)
  const frozen = useRef(context).current

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  )
}

interface PageTransitionWrapperProps {
  children: ReactNode
}

export default function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const pathname = usePathname()
  const { instantNav, setInstantNav } = useMenu()
  const [isExiting, setIsExiting] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const router = useRouter()

  // The magazine/shop/events overlays write URLs behind Next's back (see
  // lib/overlay-history.ts), and Next ignores those entries on Back/Forward.
  // If one belongs to a different page than the one on screen (the reader
  // left via a link), render it via the router. router.replace also stamps
  // Next's state onto the entry, so later Back/Forward through it is native.
  const pathnameRef = useRef(pathname)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const { pathname: target, search, hash } = window.location
      if (shouldRecoverPop(event.state, target, pathnameRef.current)) {
        router.replace(target + search + hash)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [router])

  // Skip the fade when navigating from the slide-in menu (so the new page is
  // ready before the panel slides it in) OR when the user requests reduced
  // motion — both become an instant cut. In-site links otherwise keep the fade.
  const instant = instantNav || prefersReducedMotion
  // Navigating INTO /space-invaders slides the outgoing page fully out to the
  // left (a "launch" transition) rather than the usual fade.
  const goingToInvaders = pathname === '/space-invaders'
  const pageVariants: Variants = {
    initial: { opacity: instant ? 1 : 0, x: 0 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: instant ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      opacity: instant ? 1 : 0,
      x: !instant && goingToInvaders ? '-100%' : 0,
      transition: {
        duration: instant ? 0 : goingToInvaders ? 0.5 : 0.35,
        ease: [0.4, 0, 1, 1],
      },
    },
  }
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined)
  const contentRef = useRef<HTMLDivElement>(null)

  const captureHeight = useCallback(() => {
    if (contentRef.current) {
      setMinHeight(contentRef.current.offsetHeight)
    }
  }, [])

  const clearHeight = useCallback(() => {
    setMinHeight(undefined)
  }, [])

  return (
    <TransitionContext.Provider value={{ isExiting }}>
      <div style={{ minHeight: minHeight ? `${minHeight}px` : undefined }}>
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={() => {
            setIsExiting(false)
            clearHeight()
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
          }}
        >
          <motion.div
            ref={contentRef}
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onAnimationStart={(definition) => {
              if (definition === 'exit') {
                captureHeight()
                setIsExiting(true)
              }
            }}
            onAnimationComplete={(definition) => {
              // One-shot: clear the instant flag after the (instant) enter so
              // the next in-site navigation gets the normal fade again.
              if (definition === 'animate' && instantNav) setInstantNav(false)
            }}
          >
            <FrozenRouter>{children}</FrozenRouter>
          </motion.div>
        </AnimatePresence>
      </div>
    </TransitionContext.Provider>
  )
}
