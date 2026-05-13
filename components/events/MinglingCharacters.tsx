'use client'

import { useEffect, useRef } from 'react'

const CHARACTERS = [
  '/imgs/event_character_01.png',
  '/imgs/event_character_02.png',
  '/imgs/event_character_03.png',
  '/imgs/event_character_04.png',
  '/imgs/event_character_05.png',
  '/imgs/event_character_06.png',
  '/imgs/event_character_07.png',
  '/imgs/event_character_08.png',
]

const ARM_COLORS = [
  '/imgs/blue_arm.svg',
  '/imgs/green_arm.svg',
  '/imgs/orange_arm.svg',
  '/imgs/pink_arm.svg',
]

interface CharacterState {
  x: number
  direction: 1 | -1
  speed: number
  baseY: number
  bobOffset: number
  bobSpeed: number
}

interface MinglingCharactersProps {
  eventCount?: number
}

/**
 * Animated characters mingling across the screen like guests at a social event.
 * Each character moves slowly left/right with slight randomness.
 * Arms stick up from the crowd representing active events.
 */
export default function MinglingCharacters({ eventCount = 0 }: MinglingCharactersProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const statesRef = useRef<CharacterState[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Get the inner wrappers (not the scaled images)
    const wrappers = container.querySelectorAll('[data-character-wrapper]')
    const containerWidth = container.offsetWidth

    // Initialize character states with random positions and speeds
    statesRef.current = CHARACTERS.map((_, i) => ({
      x: (containerWidth / CHARACTERS.length) * i + Math.random() * 100 - 50,
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: 0.15 + Math.random() * 0.2, // 0.15-0.35 px per frame (half speed)
      baseY: 100, // Push characters down 100px (clipped by overflow-hidden)
      bobOffset: Math.random() * Math.PI * 2, // Random start phase for bobbing
      bobSpeed: 0.08 + Math.random() * 0.06, // Fast bob speed
    }))

    let lastTime = 0
    const targetFps = 30
    const frameInterval = 1000 / targetFps

    const animate = (time: number) => {
      if (time - lastTime < frameInterval) {
        rafRef.current = requestAnimationFrame(animate)
        return
      }
      lastTime = time

      const states = statesRef.current
      const width = container.offsetWidth

      wrappers.forEach((wrapper, i) => {
        const el = wrapper as HTMLElement
        const state = states[i]

        // Move character horizontally
        state.x += state.speed * state.direction

        // Update bob offset for smooth up/down motion
        state.bobOffset += state.bobSpeed
        const bobY = Math.sin(state.bobOffset) * 6 // 6px up/down bob

        // Wrap around edges (characters are ~60px wide at half size)
        const charWidth = 80
        if (state.direction === 1 && state.x > width + charWidth) {
          // Exited right, appear on left
          state.x = -charWidth
        } else if (state.direction === -1 && state.x < -charWidth) {
          // Exited left, appear on right
          state.x = width + charWidth
        }

        // Apply transform - flip character based on direction, add bobbing
        const scaleX = state.direction === -1 ? -1 : 1
        const totalY = state.baseY + bobY
        el.style.transform = `translateX(${state.x}px) translateY(${totalY}px) scaleX(${scaleX})`
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Generate arm positions evenly distributed across the width
  const arms = Array.from({ length: eventCount }, (_, i) => ({
    src: ARM_COLORS[i % ARM_COLORS.length],
    // Position evenly: first arm at ~10%, last arm at ~90%
    left: eventCount === 1 ? 50 : 10 + (80 / (eventCount - 1)) * i,
    height: 500 + (i * 17) % 50, // 500-550px, deterministic variation
  }))

  return (
    <div
      className="relative"
      style={{ height: 400, width: '100%' }}
      aria-hidden="true"
    >
      {/* Arms sticking up from the crowd */}
      {arms.map((arm, i) => (
        <div
          key={`arm-${i}`}
          className="absolute z-20"
          style={{
            bottom: -50,
            left: `${arm.left}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <img
            src={arm.src}
            alt=""
            className="pointer-events-none"
            style={{
              height: arm.height,
              width: 'auto',
            }}
          />
        </div>
      ))}

      {/* Character container - absolutely positioned at bottom */}
      <div
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0 overflow-hidden z-10"
        style={{ height: 400 }}
      >
        {CHARACTERS.map((src, i) => (
          <div
            key={i}
            data-character-wrapper
            className="absolute bottom-0"
            style={{ willChange: 'transform' }}
          >
            <img
              src={src}
              alt=""
              className="pointer-events-none"
              style={{
                height: 'auto',
                width: 'auto',
                transform: 'scale(0.5)',
                transformOrigin: 'bottom left',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
