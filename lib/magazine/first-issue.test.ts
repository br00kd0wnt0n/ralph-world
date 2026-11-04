import { describe, it, expect } from 'vitest'
import { pickFirstIssue } from './first-issue'

const oct22 = new Date('2026-10-22T15:40:19Z')
const jun22 = new Date('2026-06-22T21:47:18Z')
const sep22 = new Date('2026-09-22T16:13:34Z')

describe('pickFirstIssue', () => {
  it('is last fulfilled + 1 when the next issue has no CMS row yet (today: Issue 10)', () => {
    const r = pickFirstIssue(
      [
        { issueNumber: 6, title: 'TEST Issue 6', fulfilledAt: sep22 },
        { issueNumber: 8, title: 'Ralph Mag #8', fulfilledAt: jun22 },
        { issueNumber: 9, title: 'Ralph Mag - Issue 9', fulfilledAt: oct22 },
      ],
      null
    )
    expect(r).toEqual({ issueNumber: 10, eta: null, previous: { issueNumber: 9, fulfilledAt: oct22 } })
  })

  it('uses the lowest unfulfilled issue above the last run', () => {
    const r = pickFirstIssue(
      [
        { issueNumber: 9, title: null, fulfilledAt: oct22 },
        { issueNumber: 11, title: null, fulfilledAt: null },
        { issueNumber: 10, title: null, fulfilledAt: null },
      ],
      'in late January'
    )
    expect(r?.issueNumber).toBe(10)
    expect(r?.eta).toBe('in late January')
  })

  it('ignores unfulfilled issues numbered below the last run', () => {
    const r = pickFirstIssue(
      [
        { issueNumber: 7, title: null, fulfilledAt: null },
        { issueNumber: 9, title: null, fulfilledAt: oct22 },
      ],
      null
    )
    expect(r?.issueNumber).toBe(10)
  })

  it('treats a blank ETA as unknown', () => {
    const r = pickFirstIssue([{ issueNumber: 9, title: null, fulfilledAt: oct22 }], '   ')
    expect(r?.eta).toBeNull()
  })

  it('picks the lowest issue when nothing has been fulfilled yet', () => {
    const r = pickFirstIssue(
      [
        { issueNumber: 2, title: null, fulfilledAt: null },
        { issueNumber: 1, title: null, fulfilledAt: null },
      ],
      null
    )
    expect(r).toEqual({ issueNumber: 1, eta: null, previous: null })
  })

  it('returns null with no issues at all', () => {
    expect(pickFirstIssue([], null)).toBeNull()
  })
})
