// Safe wrappers around localStorage. In Safari private mode, with quota
// exhausted, or when disabled by a user's browser policy, the raw API
// throws — which used to crash CartContext, ThemeContext and TVSet at
// mount. These helpers swallow the error and return null so the caller
// falls back to defaults.

export function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Quota exceeded / private mode — intentional silent no-op.
  }
}

export function safeRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Intentional silent no-op.
  }
}
