'use client'

interface ShadowCloseButtonProps {
  onClick: () => void
  ariaLabel?: string
  /** Classes for the outer wrapper (positioning etc.). */
  className?: string
}

// Shadow-press close button with an SVG X — white face, 2px black border +
// offset shadow, black X. Shared by the magazine bubble carousel and the cart
// drawer. Positioning is left to the caller via `className`.
export default function ShadowCloseButton({
  onClick,
  ariaLabel = 'Close',
  className = '',
}: ShadowCloseButtonProps) {
  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
      <div
        aria-hidden="true"
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
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="btn-press"
        style={{
          position: 'relative',
          width: 44,
          height: 43,
          border: '2px solid black',
          backgroundColor: 'white',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.15s ease',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M3 3L19 19M19 3L3 19"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
