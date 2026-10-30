import { MeetingExtractionSchema, type TranscriptSegment } from '../../shared/schemas'

// Few-shot prompt for the local LLM extraction step (SPEC.md → Pipeline, step 4).
// Kept deliberately small: one Kiswahili/English code-switched example, one
// English-only example, so the model sees both languages it must handle.

const SYSTEM_PROMPT = `You are a note-taker for a Kenyan chama (savings group) meeting.
You will be given a diarized transcript as [SPEAKER] lines. Extract attendance,
contributions, loan requests, decisions, and any payout due, as JSON matching
exactly this shape (no extra commentary, no markdown fences):

{
  "attendees": string[],
  "contributions": { "memberName": string, "amount": number, "currency": string }[],
  "loans": { "memberName": string, "principal": number, "ratePct": number, "dueDate": string }[],
  "decisions": { "text": string }[],
  "payoutDue": { "memberName": string, "amount": number, "reason": string } | undefined,
  "minutesSummary": string
}

Rules:
- Use the speaker's own name when they introduce themselves ("Mimi ni ..."), not the [SPEAKER] label.
- Only include a contribution/loan/decision if it is explicitly stated in the transcript.
- Omit "payoutDue" entirely if no payout was discussed.
- "minutesSummary" is 2-4 sentences, in the same language mix as the meeting.
- Output must be valid JSON and nothing else.`

const FEW_SHOT_EXAMPLES: Array<{ transcript: string; output: string }> = [
  {
    transcript: `[S01] Mimi ni Wanjiru, karibuni wote.
[S02] Mimi ni Kamau. Nina toa mchango wangu wa elfu tano leo.
[S01] Asante Kamau, elfu tano imepokelewa. Tumeamua mkutano ujao utakuwa tarehe kumi na tano.`,
    output: JSON.stringify({
      attendees: ['Wanjiru', 'Kamau'],
      contributions: [{ memberName: 'Kamau', amount: 5000, currency: 'KES' }],
      loans: [],
      decisions: [{ text: 'Mkutano ujao utakuwa tarehe kumi na tano.' }],
      minutesSummary:
        'Wanjiru alifungua mkutano. Kamau alichangia elfu tano. Tuliamua mkutano ujao utakuwa tarehe kumi na tano.',
    } satisfies import('../../shared/schemas').MeetingExtraction),
  },
  {
    transcript: `[S01] This is Achieng. Let's start the meeting.
[S02] This is Otieno. I'd like to request a loan of three thousand shillings, five percent rate, due end of next month.
[S01] Approved. Otieno's loan of three thousand is due on the last day of next month.`,
    output: JSON.stringify({
      attendees: ['Achieng', 'Otieno'],
      contributions: [],
      loans: [
        { memberName: 'Otieno', principal: 3000, ratePct: 5, dueDate: 'end of next month' },
      ],
      decisions: [{ text: "Otieno's loan request was approved." }],
      minutesSummary:
        'Achieng opened the meeting. Otieno requested and was approved for a 3,000 shilling loan at 5% due end of next month.',
    } satisfies import('../../shared/schemas').MeetingExtraction),
  },
]

export function formatTranscriptForPrompt(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${s.speaker}] ${s.text}`).join('\n')
}

export function buildExtractionMessages(
  segments: TranscriptSegment[],
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]

  for (const example of FEW_SHOT_EXAMPLES) {
    messages.push({ role: 'user', content: example.transcript })
    messages.push({ role: 'assistant', content: example.output })
  }

  messages.push({ role: 'user', content: formatTranscriptForPrompt(segments) })
  return messages
}

export class ExtractionValidationError extends Error {
  constructor(public readonly rawOutput: string, public readonly issues: string) {
    super(`LLM output failed schema validation: ${issues}`)
  }
}

// Strips markdown code fences the model may add despite instructions not to.
function stripCodeFences(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenced ? fenced[1] : raw).trim()
}

export function parseExtractionOutput(rawOutput: string) {
  const candidate = stripCodeFences(rawOutput)
  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch (err) {
    throw new ExtractionValidationError(rawOutput, `not valid JSON (${String(err)})`)
  }

  const result = MeetingExtractionSchema.safeParse(parsed)
  if (!result.success) {
    throw new ExtractionValidationError(rawOutput, result.error.message)
  }
  return result.data
}
