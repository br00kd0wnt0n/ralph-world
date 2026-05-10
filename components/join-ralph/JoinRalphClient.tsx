'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sectionPageVariants } from '@/lib/animation/page-transitions'

const SLIDES = [
  { id: 1, columns: 2 },
  { id: 2, columns: 1 },
  { id: 3, columns: 1 },
  { id: 4, columns: 1 },
]

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
}

export default function JoinRalphClient() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)

  const goToNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1)
      setCurrentSlide((prev) => prev + 1)
    }
  }

  const goToPrev = () => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide((prev) => prev - 1)
    }
  }

  const slide = SLIDES[currentSlide]

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Planet + white bg layered with content */}
      <section className="relative">
        {/* Background container - planet at top, white bg fills rest */}
        <div className="absolute inset-0 z-0">
          {/* Planet - fixed height at the top of the bg container */}
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
              style={{
                backgroundImage: 'url(/imgs/planet_background_creative.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_creative.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          {/* White bg fills below the planet */}
          <div
            className="absolute bg-white"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </div>

        {/* Content layer */}
        <div
          className="relative z-10 pb-16 min-h-[60vh]"
          style={{ paddingTop: 200 }}
        >
          <div className="max-w-5xl mx-auto px-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.4, ease: 'easeInOut' }}
              >
                {slide.columns === 2 ? (
                  /* Slide 1: Two columns */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-100 p-8 rounded-lg">
                      <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Gooper Trial', serif" }}>
                        Welcome to Ralph
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Join our community and get access to exclusive content, events, and more.
                      </p>
                    </div>
                    <div className="bg-gray-100 p-8 rounded-lg">
                      <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Gooper Trial', serif" }}>
                        Choose Your Plan
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Select the membership that works best for you.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Slides 2-4: Single column centered */
                  <div className="max-w-xl mx-auto">
                    <div className="bg-gray-100 p-8 rounded-lg text-center">
                      <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Gooper Trial', serif" }}>
                        Step {currentSlide + 1}
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Placeholder content for slide {currentSlide + 1}. This will be replaced with actual content.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex justify-center gap-4 mt-8">
              {currentSlide > 0 && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'black',
                      pointerEvents: 'none',
                    }}
                  />
                  <button
                    onClick={goToPrev}
                    className="btn-press flex items-center justify-center"
                    style={{
                      position: 'relative',
                      height: 38,
                      paddingLeft: 24,
                      paddingRight: 24,
                      backgroundColor: '#EBEBEB',
                      border: '2px solid black',
                      fontFamily: "'Gooper Trial', serif",
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    Back
                  </button>
                </div>
              )}
              {currentSlide < SLIDES.length - 1 && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'black',
                      pointerEvents: 'none',
                    }}
                  />
                  <button
                    onClick={goToNext}
                    className="btn-press flex items-center justify-center"
                    style={{
                      position: 'relative',
                      height: 38,
                      paddingLeft: 24,
                      paddingRight: 24,
                      backgroundColor: '#EBEBEB',
                      border: '2px solid black',
                      fontFamily: "'Gooper Trial', serif",
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mt-6">
              {SLIDES.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-black' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  )
}
