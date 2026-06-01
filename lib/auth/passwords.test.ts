import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  hashPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH,
} from './passwords'

describe('validatePassword', () => {
  it('rejects passwords shorter than the minimum', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1)).ok).toBe(false)
  })

  it('accepts passwords at the minimum length', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH)).ok).toBe(true)
  })

  it('rejects absurdly long passwords (DoS guard)', () => {
    expect(validatePassword('a'.repeat(257)).ok).toBe(false)
  })

  it('rejects non-string inputs', () => {
    expect(validatePassword(null as unknown as string).ok).toBe(false)
    expect(validatePassword(undefined as unknown as string).ok).toBe(false)
    expect(validatePassword(12345 as unknown as string).ok).toBe(false)
  })
})

describe('hashPassword + verifyPassword', () => {
  it('round-trips a valid password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(40)
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
  })

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('wrong horse battery staple', hash)).toBe(false)
  })

  it('verifyPassword returns false for a null/undefined hash', async () => {
    expect(await verifyPassword('anything', null)).toBe(false)
    expect(await verifyPassword('anything', undefined)).toBe(false)
    expect(await verifyPassword('anything', '')).toBe(false)
  })

  it('hashPassword throws on invalid password (does not silently hash garbage)', async () => {
    await expect(hashPassword('short')).rejects.toThrow()
  })

  it('produces different hashes for the same password (salt is random)', async () => {
    const h1 = await hashPassword('correct horse battery staple')
    const h2 = await hashPassword('correct horse battery staple')
    expect(h1).not.toBe(h2)
    // But both verify.
    expect(await verifyPassword('correct horse battery staple', h1)).toBe(true)
    expect(await verifyPassword('correct horse battery staple', h2)).toBe(true)
  })
})
