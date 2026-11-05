// Back/Forward recovery for the in-page overlays (magazine article, shop
// product, events panel).
//
// Those overlays write their pretty URLs with History.prototype.pushState /
// replaceState and a null state, on purpose: going through Next 16's patched
// methods would change usePathname(), PageTransitionWrapper would re-key and
// the page would re-mount, losing the overlay. Next's own popstate handler
// skips null-state entries, so traversing one of them never re-renders.
//
// That's fine while the reader stays on the page that wrote the entry (the
// overlay's own popstate listener syncs it). It breaks once they leave via a
// link: Back lands on, say, /magazine while Next is still rendering /shop.
// shouldRecoverPop() spots that case so the caller can hand the URL to the
// router.

/** Pages whose overlays write history behind Next's back. */
const OVERLAY_OWNERS = /^\/(magazine|shop|events)(?:\/[^/]+)?$/

function normalise(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

/** 'magazine' for /magazine and /magazine/<slug>, etc. Null otherwise. */
export function overlayOwner(pathname: string): string | null {
  return OVERLAY_OWNERS.exec(normalise(pathname))?.[1] ?? null
}

/**
 * True when a popstate landed on an entry Next will ignore (no `__NA` in its
 * state) and whose URL belongs to a different page than the one Next is
 * rendering. Same pathname (e.g. a #hash entry) or the same overlay owner
 * (/magazine ↔ /magazine/<slug>) is left to the page.
 */
export function shouldRecoverPop(
  historyState: unknown,
  locationPathname: string,
  renderedPathname: string,
): boolean {
  const state = historyState as { __NA?: unknown } | null
  if (state?.__NA) return false // Next handles its own entries.
  const target = normalise(locationPathname)
  const rendered = normalise(renderedPathname)
  if (target === rendered) return false
  const owner = overlayOwner(target)
  return owner === null || owner !== overlayOwner(rendered)
}
