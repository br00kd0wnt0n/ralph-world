# Ralph TV — Component Intent

## TVSet
Retro illustrated TV frame containing the screen area and bezel.
Characters flank the TV on desktop (left: alien, right: robot).
London globe placeholder bottom-left of section.

## Duffy asset slots
- TV set frame: `/public/illustrations/tv-set.svg` — will replace the bezel div structure
- Left character: replace `w-16 h-24 bg-ralph-teal/10` placeholder
- Right character: replace `w-16 h-24 bg-ralph-pink/10` placeholder
- Offline fallback: `/public/illustrations/tv-offline.gif` — replace the OFFLINE text

## Screen states
1. **LIVE** — LivePlayer (HLS stream) plays inside screen. Status bar below: "On now: X" + "Up next: Y".
2. **SHOW INFO (RALPHFAX 100)** — Teletext overlay. Blocky RALPH logo, current show info, progress bar.
3. **SCHEDULE (RALPHFAX 101)** — Teletext overlay. Full day's schedule, current show highlighted.
4. **SUBSCRIBE GATE** — Canvas static animation with purple card overlay "Subscribe to keep watching". Guests only when stream is live.
5. **OFFLINE** — Simple "OFFLINE / Tune in later" message. When stream unreachable.

## Controls (desktop right panel)
- Show Info — toggles RALPHFAX 100 overlay
- Schedule — toggles RALPHFAX 101 overlay
- Fullscreen — requests fullscreen on TV container
- Volume — vertical slider, saved to localStorage

Mobile: horizontal button row below TV. No vertical volume.

## Live status
`useLiveStatus` polls `/api/broadcaster/relay-status` every 30s.
When `streaming && available` is true, screen switches to LIVE (or SUBSCRIBE_GATE for guests).

## Broadcaster integration
All calls server-side, proxied through `/api/broadcaster/*`:
- `relay-status` — public, 3s timeout, never throws
- `schedule` — public, for teletext overlays
- `assets` — session required (VOD library — not in MVP UI)
- `vod-url` — paid subscription required (presigned URLs, 10min TTL)

When `BROADCASTER_BACKEND_URL` is not set, all endpoints return safe defaults
(empty schedule, offline status) so the TV page still renders.
