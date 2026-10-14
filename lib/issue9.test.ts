import { afterEach, describe, expect, it } from 'vitest'
import { getIssue9Mode, isIssue9Open, isIssue9TestToken } from './issue9'

const at = (iso: string) => new Date(iso)

afterEach(() => {
  delete process.env.ISSUE9_MODE
  delete process.env.ISSUE9_TEST_TOKEN
})

describe('isIssue9Open', () => {
  it('is closed until 00:00 UK on Mon 19 Oct (BST)', () => {
    expect(isIssue9Open(at('2026-10-18T22:59:59Z'))).toBe(false)
    expect(isIssue9Open(at('2026-10-18T23:00:00Z'))).toBe(true)
  })

  it('is open whenever the order version is forced', () => {
    process.env.ISSUE9_MODE = 'order'
    expect(isIssue9Open(at('2026-10-14T12:00:00Z'))).toBe(true)
  })
})

describe('getIssue9Mode', () => {
  it('switches to order at 00:00 UK on Mon 26 Oct (GMT)', () => {
    expect(getIssue9Mode(at('2026-10-25T23:59:59Z'))).toBe('preorder')
    expect(getIssue9Mode(at('2026-10-26T00:00:00Z'))).toBe('order')
  })
})

describe('isIssue9TestToken', () => {
  it('never matches when no token is configured', () => {
    expect(isIssue9TestToken('')).toBe(false)
    expect(isIssue9TestToken(undefined)).toBe(false)
  })

  it('matches only the configured token', () => {
    process.env.ISSUE9_TEST_TOKEN = 'abc123'
    expect(isIssue9TestToken('abc123')).toBe(true)
    expect(isIssue9TestToken('nope')).toBe(false)
    expect(isIssue9TestToken(['abc123'])).toBe(false)
  })
})
