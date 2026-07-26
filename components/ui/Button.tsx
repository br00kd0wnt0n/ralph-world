'use client'

import Link from 'next/link'

interface ButtonProps {
  label: string
  href?: string
  onClick?: () => void
  className?: string
  // Optional override for the button's min-width (default 170px).
  minWidth?: number
  // If true, border + shadow flip from black to ralph-pink.
  pink?: boolean
  // If true, the button fills ralph-pink with white text. Border + shadow
  // stay black (unless `pink` is also set) — a solid pink button rather
  // than a pink-outlined white one.
  filled?: boolean
  // type for the rendered <button>. Defaults to "button" so it never
  // accidentally submits a parent form. Pass "submit" to use as a form
  // submit control.
  type?: 'button' | 'submit'
  disabled?: boolean
  // If true (and `href` is set), open the link in a new tab.
  newTab?: boolean
}

const RALPH_PINK = '#EA128B'

const btnStyles: React.CSSProperties = {
  height: 43,
  minWidth: 170,
  paddingLeft: 12,
  paddingRight: 12,
  border: '2px solid black',
  backgroundColor: 'white',
  color: 'black',
  fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
  fontWeight: 600,
  fontSize: 16,
  lineHeight: 1,
  letterSpacing: 0,
  textAlign: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  cursor: 'pointer',
  transition: 'transform 0.15s ease',
}

const shadowStyles: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  left: 4,
  width: '100%',
  height: '100%',
  backgroundColor: 'black',
  pointerEvents: 'none',
}

export default function Button({
  label,
  href,
  onClick,
  className = '',
  minWidth,
  pink = false,
  filled = false,
  type = 'button',
  disabled = false,
  newTab = false,
}: ButtonProps) {
  const mergedStyles: React.CSSProperties = {
    ...btnStyles,
    ...(minWidth !== undefined ? { minWidth } : null),
    ...(pink ? { border: `2px solid ${RALPH_PINK}` } : null),
    // Black text on pink for AA contrast (white on #EA128B is ~3.9:1).
    ...(filled ? { backgroundColor: RALPH_PINK, color: 'black' } : null),
    ...(disabled ? { opacity: 0.55, cursor: 'not-allowed' } : null),
  }
  const mergedShadowStyles: React.CSSProperties = {
    ...shadowStyles,
    ...(pink ? { backgroundColor: RALPH_PINK } : null),
  }
  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block', width: 'fit-content' }}>
      {/* Shadow — stays in place */}
      <div style={mergedShadowStyles} />
      {/* Button — moves on hover/active */}
      {href && !disabled ? (
        <Link
          href={href}
          className="btn-press"
          style={mergedStyles}
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer' : undefined}
        >
          {label}
        </Link>
      ) : (
        <button
          type={type}
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          className={disabled ? undefined : 'btn-press'}
          style={mergedStyles}
        >
          {label}
        </button>
      )}
    </div>
  )
}
