# Chama Assistant — project guide for Claude Code

Offline-first desktop app for chamas (Kenyan savings groups). It records a meeting, transcribes and diarizes it locally with QVAC, extracts minutes and money movements with a local LLM, lets the treasurer review, stores everything in a P2P-synced ledger (Holepunch), and pays out USDT on a testnet via Tether's WDK after M-of-N member approval.

Built for the QVAC hackathon. Full design: `docs/SPEC.md`. Read it before starting a phase.

## Non-negotiable rules
1. **The LLM never moves money.** LLM output is a *proposal*. It is validated with zod, then checked by deterministic code against the ledger before it can become a `PayoutProposal`. Only an approved proposal can trigger a WDK transfer.
2. **No cloud calls at runtime** for AI. All inference goes through `@qvac/sdk` locally. Network is only used for P2P sync and testnet transactions.
3. **Testnet only.** Never write code paths that target mainnet. Never hardcode or log private keys or seed phrases; keep them in the OS keychain or an encrypted local file, never in git.
4. Confirm actual package names and APIs from docs or `node_modules` type definitions before using them (QVAC, WDK, Holepunch APIs change often). Do not invent function names.

## Stack
- Electron + React + TypeScript (Vite). Windows 11 is the dev and demo machine.
- Main process: QVAC SDK, WDK, Holepunch (Hyperswarm, Corestore, Autobase). Renderer: UI only, talks to main over typed IPC (`src/shared/ipc.ts`).
- Validation: zod. Tests: vitest.
- Models live in `models/` (gitignored). Never commit model files.

## Layout
```
src/
  main/          # Electron main: ai/, ledger/, wallet/, p2p/, ipc handlers
  renderer/      # React UI
  shared/        # types, zod schemas, IPC contracts
scripts/         # standalone Node scripts (e.g. pipeline spike)
docs/SPEC.md
fixtures/        # sample meeting audio + expected JSON
```

## Commands
- `npm run dev` — run the app
- `npm test` — unit tests
- `npm run spike:pipeline -- fixtures/meeting1.wav` — transcribe → diarize → extract, prints JSON

## Working style
- Work one phase at a time (see `docs/SPEC.md` → Build plan). Finish, test, commit, then stop and summarize.
- Small commits with clear messages. Feature branches, PR into `main`.
- Prefer simple, readable code over abstractions; this is a hackathon.
- When unsure about a library API, write a 10-line probe script first.
