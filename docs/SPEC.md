# Chama Assistant — spec

## Problem
Chamas run on handwritten minutes, WhatsApp messages and trust in one treasurer. Records get lost, disputes are common, and members can't easily verify balances. Cloud tools need data and expose financial records.

## Solution
A desktop app that turns a recorded meeting into minutes and a verifiable ledger — fully on-device — and releases payouts only when enough members approve.

## Pipeline
1. **Capture** — record meeting audio in the app (or import a file).
2. **Transcribe + diarize** — QVAC Whisper (small/medium, multilingual: Kiswahili, English, code-switching) + QVAC Sortformer diarization. Merge into `[{speaker, start, end, text}]`.
3. **Map speakers** — roll call at meeting start ("Mimi ni Wanjiru") used to map `Speaker N` → member; treasurer can reassign in UI.
4. **Extract** — local LLM (Qwen 2.5 3B Instruct, Q4 GGUF; fall back to 7B if RAM allows) outputs JSON matching `MeetingExtraction` schema. Few-shot prompt, zod validation, retry up to 2x on failure.
5. **Review** — treasurer edits extracted items, confirms.
6. **Ledger** — confirmed items appended to Autobase; all peers compute identical balances.
7. **Approve + pay** — payout proposal shared P2P; members sign approvals with device keys; at M-of-N, treasurer wallet sends tUSDT via WDK on testnet.

## Data model (shared/schemas.ts)
- `Member { id, name, deviceKey, walletAddress }`
- `Meeting { id, date, attendees: memberId[], minutes: string, language, transcriptHash }`
- `Contribution { id, meetingId, memberId, amount, currency }`
- `Loan { id, memberId, principal, ratePct, dueDate, meetingId }`
- `Decision { id, meetingId, text }`
- `PayoutProposal { id, memberId, amount, reason, createdBy, approvals: {memberId, sig}[], threshold, status: 'pending'|'approved'|'paid'|'rejected', txHash? }`
- `MeetingExtraction { attendees, contributions, loans, decisions, payoutDue?, minutesSummary }` — LLM output, names not ids; resolved to ids after review.

## Guardrails (deterministic, in main process)
- Amounts must be positive, ≤ configured max, and payout ≤ pool balance.
- Payout recipient must be an existing member whose turn/rotation matches, or flagged for manual override.
- A proposal can only be paid once (idempotency by proposal id).
- Approvals verified by signature against member device keys; creator's approval doesn't count twice.

## P2P
- Hyperswarm topic = hash(chama id). Invite = share chama key (QR/text).
- Autobase with one writer per member device; view = Hyperbee of balances, meetings, proposals.
- Demo: two app instances on one laptop with different data dirs (`--user-data-dir`).

## Wallet
- WDK EVM wallet module, Sepolia (or other EVM testnet).
- If no test USDT faucet works: deploy a simple ERC-20 "tUSDT" and mint to the treasurer.
- Treasurer wallet only. Roadmap: on-chain multisig (e.g. Safe) instead of app-level M-of-N.

## Build plan
- **Phase 0 — Setup:** Electron+Vite+TS scaffold, lint, vitest, typed IPC, folder layout.
- **Phase 1 — Pipeline spike:** `scripts/pipeline.ts` runs QVAC transcribe → diarize → extract on `fixtures/meeting1.wav`; prints validated JSON. Measure time on laptop CPU.
- **Phase 2 — App + local ledger:** record/import screen, processing view, review/edit screen, Autobase single-device ledger, balances view.
- **Phase 3 — Wallet:** WDK testnet wallet, payout proposal, single-approver payout, show tx hash + explorer link.
- **Phase 4 — P2P:** Hyperswarm sync between two instances, signed approvals, M-of-N threshold.
- **Phase 5 — Polish:** Kiswahili/English minutes toggle, PDF export of minutes, demo script, README with screenshots.

## Demo (3 min)
Wi-Fi off → play recorded meeting → minutes + contributions appear → treasurer fixes one item → second member window shows updated books → Wi-Fi on → two approvals → tUSDT payout lands on testnet.

## Risks
- Kiswahili/Sheng ASR accuracy → test on real audio in Phase 1.
- 3B model JSON reliability → few-shot + retries + schema-guided prompt.
- Library API drift → probe scripts before integration.
