import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Ralph — The Entertainment People'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Rendered at request time on the edge, so copy and brand colours stay
// in-sync with the rest of the site without generating a static PNG.
// Per-route OG images can be added by dropping another opengraph-image.tsx
// into the relevant app/ folder (e.g. app/magazine/opengraph-image.tsx).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Pink arch echoing the Ralph footer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 120,
            display: 'flex',
          }}
        >
          <svg
            width="1200"
            height="120"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,120 Q600,-40 1200,120"
              fill="none"
              stroke="#FF2098"
              strokeWidth="4"
            />
          </svg>
        </div>

        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
            color: '#FF2098',
            display: 'flex',
          }}
        >
          ralph
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#ffffff',
            opacity: 0.85,
            display: 'flex',
          }}
        >
          The Entertainment People
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 24,
            color: '#ffffff',
            opacity: 0.55,
            display: 'flex',
          }}
        >
          Pop culture for the fun of it
        </div>

        {/* Pink arch mirrored at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            display: 'flex',
          }}
        >
          <svg
            width="1200"
            height="120"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 Q600,160 1200,0"
              fill="none"
              stroke="#FF2098"
              strokeWidth="4"
            />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  )
}
