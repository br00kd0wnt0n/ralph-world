'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

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
  id?: string
  slug: string
  title?: string | null
  descriptionShort?: string | null
  eventDate?: Date | null
  locationName?: string | null
  locationAddress?: string | null
  locationPostcode?: string | null
  accentColour?: string | null
  thumbnailUrl?: string | null
  externalTicketUrl?: string | null
  rsvpEnabled?: boolean | null
}

/** Tracks per-event RSVP status within the session. */
type RsvpStatus = 'idle' | 'loading' | 'attending' | 'full' | 'error'

interface MinglingCharactersProps {
  events?: Event[]
  onSubscribe?: () => void
}

/**
 * Animated characters mingling across the screen like guests at a social event.
 * Each character moves slowly left/right with slight randomness.
 * Arms stick up from the crowd representing active events.
 */
export default function MinglingCharacters({ events = [], onSubscribe }: MinglingCharactersProps) {
  const { user } = useAuth()
  const eventCount = events.length
  const containerRef = useRef<HTMLDivElement>(null)
  const statesRef = useRef<CharacterState[]>([])
  const rafRef = useRef<number>(0)
  const [activeArm, setActiveArm] = useState<number | null>(null)
  // Per-event RSVP status, keyed by event id
  const [rsvpStatus, setRsvpStatus] = useState<Record<string, RsvpStatus>>({})
  // Expanded state — when set, hides other arms, centers the active one,
  // and grows the panel into a 2-col layout. URL becomes /events/[slug].
  const [expandedArm, setExpandedArm] = useState<number | null>(null)
  // < 992 swaps the layout: characters hidden, arms enter from the
  // left/right edges alternately and rotate horizontally.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 991px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

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

  // Submit RSVP for an event
  const handleRsvp = useCallback(async (eventId: string) => {
    if (!eventId) return
    if (!user) {
      onSubscribe?.()
      return
    }
    setRsvpStatus((prev) => ({ ...prev, [eventId]: 'loading' }))
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      if (res.status === 201) {
        setRsvpStatus((prev) => ({ ...prev, [eventId]: 'attending' }))
      } else if (res.status === 200) {
        // already attending (idempotent)
        setRsvpStatus((prev) => ({ ...prev, [eventId]: 'attending' }))
      } else if (res.status === 409) {
        setRsvpStatus((prev) => ({ ...prev, [eventId]: 'full' }))
      } else {
        setRsvpStatus((prev) => ({ ...prev, [eventId]: 'error' }))
      }
    } catch {
      setRsvpStatus((prev) => ({ ...prev, [eventId]: 'error' }))
    }
  }, [user, onSubscribe])

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
      id: event?.id || '',
      slug: event?.slug || '',
      title: event?.title || 'Untitled Event',
      description: event?.descriptionShort || '',
      date: formatDate(event?.eventDate),
      location: event?.locationName || '',
      locationAddress: event?.locationAddress || '',
      locationPostcode: event?.locationPostcode || '',
      accentColour: event?.accentColour || null,
      thumbnailUrl: event?.thumbnailUrl || null,
      externalTicketUrl: event?.externalTicketUrl || null,
      rsvpEnabled: event?.rsvpEnabled ?? false,
    }
  })

  // On mount, check the URL for `?show=slug` (set by the /events/[slug]
  // redirect page). If it matches an arm, open it in expanded mode.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('show')
    if (!slug) return
    const idx = arms.findIndex((a) => a.slug === slug)
    if (idx < 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveArm(idx)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedArm(idx)
    // Use the unpatched History.prototype method (see handleShowMore).
    History.prototype.replaceState.call(window.history, null, '', `/events/${slug}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close expanded panel on back/forward navigation. pushState doesn't
  // notify Next.js, so popstate is the only signal we'll get from the
  // back button while the user stays inside the events page.
  useEffect(() => {
    function onPopState() {
      setExpandedArm(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
  const isExpanded = expandedArm !== null

  const handleArmClick = (index: number) => {
    // Ignore arm clicks while expanded — other arms are off-screen and
    // shouldn't re-open the mini panel until the user closes the expanded.
    if (isExpanded) return
    setActiveArm(index)
  }

  const handleShowMore = (index: number) => {
    const slug = arms[index].slug
    if (!slug) return
    // Use the unpatched History.prototype.pushState directly. Next.js 16's
    // App Router otherwise monitors `window.history.pushState` and treats
    // a path change to `/events/[slug]` as a soft navigation (FrozenRouter
    // fade-out, RSC refetch, re-mount), which destroys our local expanded
    // state. Going through the prototype bypasses Next.js's patched method.
    History.prototype.pushState.call(window.history, null, '', `/events/${slug}`)
    setExpandedArm(index)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering arm click
    if (isExpanded) {
      History.prototype.pushState.call(window.history, null, '', '/events')
      setExpandedArm(null)
    } else {
      setActiveArm(null)
    }
  }

  // Mobile vertical-stack geometry. Each event becomes a roughly square
  // card stacked vertically with a clear gap; the container grows to fit
  // them all so the layout no longer fights a fixed 500px height.
  // Top padding clears the 270px top planet decoration so the cards
  // appear centred between top planet and section bottom.
  const MOBILE_CARD_W = 260
  const MOBILE_CARD_H = 290
  const MOBILE_CARD_GAP = 36
  const MOBILE_PAD_TOP = 100
  const MOBILE_PAD_BOTTOM = 100
  const mobileContainerHeight =
    MOBILE_PAD_TOP +
    MOBILE_PAD_BOTTOM +
    eventCount * MOBILE_CARD_H +
    Math.max(0, eventCount - 1) * MOBILE_CARD_GAP
  const mobileCardTop = (i: number) =>
    MOBILE_PAD_TOP + i * (MOBILE_CARD_H + MOBILE_CARD_GAP)
  const mobileCardCenter = (i: number) => mobileCardTop(i) + MOBILE_CARD_H / 2

  return (
    <div
      className="relative"
      style={{
        height: isMobile ? mobileContainerHeight : 500,
        width: '100%',
      }}
      aria-hidden="true"
    >
      {/* Panels layer - outside clipped area so they can overflow */}
      {arms.map((arm, i) => {
        const { left, bunchDirection } = getArmPosition(i)
        const isActive = activeArm === i
        const isThisExpanded = expandedArm === i

        // Mobile (<992): vertical card stack. Cards alternate which side
        // they're aligned to, with the arm coming in from the opposite side.
        const fromLeft = i % 2 === 0
        const panelOnRight = isMobile
          ? !fromLeft
          : bunchDirection === 'right' || (bunchDirection === null && i < eventCount / 2)

        // On mobile every mini panel is open by default — tapping it opens
        // the expanded view. So treat all mini panels as "active" unless
        // another arm is currently expanded (others fade then).
        const isPanelOpen = isMobile
          ? !isExpanded || isThisExpanded
          : isActive

        // Panel dimensions.
        const panelWidth = isMobile
          ? isThisExpanded
            ? 'min(calc(100vw - 32px), 520px)'
            : MOBILE_CARD_W
          : isThisExpanded
            ? 760
            : 388
        const panelHeight = isMobile
          ? isThisExpanded
            ? 520
            : MOBILE_CARD_H
          : isThisExpanded
            ? 420
            : 276

        const wrapperStyle: React.CSSProperties = isMobile
          ? isThisExpanded
            ? {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }
            : {
                top: mobileCardTop(i),
                left: '50%',
                transform: 'translateX(-50%)',
              }
          : {
              bottom: isThisExpanded ? 205 : -100 + arm.height - 150,
              left: isThisExpanded ? '50%' : `${left}%`,
              transform: isThisExpanded
                ? 'translateX(-50%)'
                : panelOnRight
                  ? 'translateX(-80%)'
                  : 'translateX(-20%)',
            }

        return (
          <div
            key={`panel-${i}`}
            className="absolute z-[15] transition-all duration-500 ease-out pointer-events-none"
            style={wrapperStyle}
          >
            {/* Panel */}
            <div
              className={`transition-all duration-500 ease-out ${
                isPanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'
              } ${isMobile && !isThisExpanded ? 'cursor-pointer' : ''}`}
              onClick={
                isMobile && !isThisExpanded
                  ? () => handleShowMore(i)
                  : undefined
              }
              style={{
                width: panelWidth,
                height: panelHeight,
                borderRadius: 12,
                position: 'relative',
                backgroundColor: arm.accentColour || 'var(--color-ralph-green)',
                transform: isPanelOpen
                  ? `scale(1) rotate(${isThisExpanded ? 0 : arm.panelRotation}deg)`
                  : `scale(0) rotate(${panelOnRight ? 100 : -100}deg)`,
                transformOrigin: isThisExpanded
                  ? 'bottom center'
                  : isMobile
                    ? 'center center'
                    : panelOnRight ? 'bottom right' : 'bottom left',
              }}
            >
              {/* Close button — top-right when expanded, otherwise mirrors panel side.
                  Hidden on mobile mini state (the whole panel is the tap target). */}
              <div
                className={`absolute top-4 z-10 ${isThisExpanded || panelOnRight ? 'right-4' : 'left-4'} ${
                  isMobile && !isThisExpanded ? 'hidden' : ''
                }`}
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

              {/* Event content — mini (single col) vs expanded (stacks
                  vertically on narrow screens, 2 col on >=576). */}
              {isThisExpanded ? (
                <div className="flex flex-col min-[576px]:flex-row h-full text-black gap-4 min-[576px]:gap-8 p-6 min-[576px]:p-8 min-[576px]:pr-12 overflow-y-auto">
                  {/* Left col — copy + CTA */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <h3
                      style={{
                        fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                        fontWeight: 600,
                        fontSize: 28,
                        lineHeight: '110%',
                        letterSpacing: 0,
                        marginBottom: 16,
                      }}
                    >
                      {arm.title}
                    </h3>

                    {arm.description && (
                      <p
                        className="text-body-sm"
                        style={{ marginBottom: 16, opacity: 0.85 }}
                      >
                        {arm.description}
                      </p>
                    )}

                    {arm.date && (
                      <p
                        style={{
                          fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                          fontWeight: 600,
                          fontSize: 16,
                          lineHeight: '20px',
                          letterSpacing: 0,
                          marginBottom: 12,
                        }}
                      >
                        {arm.date}
                      </p>
                    )}

                    {(arm.location || arm.locationAddress || arm.locationPostcode) && (
                      <address
                        className="not-italic"
                        style={{
                          fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                          fontWeight: 600,
                          fontSize: 16,
                          lineHeight: '22px',
                          letterSpacing: 0,
                          marginBottom: 20,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {[arm.location, arm.locationAddress, arm.locationPostcode]
                          .filter(Boolean)
                          .join('\n')}
                      </address>
                    )}

                    <div className="mt-auto">
                      {arm.externalTicketUrl ? (
                        // Eventbrite / external ticketing — open in new tab for all users
                        <Button href={arm.externalTicketUrl} label="Get tickets" />
                      ) : arm.rsvpEnabled ? (
                        // Free event with RSVP — requires sign-in
                        (() => {
                          const status = rsvpStatus[arm.id] ?? 'idle'
                          if (status === 'attending') {
                            return (
                              <Button
                                label="You're attending ✓"
                                disabled
                              />
                            )
                          }
                          if (status === 'full') {
                            return <Button label="Event is full" disabled />
                          }
                          if (!user) {
                            return (
                              <Button
                                label="Sign in to RSVP"
                                onClick={() => onSubscribe?.()}
                              />
                            )
                          }
                          return (
                            <Button
                              label={status === 'loading' ? 'Saving…' : 'RSVP to this event'}
                              onClick={() => handleRsvp(arm.id)}
                              disabled={status === 'loading'}
                            />
                          )
                        })()
                      ) : null}
                    </div>
                  </div>

                  {/* Right col — poster */}
                  <div className="flex-1 flex items-center justify-center">
                    {arm.thumbnailUrl ? (
                      <img
                        src={arm.thumbnailUrl}
                        alt={arm.title}
                        className="max-w-full max-h-full object-contain"
                        style={{ borderRadius: 8 }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.08)',
                          borderRadius: 8,
                          fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                          fontSize: 14,
                          opacity: 0.5,
                        }}
                      >
                        Poster
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`p-6 flex flex-col h-full text-black ${
                    isMobile ? '' : panelOnRight ? '' : 'text-right items-end'
                  }`}
                >
                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                      fontWeight: 600,
                      fontSize: isMobile ? 20 : 24,
                      lineHeight: '110%',
                      letterSpacing: 0,
                      marginBottom: 12,
                      paddingRight: isMobile ? 0 : panelOnRight ? 32 : 0,
                      paddingLeft: isMobile ? 0 : panelOnRight ? 0 : 32,
                    }}
                  >
                    {arm.title}
                  </h3>

                  {/* Description */}
                  {arm.description && (
                    <p
                      className="text-body-sm"
                      style={{ marginBottom: 12, opacity: 0.85 }}
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
                        fontSize: isMobile ? 14 : 16,
                        lineHeight: isMobile ? '18px' : '18px',
                        letterSpacing: 0,
                        marginBottom: 16,
                      }}
                    >
                      {arm.date}{arm.date && arm.location ? ' - ' : ''}{arm.location}
                    </p>
                  )}

                  {/* Show me more — opens expanded view */}
                  <div className="mt-auto">
                    <Button onClick={() => handleShowMore(i)} label="Show me more" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Arms container.
          Desktop (>=992): clip vertically so arm bases hide, allow horizontal overflow.
          Mobile (<992):   clip horizontally so arm bases hide, allow vertical overflow. */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={
          isMobile
            ? { overflowX: 'clip', overflowY: 'visible' }
            : { overflowX: 'visible', overflowY: 'clip' }
        }
      >
        {arms.map((arm, i) => {
          const isThisExpanded = expandedArm === i
          const isHidden = isExpanded && !isThisExpanded

          if (isMobile) {
            // Arms decorate behind each card. Card on the right of the
            // viewport pairs with an arm from the left, and vice versa.
            const fromLeft = i % 2 === 0
            const armBreadth = 110 // visual thickness of the rotated arm
            const MOBILE_ARM_LEN = 280
            const sideOffset = isHidden ? -MOBILE_ARM_LEN - 20 : -90

            return (
              <div
                key={`arm-${i}`}
                className={`group absolute z-[5] transition-all duration-500 ease-out ${
                  isHidden ? 'pointer-events-none' : 'cursor-pointer pointer-events-auto'
                }`}
                style={{
                  top: mobileCardCenter(i),
                  [fromLeft ? 'left' : 'right']: sideOffset,
                  width: MOBILE_ARM_LEN,
                  height: armBreadth,
                  transform: 'translateY(-50%)',
                  opacity: isHidden ? 0 : 1,
                }}
                onClick={() => handleShowMore(i)}
              >
                <img
                  src={arm.src}
                  alt=""
                  draggable={false}
                  className="max-w-none select-none absolute"
                  style={{
                    height: MOBILE_ARM_LEN,
                    width: 'auto',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${fromLeft ? 90 : -90}deg)`,
                  }}
                />
              </div>
            )
          }

          const { left } = getArmPosition(i)
          // When ANY arm is expanded, non-expanded arms slide down out of
          // view. The expanded arm centers horizontally (left: 50%).
          const effectiveLeft = isThisExpanded ? 50 : left
          const verticalOffset = isExpanded
            ? isThisExpanded
              ? 50              // active arm drops 50px to nest under the expanded panel
              : arm.height + 100 // others slide all the way off-screen
            : 0

          return (
            <div
              key={`arm-${i}`}
              className={`group absolute z-20 transition-all duration-500 ease-out ${
                isAnyActive ? '' : 'animate-wave'
              } ${isHidden ? 'pointer-events-none' : 'cursor-pointer pointer-events-auto'}`}
              style={{
                bottom: -100,
                left: `${effectiveLeft}%`,
                transform: `translateX(-50%) translateY(${verticalOffset}px)`,
                transformOrigin: 'bottom center',
                animationDelay: `${(i * 0.7) % 2}s`,
                animationDuration: `${1.8 + (i % 4) * 0.3}s`,
                animationPlayState: isAnyActive ? 'paused' : 'running',
                opacity: isHidden ? 0 : 1,
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

      {/* Character container - absolutely positioned at bottom.
          Hidden < 992 — mobile arms enter from the sides instead. */}
      <div
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0 overflow-hidden z-10 hidden min-[992px]:block"
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
