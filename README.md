# Chama Assistant QVAC

**Offline AI minutes and a tamper-evident ledger for savings groups, with payouts that need the group's approval.**

Built for the QVAC hackathon using Tether's local AI stack (QVAC), Holepunch P2P, and the Wallet Development Kit (WDK).

## The problem
Chamas, Kenya's savings groups, run on handwritten minutes, WhatsApp threads and trust in one treasurer. Records get lost, disputes are common, and members can't easily check balances. Cloud tools need mobile data and expose the group's financial records to third parties.

## What it does
1. **Records the meeting** on the treasurer's laptop.
2. **Transcribes and labels speakers on-device.** Works in Kiswahili, English, or a mix, with no internet.
3. **Extracts minutes and money:** attendance, contributions, loans, decisions, and the next payout.
4. **Treasurer reviews** and corrects everything before it's saved.
5. **Shared ledger syncs peer-to-peer** between members' devices, with no central server.
6. **Payouts in USDT (testnet)** are released only after enough members approve.

The AI never moves money. It only proposes, and checks written in ordinary code plus member approvals decide.

## Architecture
| Layer | Technology |
|---|---|
| App | Electron, React, TypeScript |
| Speech-to-text and speaker labels | QVAC (Whisper, Sortformer) |
| Extraction | QVAC local LLM (Qwen 2.5 3B, GGUF) |
| Ledger and sync | Holepunch (Hyperswarm, Autobase) |
| Payouts | Tether WDK on an EVM testnet |

Full design: [docs/SPEC.md](docs/SPEC.md)

## Getting started
Requirements: Windows 10/11 (macOS and Linux should also work), Node.js LTS, about 8 GB RAM, and about 5 GB of disk space for models.

```bash
git clone https://github.com/kadzon/chama-assistant.git
cd chama-assistant
npm install
# download models into ./models (see docs/SPEC.md)
npm run dev
```

To try P2P sync on one machine, run a second instance with its own data folder:
```bash
npm run dev -- --user-data-dir=.userdata2
```

## Status
- [ ] Phase 0: project setup
- [ ] Phase 1: transcribe, label speakers, extract (pipeline test)
- [ ] Phase 2: review screen and local ledger
- [ ] Phase 3: testnet wallet and payouts
- [ ] Phase 4: P2P sync and M-of-N approvals
- [ ] Phase 5: polish and demo

## Safety
- Testnet only. Do not use with real funds.
- Keys and seed phrases are stored locally and never committed.

## Roadmap
On-chain multisig for payouts, a mobile companion app, M-Pesa reconciliation, and more local languages.

## License
[Apache 2.0](LICENSE)
