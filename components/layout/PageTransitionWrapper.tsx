'use client'

import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { usePathname } from 'next/navigation'
import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useMenu } from '@/context/MenuContext'

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

  // Skip the fade when navigating from the slide-in menu (so the new page is
  // ready before the panel slides it in) OR when the user requests reduced
  // motion — both become an instant cut. In-site links otherwise keep the fade.
  const instant = instantNav || prefersReducedMotion
  const pageVariants: Variants = {
    initial: { opacity: instant ? 1 : 0 },
    animate: {
      opacity: 1,
      transition: { duration: instant ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      opacity: instant ? 1 : 0,
      transition: { duration: instant ? 0 : 0.35, ease: [0.4, 0, 1, 1] },
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
