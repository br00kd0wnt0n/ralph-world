import { describe, it, expect } from 'vitest'

// Smoke test — proves Vitest is wired up. Real suites live next to
// the code they cover (e.g. lib/entitlements.test.ts).
describe('test harness', () => {
  it('runs and asserts', () => {
    expect(1 + 1).toBe(2)
  })
})
