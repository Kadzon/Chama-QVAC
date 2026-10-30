import { describe, expect, it } from 'vitest'
import {
  ContributionSchema,
  MeetingExtractionSchema,
  MeetingSchema,
  PayoutProposalSchema,
  TranscriptSegmentSchema,
} from './schemas'

describe('MeetingSchema', () => {
  it('accepts a valid meeting record', () => {
    const result = MeetingSchema.safeParse({
      id: 'meeting-1',
      date: '2026-10-30',
      attendees: ['member-1', 'member-2'],
      minutes: 'Discussed contributions and a loan request.',
      language: 'mixed',
      transcriptHash: 'abc123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid language', () => {
    const result = MeetingSchema.safeParse({
      id: 'meeting-1',
      date: '2026-10-30',
      attendees: [],
      minutes: '',
      language: 'fr',
      transcriptHash: 'abc123',
    })
    expect(result.success).toBe(false)
  })
})

describe('ContributionSchema', () => {
  it('rejects a non-positive amount', () => {
    const result = ContributionSchema.safeParse({
      id: 'c1',
      meetingId: 'm1',
      memberId: 'member-1',
      amount: 0,
      currency: 'KES',
    })
    expect(result.success).toBe(false)
  })
})

describe('PayoutProposalSchema', () => {
  it('accepts a pending proposal with no approvals yet', () => {
    const result = PayoutProposalSchema.safeParse({
      id: 'p1',
      memberId: 'member-1',
      amount: 5000,
      reason: 'Rotation payout',
      createdBy: 'member-2',
      approvals: [],
      threshold: 2,
      status: 'pending',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown status', () => {
    const result = PayoutProposalSchema.safeParse({
      id: 'p1',
      memberId: 'member-1',
      amount: 5000,
      reason: 'Rotation payout',
      createdBy: 'member-2',
      approvals: [],
      threshold: 2,
      status: 'archived',
    })
    expect(result.success).toBe(false)
  })
})

describe('TranscriptSegmentSchema', () => {
  it('accepts a diarized segment', () => {
    const result = TranscriptSegmentSchema.safeParse({
      speaker: 'S01',
      startMs: 0,
      endMs: 4200,
      text: 'Mimi ni Wanjiru.',
    })
    expect(result.success).toBe(true)
  })
})

describe('MeetingExtractionSchema', () => {
  it('accepts an extraction with no payout due', () => {
    const result = MeetingExtractionSchema.safeParse({
      attendees: ['Wanjiru', 'Kamau'],
      contributions: [{ memberName: 'Wanjiru', amount: 500, currency: 'KES' }],
      loans: [],
      decisions: [{ text: 'Next meeting moved to the 15th.' }],
      minutesSummary: 'Wanjiru contributed 500 KES; next meeting moved.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects malformed LLM output missing required fields', () => {
    const result = MeetingExtractionSchema.safeParse({
      attendees: ['Wanjiru'],
      contributions: [{ memberName: 'Wanjiru', currency: 'KES' }],
      loans: [],
      decisions: [],
      minutesSummary: 'Incomplete.',
    })
    expect(result.success).toBe(false)
  })
})
