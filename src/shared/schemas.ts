import { z } from 'zod'

// Ledger entities — confirmed, persisted records. See docs/SPEC.md → Data model.

export const MemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  deviceKey: z.string(),
  walletAddress: z.string(),
})
export type Member = z.infer<typeof MemberSchema>

export const MeetingSchema = z.object({
  id: z.string(),
  date: z.string(), // ISO 8601
  attendees: z.array(z.string()), // memberId[]
  minutes: z.string(),
  language: z.enum(['sw', 'en', 'mixed']),
  transcriptHash: z.string(),
})
export type Meeting = z.infer<typeof MeetingSchema>

export const ContributionSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  memberId: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
})
export type Contribution = z.infer<typeof ContributionSchema>

export const LoanSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  principal: z.number().positive(),
  ratePct: z.number().nonnegative(),
  dueDate: z.string(), // ISO 8601
  meetingId: z.string(),
})
export type Loan = z.infer<typeof LoanSchema>

export const DecisionSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  text: z.string().min(1),
})
export type Decision = z.infer<typeof DecisionSchema>

export const ApprovalSchema = z.object({
  memberId: z.string(),
  sig: z.string(),
})
export type Approval = z.infer<typeof ApprovalSchema>

export const PayoutProposalStatusSchema = z.enum(['pending', 'approved', 'paid', 'rejected'])
export type PayoutProposalStatus = z.infer<typeof PayoutProposalStatusSchema>

export const PayoutProposalSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  amount: z.number().positive(),
  reason: z.string(),
  createdBy: z.string(),
  approvals: z.array(ApprovalSchema),
  threshold: z.number().int().positive(),
  status: PayoutProposalStatusSchema,
  txHash: z.string().optional(),
})
export type PayoutProposal = z.infer<typeof PayoutProposalSchema>

// LLM output — a proposal only. Names, not ids: the treasurer resolves these
// to member ids in the review step before anything is written to the ledger.
// See CLAUDE.md rule 1 — the LLM never moves money.

export const ExtractedContributionSchema = z.object({
  memberName: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string(),
})
export type ExtractedContribution = z.infer<typeof ExtractedContributionSchema>

export const ExtractedLoanSchema = z.object({
  memberName: z.string().min(1),
  principal: z.number().positive(),
  ratePct: z.number().nonnegative(),
  dueDate: z.string(),
})
export type ExtractedLoan = z.infer<typeof ExtractedLoanSchema>

export const ExtractedDecisionSchema = z.object({
  text: z.string().min(1),
})
export type ExtractedDecision = z.infer<typeof ExtractedDecisionSchema>

export const ExtractedPayoutDueSchema = z.object({
  memberName: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string(),
})
export type ExtractedPayoutDue = z.infer<typeof ExtractedPayoutDueSchema>

export const MeetingExtractionSchema = z.object({
  attendees: z.array(z.string().min(1)),
  contributions: z.array(ExtractedContributionSchema),
  loans: z.array(ExtractedLoanSchema),
  decisions: z.array(ExtractedDecisionSchema),
  payoutDue: ExtractedPayoutDueSchema.optional(),
  minutesSummary: z.string(),
})
export type MeetingExtraction = z.infer<typeof MeetingExtractionSchema>

// Transcription + diarization output — the input to extraction.

export const TranscriptSegmentSchema = z.object({
  speaker: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  text: z.string(),
})
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>
