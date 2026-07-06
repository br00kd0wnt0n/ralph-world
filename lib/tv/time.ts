/**
 * Ralph TV schedule-time helpers.
 *
 * The broadcaster returns schedule times as bare "HH:MM" strings and does
 * not currently attach a source timezone. All shows are scheduled in
 * London time. These helpers convert those wall-clock strings into the
 * viewer's local wall-clock time so a viewer in Tokyo doesn't see a show
 * that says "14:00-15:00" and expect it in JST when it's really BST.
 *
 * If the broadcaster ever starts returning absolute timestamps (ISO 8601
 * with offset), rip these helpers out and just use `toLocaleTimeString`
 * against the viewer's default TZ.
 */

export const BROADCASTER_TZ = 'Europe/London'

/**
 * Convert an "HH:MM" wall-clock time interpreted in the broadcaster
 * source TZ to an "HH:MM" wall-clock time in the viewer's local TZ.
 *
 * `referenceDate` anchors the conversion to a specific calendar day —
 * needed because the offset between London and viewer changes across
 * DST boundaries. Pass "now" for the current-schedule case.
 *
 * Iterative approach: guess the UTC moment for the target London wall
 * time, format that guess back in London, adjust the guess by the diff,
 * repeat until stable. Converges in 1–2 steps because London's offset
 * from UTC is bounded.
 */
export function londonWallToLocalWall(
  hhmm: string,
  referenceDate: Date
): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return hhmm

  const targetH = Number(m[1])
  const targetM = Number(m[2])

  // Anchor: today's date in London (may be different from viewer's day).
  const londonDateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BROADCASTER_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate)
  const y = Number(londonDateParts.find((p) => p.type === 'year')!.value)
  const mo = Number(londonDateParts.find((p) => p.type === 'month')!.value)
  const d = Number(londonDateParts.find((p) => p.type === 'day')!.value)

  // Initial guess: treat wall time as UTC. Iterate to close the gap.
  let guessMs = Date.UTC(y, mo - 1, d, targetH, targetM)
  const targetTotal = targetH * 60 + targetM
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: BROADCASTER_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(guessMs))
    const gotH = Number(parts.find((p) => p.type === 'hour')!.value)
    const gotM = Number(parts.find((p) => p.type === 'minute')!.value)
    const gotTotal = gotH * 60 + gotM
    let diff = targetTotal - gotTotal
    // If the diff crosses midnight (huge jump), assume we crossed the day.
    if (diff > 12 * 60) diff -= 24 * 60
    if (diff < -12 * 60) diff += 24 * 60
    if (diff === 0) break
    guessMs += diff * 60_000
  }

  // Format the resolved UTC moment in the viewer's local TZ.
  return new Date(guessMs).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

/**
 * Short human label for the viewer's timezone — e.g. "GMT+1" or
 * "GMT+9". Used to disambiguate the converted times in the UI. Falls
 * back to the raw IANA name if the offset can't be derived.
 */
export function viewerTimezoneLabel(referenceDate: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZoneName: 'shortOffset',
    hour: 'numeric',
  }).formatToParts(referenceDate)
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value
  if (tz) return tz.replace('GMT', 'GMT') // normalise; already reads well
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
}
