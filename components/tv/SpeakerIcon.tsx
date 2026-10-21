/**
 * Mute / unmute glyph for the Ralph TV players. Flat, single-colour line
 * icon (inherits `currentColor`) so it sits with the set's black-and-white
 * controls instead of the platform's colour emoji speakers (🔇 🔊), which
 * rendered differently per OS and didn't match the theme.
 *
 * Shared by LivePlayer (desktop hover + "tap to unmute" pill) and
 * ImmersivePlayer (fullscreen control bar) so the two never drift apart.
 */
export default function SpeakerIcon({
  muted,
  size = 22,
}: {
  muted: boolean
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      {muted ? (
        <path
          d="M16 9l5 6M21 9l-5 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}
