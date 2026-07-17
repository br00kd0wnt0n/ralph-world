// Format a Shopify money amount (a decimal string like "10.0" or "3") to a
// consistent 2-decimal-place string for display, e.g. "10.00" / "3.00".
// Falls back to the raw value if it isn't a finite number.
export function formatPrice(amount: string | number | null | undefined): string {
  const n = Number(amount)
  return Number.isFinite(n) ? n.toFixed(2) : String(amount ?? '')
}
