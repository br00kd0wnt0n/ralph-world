'use client'

import Link from 'next/link'

interface ButtonProps {
  label: string
  href?: string
  onClick?: () => void
  className?: string
}

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

export default function Button({ label, href, onClick, className = '' }: ButtonProps) {
  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block', width: 'fit-content' }}>
      {/* Shadow — stays in place */}
      <div style={shadowStyles} />
      {/* Button — moves on hover/active */}
      {href ? (
        <Link href={href} className="btn-press" style={btnStyles}>
          {label}
        </Link>
      ) : (
        <button onClick={onClick} className="btn-press" style={btnStyles}>
          {label}
        </button>
      )}
    </div>
  )
}
