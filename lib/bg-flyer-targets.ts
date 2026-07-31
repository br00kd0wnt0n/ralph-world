// Bridge between the global MidgroundCanvas flyers (satellite / chaser) and the
// Space Invaders game. The canvas publishes each flyer's live screen box every
// frame; the game reads them for bullet collisions and calls hitBgTarget() to
// knock one out. Inert on every other page (nothing reads/calls it).

export interface BgTarget {
  x: number // centre x (viewport CSS px)
  y: number // centre y (viewport CSS px)
  w: number
  h: number
}

let targets: (BgTarget | null)[] = []
let onHit: ((index: number) => void) | null = null

export function publishBgTargets(next: (BgTarget | null)[]): void {
  targets = next
}

export function getBgTargets(): (BgTarget | null)[] {
  return targets
}

export function setBgTargetHitHandler(
  fn: ((index: number) => void) | null,
): void {
  onHit = fn
}

export function hitBgTarget(index: number): void {
  onHit?.(index)
}
