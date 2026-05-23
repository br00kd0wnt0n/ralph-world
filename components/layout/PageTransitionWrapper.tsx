'use client'

import { motion, AnimatePresence, type Variants } from 'framer-motion'
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

const pageVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.35,
      ease: [0.4, 0, 1, 1],
    },
  },
}

interface PageTransitionWrapperProps {
  children: ReactNode
}

export default function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const pathname = usePathname()
  const [isExiting, setIsExiting] = useState(false)
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
          >
            <FrozenRouter>{children}</FrozenRouter>
          </motion.div>
        </AnimatePresence>
      </div>
    </TransitionContext.Provider>
  )
}
