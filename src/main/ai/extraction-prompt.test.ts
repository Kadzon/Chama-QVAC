import { describe, expect, it } from 'vitest'
import type { TranscriptSegment } from '../../shared/schemas'
import {
  ExtractionValidationError,
  buildExtractionMessages,
  parseExtractionOutput,
} from './extraction-prompt'

const SEGMENTS: TranscriptSegment[] = [
  { speaker: 'S01', startMs: 0, endMs: 2000, text: 'Mimi ni Wanjiru.' },
  { speaker: 'S02', startMs: 2000, endMs: 5000, text: 'Nina toa elfu moja.' },
]

describe('buildExtractionMessages', () => {
  it('puts the system prompt first and the real transcript last', () => {
    const messages = buildExtractionMessages(SEGMENTS)
    expect(messages[0]!.role).toBe('system')
    const last = messages[messages.length - 1]!
    expect(last.role).toBe('user')
    expect(last.content).toContain('[S01] Mimi ni Wanjiru.')
    expect(last.content).toContain('[S02] Nina toa elfu moja.')
  })

  it('includes few-shot examples as user/assistant pairs', () => {
    const messages = buildExtractionMessages(SEGMENTS)
    // system + at least one (user, assistant) example pair + final user turn
    expect(messages.length).toBeGreaterThanOrEqual(4)
  })
})

describe('parseExtractionOutput', () => {
  it('parses clean JSON output', () => {
    const raw = JSON.stringify({
      attendees: ['Wanjiru'],
      contributions: [],
      loans: [],
      decisions: [],
      minutesSummary: 'Short meeting.',
    })
    const result = parseExtractionOutput(raw)
    expect(result.attendees).toEqual(['Wanjiru'])
  })

  it('strips markdown code fences the model adds anyway', () => {
    const raw = `Here you go:\n\`\`\`json\n${JSON.stringify({
      attendees: ['Kamau'],
      contributions: [],
      loans: [],
      decisions: [],
      minutesSummary: 'Short meeting.',
    })}\n\`\`\``
    const result = parseExtractionOutput(raw)
    expect(result.attendees).toEqual(['Kamau'])
  })

  it('throws ExtractionValidationError on invalid JSON', () => {
    expect(() => parseExtractionOutput('not json at all')).toThrow(ExtractionValidationError)
  })

  it('throws ExtractionValidationError when schema fields are missing', () => {
    const raw = JSON.stringify({ attendees: ['Wanjiru'] })
    expect(() => parseExtractionOutput(raw)).toThrow(ExtractionValidationError)
  })
})
