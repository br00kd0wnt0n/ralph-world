import { describe, it, expect, vi, beforeEach } from 'vitest'

const { valuesMock, insertMock } = vi.hoisted(() => {
  const values = vi.fn().mockResolvedValue(undefined)
  const insert = vi.fn(() => ({ values }))
  return { valuesMock: values, insertMock: insert }
})
vi.mock('@/lib/db', () => ({
  getDb: () => ({ insert: insertMock }),
}))

import { logConsent, logSignupConsents, POLICY_VERSION } from './consent'
import { consentLog } from './db/schema'

beforeEach(() => {
  vi.clearAllMocks()
  insertMock.mockImplementation(() => ({ values: valuesMock }))
  valuesMock.mockResolvedValue(undefined)
})

describe('logConsent — write shape', () => {
  it('inserts into consent_log with the full payload', async () => {
    await logConsent({
      userId: 'user-1',
      consentType: 'marketing',
      granted: true,
      source: 'portal',
      policyVersion: 'custom-v2',
    })

    expect(insertMock).toHaveBeenCalledWith(consentLog)
    expect(valuesMock).toHaveBeenCalledWith({
      userId: 'user-1',
      consentType: 'marketing',
      granted: true,
      source: 'portal',
      policyVersion: 'custom-v2',
    })
  })

  it('defaults policyVersion to the current POLICY_VERSION', async () => {
    await logConsent({
      userId: 'user-1',
      consentType: 'terms',
      granted: true,
      source: 'signup_form',
    })

    expect(valuesMock.mock.calls[0][0].policyVersion).toBe(POLICY_VERSION)
  })

  it('null userId allowed (post-erasure retention)', async () => {
    await logConsent({
      userId: null,
      consentType: 'marketing',
      granted: false,
      source: 'portal',
    })
    expect(valuesMock.mock.calls[0][0].userId).toBeNull()
  })

  it('records withdrawn consent (granted=false)', async () => {
    await logConsent({
      userId: 'user-1',
      consentType: 'marketing',
      granted: false,
      source: 'portal',
    })
    expect(valuesMock.mock.calls[0][0].granted).toBe(false)
  })

  it('substack_migration source accepted', async () => {
    await logConsent({
      userId: 'user-1',
      consentType: 'marketing',
      granted: true,
      source: 'substack_migration',
      policyVersion: 'migrated-from-substack-2026-06',
    })
    expect(valuesMock.mock.calls[0][0].source).toBe('substack_migration')
    expect(valuesMock.mock.calls[0][0].policyVersion).toBe(
      'migrated-from-substack-2026-06'
    )
  })
})

describe('logSignupConsents', () => {
  it('writes exactly two rows: terms + privacy, both granted', async () => {
    await logSignupConsents('user-1')

    expect(valuesMock).toHaveBeenCalledTimes(2)
    const calls = valuesMock.mock.calls.map((c) => c[0])
    const types = calls.map((c) => c.consentType).sort()
    expect(types).toEqual(['privacy', 'terms'])
    expect(calls.every((c) => c.granted === true)).toBe(true)
    expect(calls.every((c) => c.source === 'signup_form')).toBe(true)
    expect(calls.every((c) => c.userId === 'user-1')).toBe(true)
  })
})

describe('logConsent — failure isolation', () => {
  it('does not throw when db.insert rejects', async () => {
    valuesMock.mockRejectedValueOnce(new Error('DB unreachable'))
    await expect(
      logConsent({
        userId: 'user-1',
        consentType: 'terms',
        granted: true,
        source: 'signup_form',
      })
    ).resolves.toBeUndefined()
  })

  it('logSignupConsents still resolves when one insert fails', async () => {
    valuesMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined)
    await expect(logSignupConsents('user-1')).resolves.toBeUndefined()
  })
})
