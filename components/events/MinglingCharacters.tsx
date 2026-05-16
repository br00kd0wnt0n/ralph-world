'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'

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

interface Event {
  slug: string
  title?: string | null
  descriptionShort?: string | null
  eventDate?: Date | null
  locationName?: string | null
  accentColour?: string | null
}

interface MinglingCharactersProps {
  events?: Event[]
}

/**
 * Animated characters mingling across the screen like guests at a social event.
 * Each character moves slowly left/right with slight randomness.
 * Arms stick up from the crowd representing active events.
 */
export default function MinglingCharacters({ events = [] }: MinglingCharactersProps) {
  const eventCount = events.length
  const containerRef = useRef<HTMLDivElement>(null)
  const statesRef = useRef<CharacterState[]>([])
  const rafRef = useRef<number>(0)
  const [activeArm, setActiveArm] = useState<number | null>(null)

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

  // Format date for display
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-GB', {
      month: 'long',
      day: 'numeric',
    })
  }

  // Generate arm data
  const arms = Array.from({ length: eventCount }, (_, i) => {
    const event = events[i]
    return {
      src: ARM_COLORS[i % ARM_COLORS.length],
      // Default position evenly: first arm at ~15%, last arm at ~85%
      defaultLeft: eventCount === 1 ? 50 : 15 + (70 / (eventCount - 1)) * i,
      height: 500 + (i * 17) % 50, // 500-550px, deterministic variation
      // Random slight rotation for panel (-8 to 8 degrees), deterministic per arm
      panelRotation: ((i * 7 + 3) % 17) - 8,
      // Event data
      slug: event?.slug || '',
      title: event?.title || 'Untitled Event',
      description: event?.descriptionShort || '',
      date: formatDate(event?.eventDate),
      location: event?.locationName || '',
      accentColour: event?.accentColour || null,
    }
  })

  // Calculate arm positions based on active state
  // When clicked: clicked arm + arms on same side bunch together, arms on opposite side stay in place
  // Left-side arm clicked: clicked arm + arms to its right bunch RIGHT, arms to left STAY
  // Right-side arm clicked: clicked arm + arms to its left bunch LEFT, arms to right STAY
  const getArmPosition = (armIndex: number) => {
    if (activeArm === null) {
      // No active arm - return default position
      return {
        left: arms[armIndex].defaultLeft,
        bunchDirection: null as 'left' | 'right' | null,
      }
    }

    const midpoint = eventCount / 2
    const clickedArmIsOnLeft = activeArm < midpoint

    // Check if clicked arm is a middle arm (indices 1 or 2 with 4 arms)
    const isMiddleArm = activeArm === 1 || activeArm === 2

    if (clickedArmIsOnLeft) {
      // Clicked arm is on left side
      if (armIndex >= activeArm) {
        // Clicked arm + arms to its right bunch RIGHT
        const armsGoingRight = eventCount - activeArm
        const positionInBunch = armIndex - activeArm
        // Middle arms go to 50%, edge arms go to 40%
        const startPos = isMiddleArm ? 50 : 40
        const bunchedLeft =
          armsGoingRight === 1
            ? startPos + 10
            : startPos + (40 / Math.max(1, armsGoingRight - 1)) * positionInBunch
        return {
          left: bunchedLeft,
          bunchDirection: 'right' as const,
        }
      } else {
        // Arms to the left of clicked arm STAY in place
        return {
          left: arms[armIndex].defaultLeft,
          bunchDirection: null as 'left' | 'right' | null,
        }
      }
    } else {
      // Clicked arm is on right side
      if (armIndex <= activeArm) {
        // Clicked arm + arms to its left bunch LEFT
        const armsGoingLeft = activeArm + 1
        const positionInBunch = armIndex
        // Middle arms: clicked arm goes to 50%, edge arms go to 60%
        const endPos = isMiddleArm ? 50 : 60
        const startPos = endPos - 40
        const bunchedLeft =
          armsGoingLeft === 1
            ? endPos - 10
            : startPos + (40 / Math.max(1, armsGoingLeft - 1)) * positionInBunch
        return {
          left: bunchedLeft,
          bunchDirection: 'left' as const,
        }
      } else {
        // Arms to the right of clicked arm STAY in place
        return {
          left: arms[armIndex].defaultLeft,
          bunchDirection: null as 'left' | 'right' | null,
        }
      }
    }
  }

  const isAnyActive = activeArm !== null

  const handleArmClick = (index: number) => {
    setActiveArm(index)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering arm click
    setActiveArm(null)
  }

  return (
    <div
      className="relative"
      style={{ height: 500, width: '100%' }}
      aria-hidden="true"
    >
      {/* Panels layer - outside clipped area so they can overflow */}
      {arms.map((arm, i) => {
        const { left, bunchDirection } = getArmPosition(i)
        const isActive = activeArm === i
        const panelOnRight = bunchDirection === 'right' || (bunchDirection === null && i < eventCount / 2)

        return (
          <div
            key={`panel-${i}`}
            className="absolute z-[15] transition-all duration-500 ease-out pointer-events-none"
            style={{
              bottom: -100 + arm.height - 150, // Align with arm top + panel offset
              left: `${left}%`,
              // Offset to position over the hand - hands are at edges of arm images
              transform: panelOnRight ? 'translateX(-80%)' : 'translateX(-20%)',
            }}
          >
            {/* Panel */}
            <div
              className={`transition-all duration-500 ease-out ${
                isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0'
              }`}
              style={{
                width: 388,
                height: 276,
                borderRadius: 12,
                position: 'relative',
                backgroundColor: arm.accentColour || 'var(--color-ralph-green)',
                transform: isActive
                  ? `scale(1) rotate(${arm.panelRotation}deg)`
                  : `scale(0) rotate(${panelOnRight ? 100 : -100}deg)`,
                transformOrigin: panelOnRight ? 'bottom right' : 'bottom left',
              }}
            >
              {/* Close button */}
              <div
                className={`absolute top-4 z-10 ${panelOnRight ? 'right-4' : 'left-4'}`}
                style={{ position: 'absolute' }}
              >
                {/* Shadow */}
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    width: 32,
                    height: 32,
                    backgroundColor: 'black',
                    pointerEvents: 'none',
                  }}
                />
                {/* Button */}
                <button
                  onClick={handleClose}
                  className="btn-press relative flex items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: 'white',
                    border: '2px solid black',
                    cursor: 'pointer',
                  }}
                  aria-label="Close"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="1" y1="1" x2="11" y2="11" />
                    <line x1="11" y1="1" x2="1" y2="11" />
                  </svg>
                </button>
              </div>

              {/* Event content */}
              <div className={`p-6 flex flex-col h-full text-black ${panelOnRight ? '' : 'text-right items-end'}`}>
                {/* Title */}
                <h3
                  style={{
                    fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                    fontWeight: 600,
                    fontSize: 24,
                    lineHeight: '100%',
                    letterSpacing: 0,
                    marginBottom: 12,
                    paddingRight: panelOnRight ? 32 : 0,
                    paddingLeft: panelOnRight ? 0 : 32,
                  }}
                >
                  {arm.title}
                </h3>

                {/* Description */}
                {arm.description && (
                  <p
                    className="text-body-sm"
                    style={{ marginBottom: 12, opacity: 0.8 }}
                  >
                    {arm.description}
                  </p>
                )}

                {/* Date & Location */}
                {(arm.date || arm.location) && (
                  <p
                    style={{
                      fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: '18px',
                      letterSpacing: 0,
                      marginBottom: 16,
                    }}
                  >
                    {arm.date}{arm.date && arm.location ? ' - ' : ''}{arm.location}
                  </p>
                )}

                {/* Show me more button */}
                <div className="mt-auto">
                  <Button href={`/events/${arm.slug}`} label="Show me more" />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Arms container - clip only vertically to hide arm bases, allow horizontal overflow */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          overflowX: 'visible',
          overflowY: 'clip',
        }}
      >
        {arms.map((arm, i) => {
          const { left } = getArmPosition(i)

          return (
            <div
              key={`arm-${i}`}
              className={`group absolute z-20 cursor-pointer pointer-events-auto transition-all duration-500 ease-out ${
                isAnyActive ? '' : 'animate-wave'
              }`}
              style={{
                bottom: -100,
                left: `${left}%`,
                transform: 'translateX(-50%)',
                transformOrigin: 'bottom center',
                animationDelay: `${(i * 0.7) % 2}s`,
                animationDuration: `${1.8 + (i % 4) * 0.3}s`,
                animationPlayState: isAnyActive ? 'paused' : 'running',
              }}
              onClick={() => handleArmClick(i)}
            >
              <img
                src={arm.src}
                alt=""
                draggable={false}
                className="max-w-none select-none transition-[filter] duration-300 group-hover:[filter:drop-shadow(4px_0_0_#000)_drop-shadow(-4px_0_0_#000)_drop-shadow(0_4px_0_#000)_drop-shadow(0_-4px_0_#000)]"
                style={{
                  height: arm.height,
                  width: 'auto',
                  transformOrigin: 'bottom center',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Character container - absolutely positioned at bottom */}
      <div
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0 overflow-hidden z-10"
        style={{ height: 500 }}
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
