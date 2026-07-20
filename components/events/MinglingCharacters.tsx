'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { accentTextCss } from '@/lib/event-themes'
import Arm, { ARM_SHAPES } from './Arm'

// Fixed (deterministic) scramble so the row isn't in numerical order while
// staying SSR-safe (a runtime shuffle would cause a hydration mismatch).
const CHARACTERS = [
  '/imgs/event_character_05.png',
  '/imgs/event_character_02.png',
  '/imgs/event_character_08.png',
  '/imgs/event_character_01.png',
  '/imgs/event_character_06.png',
  '/imgs/event_character_03.png',
  '/imgs/event_character_07.png',
  '/imgs/event_character_04.png',
]

// Arm art is a single canonical /imgs/arm.svg whose sleeve fill uses
// `currentColor`, so the wrapper's `color` drives it. Any accent hex
// works — palette in lib/event-themes.ts can grow freely and doubling
// up on colours is fine. Fallback colour when an event has no accent
// set is the Ralph green CSS var, applied inside the <Arm> component.
const ARM_FALLBACK = 'var(--color-ralph-green)'

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
  /** Set by the /events/[slug] server route — opens that event's panel. */
  initialShowSlug?: string
}

/**
 * Animated characters mingling across the screen like guests at a social event.
 * Each character moves slowly left/right with slight randomness.
 * Arms stick up from the crowd representing active events.
 */
export default function MinglingCharacters({ events = [], onSubscribe, initialShowSlug }: MinglingCharactersProps) {
  const { user } = useAuth()
  const eventCount = events.length
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeArm, setActiveArm] = useState<number | null>(null)
  // Per-event RSVP status, keyed by event id
  const [rsvpStatus, setRsvpStatus] = useState<Record<string, RsvpStatus>>({})
  // Expanded state — when set, hides other arms, centers the active one,
  // and grows the panel into a 2-col layout. URL becomes /events/[slug].
  const [expandedArm, setExpandedArm] = useState<number | null>(null)
  // < 992 swaps the layout: characters hidden, arms enter from the
  // left/right edges alternately and rotate horizontally.
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false) // 576–991
  const [isWide, setIsWide] = useState(false) // 768–991
  // Gates positioned rendering until the viewport is measured, so arms/cards
  // mount straight into the correct (mobile/desktop) spot instead of flashing
  // from the SSR desktop layout and animating across.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 991px)')
    const tabletMq = window.matchMedia('(min-width: 576px) and (max-width: 991px)')
    const wideMq = window.matchMedia('(min-width: 768px) and (max-width: 991px)')
    const update = () => {
      setIsMobile(mq.matches)
      setIsTablet(tabletMq.matches)
      setIsWide(wideMq.matches)
    }
    update()
    setMounted(true)
    mq.addEventListener('change', update)
    tabletMq.addEventListener('change', update)
    wideMq.addEventListener('change', update)
    return () => {
      mq.removeEventListener('change', update)
      tabletMq.removeEventListener('change', update)
      wideMq.removeEventListener('change', update)
    }
  }, [])

  // Lock background scroll while an event is open (the expanded overlay).
  // Only < 992 (isMobile), where the expanded card is a centred fixed overlay;
  // on desktop (>= 992) the page should stay scrollable when an event is open.
  // Lock both <html> and <body> since the scroller can be either.
  useEffect(() => {
    if (expandedArm === null || !isMobile) return
    const docEl = document.documentElement
    const prevHtml = docEl.style.overflow
    const prevBody = document.body.style.overflow
    docEl.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      docEl.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [expandedArm, isMobile])

  // Background characters: fixed, evenly spread across x (no horizontal
  // motion); only a gentle up/down bob, recomputed on resize.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const wrappers = container.querySelectorAll('[data-character-wrapper]')
    const n = wrappers.length
    const BASE_Y = 100 // pushed down, clipped by overflow-hidden
    const CHAR_W = 220 // displayed character width (matches the img width below)
    const OVERHANG = 90 // first/last sit slightly off-screen so the row reads edge-to-edge
    // per-character (deterministic) bob phase/speed + facing
    const params = Array.from(wrappers).map((_, i) => ({
      phase: (i / n) * Math.PI * 2,
      speed: 0.0016 + (i % 4) * 0.0004, // rad/ms
      scaleX: i % 2 === 0 ? 1 : -1,
    }))

    let raf = 0
    const animate = (time: number) => {
      // Read the live width first (it can be 0 on the first frame before
      // layout settles), then write transforms — read-before-write avoids
      // layout thrash and keeps the spread based on the real container width.
      const width = container.offsetWidth
      // spread fixed positions evenly from just off the left edge to just off
      // the right edge; only the vertical bob animates per frame.
      const span = width + OVERHANG * 2 - CHAR_W
      wrappers.forEach((wrapper, i) => {
        const el = wrapper as HTMLElement
        const p = params[i]
        const x = n > 1 ? -OVERHANG + (span / (n - 1)) * i : (width - CHAR_W) / 2
        const bobY = Math.sin(time * p.speed + p.phase) * 6
        el.style.transform = `translateX(${x}px) translateY(${BASE_Y + bobY}px) scaleX(${p.scaleX})`
      })
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(raf)
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
      // Shape cycles through ARM_SHAPES so consecutive events don't
      // look identical even if two share the same accent hex.
      shapeId: i % ARM_SHAPES.length,
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
      // Panel + arm share the event's accent — any palette hex works
      // now that arm sleeves render via currentColor.
      accentColour: event?.accentColour ?? null,
      thumbnailUrl: event?.thumbnailUrl || null,
      externalTicketUrl: event?.externalTicketUrl || null,
      rsvpEnabled: event?.rsvpEnabled ?? false,
    }
  })

  // On mount, open the initial event's panel — from the /events/[slug] server
  // route (initialShowSlug) or the legacy ?show= fallback (old links). If it
  // matches an arm, open it in expanded mode.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slug = initialShowSlug ?? params.get('show')
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
      setActiveArm(null)
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

  // Focus trap for the expanded event panel (acts as a modal dialog): moves
  // focus in, wraps Tab, restores focus to the trigger on close.
  const dialogRef = useFocusTrap<HTMLDivElement>(isExpanded)

  const closeExpanded = useCallback(() => {
    History.prototype.pushState.call(window.history, null, '', '/events')
    setExpandedArm(null)
    setActiveArm(null)
  }, [])

  // Escape closes the expanded panel (useFocusTrap handles Tab, not Escape).
  useEffect(() => {
    if (!isExpanded) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeExpanded()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isExpanded, closeExpanded])

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
      closeExpanded()
    } else {
      setActiveArm(null)
    }
  }

  // Mobile vertical-stack geometry. Each event becomes a roughly square
  // card stacked vertically with a clear gap; the container grows to fit
  // them all so the layout no longer fights a fixed 500px height.
  // Top padding clears the 270px top planet decoration so the cards
  // appear centred between top planet and section bottom.
  const MOBILE_CARD_W = isWide ? 460 : isTablet ? 360 : 260 // 768–991: 460, 576–767: 360, else 260
  const MOBILE_CARD_H = 290
  const MOBILE_CARD_GAP = 36
  const MOBILE_PAD_TOP = 100
  const MOBILE_PAD_BOTTOM = 100
  // Expanded (full-screen) card sits this far from the top so the arm can reach
  // down from off-screen and grip the top edge of the card.
  const MOBILE_EXPANDED_TOP = 100
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
      className="relative transition-opacity duration-500"
      style={{
        height: isMobile ? mobileContainerHeight : 500,
        width: '100%',
        opacity: mounted ? 1 : 0,
      }}
    >
      {/* Panels layer - outside clipped area so they can overflow */}
      {mounted && arms.map((arm, i) => {
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
            ? '100%' // fill the inset wrapper (near full-screen)
            : MOBILE_CARD_W
          : isThisExpanded
            ? 760
            : 388
        const panelHeight = isMobile
          ? isThisExpanded
            ? '100%' // fill the inset wrapper; content scrolls inside
            : MOBILE_CARD_H
          : isThisExpanded
            ? 420
            : 276

        const wrapperStyle: React.CSSProperties = isMobile
          ? isThisExpanded
            ? {
                // Portalled above the header. Sits 100px from the top so the
                // colour-matched arm can reach down from off-screen and "hold"
                // it; tiny 12px inset on the other edges.
                position: 'fixed',
                top: MOBILE_EXPANDED_TOP,
                left: 12,
                right: 12,
                bottom: 48,
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

        const panelWrapper = (
          <div
            key={`panel-${i}`}
            className={`absolute ${isMobile && isThisExpanded ? 'z-[90]' : 'z-[15]'} ${isMobile ? '' : 'transition-all duration-500 ease-out'} pointer-events-none`}
            style={wrapperStyle}
          >
            {/* Panel. Expanded = modal dialog (focus-trapped, aria-modal).
                Mobile mini = a button (whole card taps through to details). */}
            <div
              ref={isThisExpanded ? dialogRef : undefined}
              role={
                isThisExpanded
                  ? 'dialog'
                  : isMobile && !isThisExpanded
                    ? 'button'
                    : undefined
              }
              aria-modal={isThisExpanded ? true : undefined}
              aria-label={
                isThisExpanded
                  ? arm.title
                  : isMobile && !isThisExpanded
                    ? `${arm.title} — view details`
                    : undefined
              }
              tabIndex={isMobile && !isThisExpanded ? 0 : undefined}
              className={`${isMobile ? '' : 'transition-all duration-500 ease-out'} ${
                isPanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'
              } ${isMobile && !isThisExpanded ? 'cursor-pointer' : ''}`}
              onClick={
                isMobile && !isThisExpanded
                  ? () => handleShowMore(i)
                  : undefined
              }
              onKeyDown={
                isMobile && !isThisExpanded
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleShowMore(i)
                      }
                    }
                  : undefined
              }
              style={{
                width: panelWidth,
                height: panelHeight,
                borderRadius: 12,
                position: 'relative',
                backgroundColor: arm.accentColour || 'var(--color-ralph-green)',
                // Inner copy inherits `color` — flips to white when the
                // accent is brand purple so text stays readable.
                color: accentTextCss(arm.accentColour),
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
                className={`absolute z-10 ${
                  isMobile && !isThisExpanded ? 'hidden' : ''
                }`}
                style={{
                  position: 'absolute',
                  top: -16,
                  // Desktop: nudge outside the corner (-16). Mobile: sit inside (16).
                  [isThisExpanded || panelOnRight ? 'right' : 'left']: isMobile
                    ? 16
                    : -16,
                }}
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
                <div className="flex flex-col-reverse min-[576px]:flex-row h-full text-black gap-4 min-[576px]:gap-8 p-6 pt-[60px] min-[576px]:p-8 min-[576px]:pr-12 overflow-y-auto">
                  {/* Left col — copy + CTA */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <h3
                      className="max-w-[calc(100%_-_40px)] min-[576px]:max-w-none"
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

                    <div className="min-[576px]:mt-auto">
                      {arm.externalTicketUrl ? (
                        // Eventbrite / external ticketing — open in new tab for all users
                        <Button href={arm.externalTicketUrl} label="Get tickets" newTab />
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

                  {/* Right col — poster. On mobile add 36px side padding so the
                      poster's inset from the panel edge is 60px (36 + p-6's 24). */}
                  <div className="flex-1 flex items-center justify-end px-[36px] min-[576px]:px-0">
                    {arm.thumbnailUrl ? (
                      <img
                        src={arm.thumbnailUrl}
                        alt={arm.title}
                        className="max-w-full max-h-full object-contain"
                        style={{ borderRadius: 8, border: '6px solid white' }}
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

        // Mobile expanded: portal to <body> so it escapes the page's stacking
        // contexts (main / PageShift, both z-10) and can sit above the nav +
        // footer, with a full-screen underlay that blocks clicks behind it.
        if (isMobile && isThisExpanded) {
          return createPortal(
            <>
              <div
                className="fixed inset-0 z-[89] bg-black/60"
                onClick={handleClose}
              />
              {/* Arm reaching down from off-screen to "hold" the card by its
                  top edge. Rotated 180° so the hand points down; drops in with
                  a slight overshoot. Its hand overlaps the card's top edge
                  (card starts at MOBILE_EXPANDED_TOP). */}
              <div
                aria-hidden="true"
                className="fixed left-1/2 z-[91] pointer-events-none"
                style={{
                  // 2× the arm size while keeping the hand at the card's top
                  // edge: the extra length extends up off-screen (negative top).
                  top: -(MOBILE_EXPANDED_TOP + 44),
                  height: (MOBILE_EXPANDED_TOP + 44) * 2,
                  animation:
                    'event-arm-hold 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                }}
              >
                <Arm
                  shapeId={arm.shapeId}
                  color={arm.accentColour ?? ARM_FALLBACK}
                  className="select-none block h-full"
                  style={{ width: 'auto' }}
                />
              </div>
              {panelWrapper}
            </>,
            document.body,
            `panel-${i}`,
          )
        }
        return panelWrapper
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
        {mounted && arms.map((arm, i) => {
          const isThisExpanded = expandedArm === i
          const isHidden = isExpanded && !isThisExpanded

          if (isMobile) {
            // Arms decorate behind each card. Card on the right of the
            // viewport pairs with an arm from the left, and vice versa.
            const fromLeft = i % 2 === 0
            const armBreadth = isWide ? 132 : 110 // visual thickness of the rotated arm
            const MOBILE_ARM_LEN = isWide ? 336 : 280 // 20% bigger on 768–991
            // Anchor the arm so its tip sits exactly 20px into the (centred)
            // card edge — vw-independent since card + arm are both relative to
            // 50%. Hidden state slides it a further 320px off toward the edge.
            const armBase = MOBILE_CARD_W / 2 - 20 + MOBILE_ARM_LEN
            // On mobile the expanded card pops to a centred overlay, so slide
            // out ALL arms (incl. the active event's) whenever one is expanded.
            const mobileHidden = isExpanded
            const sideOffset = `calc(50% - ${mobileHidden ? armBase + 320 : armBase}px)`

            return (
              // Decorative on mobile — the card itself is the accessible tap
              // target (role=button above), so hide this duplicate from AT.
              <div
                key={`arm-${i}`}
                aria-hidden="true"
                className={`group absolute z-[5] transition-all duration-500 ease-out ${
                  mobileHidden ? 'pointer-events-none' : 'cursor-pointer pointer-events-auto'
                }`}
                style={{
                  top: mobileCardCenter(i),
                  [fromLeft ? 'left' : 'right']: sideOffset,
                  width: MOBILE_ARM_LEN,
                  height: armBreadth,
                  transform: 'translateY(-50%)',
                  opacity: mobileHidden ? 0 : 1,
                }}
                onClick={() => handleShowMore(i)}
              >
                <Arm
                  shapeId={arm.shapeId}
                  color={arm.accentColour ?? ARM_FALLBACK}
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
          // view. The expanded arm centers horizontally (left: 50%). While
          // just active (mini panel open), every arm — including the clicked
          // one — uses its coordinated getArmPosition value so they bunch in
          // space together.
          const effectiveLeft = isThisExpanded ? 50 : left
          const verticalOffset = isExpanded
            ? isThisExpanded
              ? 50              // active arm drops 50px to nest under the expanded panel
              : arm.height + 100 // others slide all the way off-screen
            : 0

          return (
            // Desktop: the arm is the trigger that opens the event's mini panel,
            // so expose it as a button for keyboard/SR users.
            <div
              key={`arm-${i}`}
              role="button"
              tabIndex={isExpanded ? -1 : 0}
              aria-label={`${arm.title} — view details`}
              onKeyDown={(e) => {
                if (isExpanded) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleArmClick(i)
                }
              }}
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
              <Arm
                shapeId={arm.shapeId}
                color={arm.accentColour ?? ARM_FALLBACK}
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
          Hidden < 992 — mobile arms enter from the sides instead.
          Purely decorative crowd — hidden from assistive tech. */}
      <div
        ref={containerRef}
        aria-hidden="true"
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
                // auto width (aspect preserved); height varied per character.
                // Deterministic per index (400–520px) to stay SSR-safe.
                width: 'auto',
                height: 400 + ((i * 37) % 121),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
