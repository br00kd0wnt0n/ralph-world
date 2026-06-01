import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db client before importing the module under test. Drizzle's
// fluent `db.insert(table).values(payload)` is captured so we can
// assert on the payload without a real DB. `vi.hoisted` is required —
// `vi.mock` is hoisted above const declarations, so the factory can't
// see ordinary outer variables.
const { valuesMock, insertMock } = vi.hoisted(() => {
  const values = vi.fn().mockResolvedValue(undefined)
  const insert = vi.fn(() => ({ values }))
  return { valuesMock: values, insertMock: insert }
})
vi.mock('@/lib/db', () => ({
  getDb: () => ({ insert: insertMock }),
}))

import { logAction } from './audit'
import { auditLog } from './db/schema'

beforeEach(() => {
  vi.clearAllMocks()
  // clearAllMocks wipes implementations too — restore the chain.
  insertMock.mockImplementation(() => ({ values: valuesMock }))
  valuesMock.mockResolvedValue(undefined)
})

describe('logAction — write shape', () => {
  it('inserts into audit_log with full payload', async () => {
    await logAction({
      actorId: 'user-1',
      action: 'role_changed',
      targetType: 'profile',
      targetId: 'user-1',
      before: { role: 'user' },
      after: { role: 'admin' },
      source: 'cms',
    })

    expect(insertMock).toHaveBeenCalledWith(auditLog)
    expect(valuesMock).toHaveBeenCalledWith({
      actorId: 'user-1',
      action: 'role_changed',
      targetType: 'profile',
      targetId: 'user-1',
      before: { role: 'user' },
      after: { role: 'admin' },
      source: 'cms',
    })
  })

  it('defaults optional fields to null', async () => {
    await logAction({ action: 'system_started', source: 'system' })

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        targetType: null,
        targetId: null,
        before: null,
        after: null,
        action: 'system_started',
        source: 'system',
      })
    )
  })

  it('explicit null actorId allowed (system / post-erasure)', async () => {
    await logAction({
      actorId: null,
      action: 'account_deleted',
      targetType: 'user',
      targetId: 'former-user-uuid',
      source: 'system',
    })
    expect(valuesMock.mock.calls[0][0].actorId).toBeNull()
  })
})

describe('logAction — failure isolation', () => {
  it('does not throw when db.insert rejects', async () => {
    valuesMock.mockRejectedValueOnce(new Error('DB unreachable'))
    await expect(
      logAction({ action: 'role_changed', source: 'cms' })
    ).resolves.toBeUndefined()
  })

  it('does not throw when getDb throws (DB not initialised)', async () => {
    insertMock.mockImplementationOnce(() => {
      throw new Error('no DB client')
    })
    await expect(
      logAction({ action: 'role_changed', source: 'cms' })
    ).resolves.toBeUndefined()
  })
})
