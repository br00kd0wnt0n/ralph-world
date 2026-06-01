import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────
const { valuesMock, insertMock, resendSendMock } = vi.hoisted(() => {
  const values = vi.fn().mockResolvedValue(undefined)
  const insert = vi.fn(() => ({ values }))
  const send = vi.fn().mockResolvedValue({ data: { id: 'resend-id-123' }, error: null })
  return { valuesMock: values, insertMock: insert, resendSendMock: send }
})

vi.mock('@/lib/db', () => ({
  getDb: () => ({ insert: insertMock }),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: resendSendMock },
  })),
}))

// ── Import after mocks are registered ─────────────────────────────────
import { sendTemplate, buildIdempotencyKey, _resetResendClient } from './send'

beforeEach(() => {
  vi.clearAllMocks()
  insertMock.mockImplementation(() => ({ values: valuesMock }))
  valuesMock.mockResolvedValue(undefined)
  resendSendMock.mockResolvedValue({ data: { id: 'resend-id-123' }, error: null })
  process.env.RESEND_API_KEY = 'test-key'
  process.env.RESEND_FROM = 'Test <test@ralph.world>'
  _resetResendClient()
})

describe('buildIdempotencyKey', () => {
  it('is deterministic for the same inputs', () => {
    const k1 = buildIdempotencyKey('u1', 'email-verification', { verificationUrl: 'https://x/y' })
    const k2 = buildIdempotencyKey('u1', 'email-verification', { verificationUrl: 'https://x/y' })
    expect(k1).toBe(k2)
  })

  it('differs when props differ (so re-send with new link sends)', () => {
    const k1 = buildIdempotencyKey('u1', 'email-verification', { verificationUrl: 'https://x/a' })
    const k2 = buildIdempotencyKey('u1', 'email-verification', { verificationUrl: 'https://x/b' })
    expect(k1).not.toBe(k2)
  })

  it('differs across users', () => {
    const k1 = buildIdempotencyKey('u1', 'email-verification', { verificationUrl: 'https://x/y' })
    const k2 = buildIdempotencyKey('u2', 'email-verification', { verificationUrl: 'https://x/y' })
    expect(k1).not.toBe(k2)
  })

  it('embeds userId and templateId in the key for traceability', () => {
    const key = buildIdempotencyKey('user-abc', 'email-verification', {})
    expect(key.startsWith('user-abc:email-verification:')).toBe(true)
  })
})

describe('sendTemplate — happy path', () => {
  it('reserves the key, sends via Resend, records sent row', async () => {
    const result = await sendTemplate({
      userId: 'u1',
      to: 'user@example.com',
      templateId: 'email-verification',
      props: { verificationUrl: 'https://ralph.world/verify?token=xyz' },
    })

    expect(result).toEqual(
      expect.objectContaining({ sent: true, resendId: 'resend-id-123' })
    )
    expect(resendSendMock).toHaveBeenCalledTimes(1)

    // First insert: send_attempted with idempotency key.
    const firstInsert = valuesMock.mock.calls[0][0]
    expect(firstInsert.eventType).toBe('send_attempted')
    expect(firstInsert.idempotencyKey).toBe(result.sent && result.idempotencyKey)
    expect(firstInsert.email).toBe('user@example.com')

    // Second insert: 'sent' confirmation with Resend id, no idempotency_key.
    const secondInsert = valuesMock.mock.calls[1][0]
    expect(secondInsert.eventType).toBe('sent')
    expect(secondInsert.resendEventId).toBe('resend-id-123')
  })
})

describe('sendTemplate — idempotency', () => {
  it('skips Resend when the same key already exists (unique conflict)', async () => {
    // First call reserves successfully.
    valuesMock.mockResolvedValueOnce(undefined)
    // Send + bookkeeping for the first call.
    valuesMock.mockResolvedValueOnce(undefined)
    // Second call's reserve hits the unique index — throw 23505.
    const dupErr = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    })
    valuesMock.mockRejectedValueOnce(dupErr)

    const first = await sendTemplate({
      userId: 'u1',
      to: 'user@example.com',
      templateId: 'email-verification',
      props: { verificationUrl: 'https://x/y' },
    })
    const second = await sendTemplate({
      userId: 'u1',
      to: 'user@example.com',
      templateId: 'email-verification',
      props: { verificationUrl: 'https://x/y' },
    })

    expect(first.sent).toBe(true)
    expect(second).toEqual(
      expect.objectContaining({ sent: false, skipped: true })
    )
    // Resend was called once (for the first send), not twice.
    expect(resendSendMock).toHaveBeenCalledTimes(1)
  })

  it('different props produce a different key — second send goes through', async () => {
    await sendTemplate({
      userId: 'u1',
      to: 'user@example.com',
      templateId: 'email-verification',
      props: { verificationUrl: 'https://x/a' },
    })
    await sendTemplate({
      userId: 'u1',
      to: 'user@example.com',
      templateId: 'email-verification',
      props: { verificationUrl: 'https://x/b' },
    })
    expect(resendSendMock).toHaveBeenCalledTimes(2)
  })
})

describe('sendTemplate — failures', () => {
  it('throws when Resend rejects', async () => {
    resendSendMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid recipient', name: 'invalid_recipient' },
    })

    await expect(
      sendTemplate({
        userId: 'u1',
        to: 'bad@example.com',
        templateId: 'email-verification',
        props: { verificationUrl: 'https://x/y' },
      })
    ).rejects.toThrow(/Resend rejected/)
  })

  it('throws when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY
    _resetResendClient()
    await expect(
      sendTemplate({
        userId: 'u1',
        to: 'user@example.com',
        templateId: 'email-verification',
        props: { verificationUrl: 'https://x/y' },
      })
    ).rejects.toThrow(/RESEND_API_KEY/)
  })

  it('throws on unknown template id', async () => {
    await expect(
      sendTemplate({
        userId: 'u1',
        to: 'user@example.com',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        templateId: 'nope' as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props: {} as any,
      })
    ).rejects.toThrow(/Unknown template/)
  })

  it('non-23505 DB errors propagate (caller can retry)', async () => {
    valuesMock.mockRejectedValueOnce(
      Object.assign(new Error('DB down'), { code: 'XX000' })
    )
    await expect(
      sendTemplate({
        userId: 'u1',
        to: 'user@example.com',
        templateId: 'email-verification',
        props: { verificationUrl: 'https://x/y' },
      })
    ).rejects.toThrow(/DB down/)
    expect(resendSendMock).not.toHaveBeenCalled()
  })
})
