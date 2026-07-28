# DECISION 003 — Per-session handoff summary + transcript for the business owner

**Date:** 2026-07-27
**Phase:** Phase 0 — Validate (prototype track of decisions/001)
**Status:** accepted
**Decided by:** owner

## Decision
At the end of every chat session (client clicks "End chat", the session idle-times-out, or hits its message cap), the server writes one Markdown file to `client-chats/` containing:
- Session metadata (start/end time, message count, end reason)
- A short LLM-generated summary for the business owner: what the client wanted, any question the assistant couldn't answer from the docs (flagged as a content gap), and whether the client seemed ready to book/be contacted
- The full raw transcript below the summary

No email or notification service is added in this round — the owner reads the files directly (or via whatever sync/folder-sharing they already use). Adding real delivery (email, SMS, Slack) is a separate paid-service decision, not bundled into this one.

## Context
Owner asked mid-build for a handoff mechanism: after a chat, the business owner needs a summary plus the full log, so they can follow up with the client or fill in a booking/next step by hand. This is exactly the "pass it on" half of the original product idea (grounded answers now, human handoff for anything requiring judgment or action) — validating it is part of what decision 001's test is for, not a new hypothesis.

This adds one extra LLM call per **session** (not per message), which changes the cost math from decision 002.

### Revised cost math (supersedes the 75/day figure in decision 002)
Worst-case degenerate scenario: every session is exactly one message (maximizes summary-calls-per-message-cap, since one summary is generated per session regardless of length).
- Per-message worst case (cold cache): ~$0.0085 (unchanged from decision 002)
- Per-session summary call: ~4k input tokens (full transcript context) × $1/M + 300 output tokens × $5/M ≈ **$0.0055**
- Combined worst case per "session" at the degenerate 1-message case: ~$0.0140
- At the original 75/day cap: 75 × 30 × $0.0140 ≈ **$31.50/month** — over budget
- **Revised daily cap: 45/day** → 45 × 30 × $0.0140 ≈ **$18.90/month** — under the $20 ceiling even in this pessimistic case. Realistic sessions (multiple messages per session) cost meaningfully less, since the summary cost is amortized across more messages.

`.env` and `ops/costs.md` updated to `DAILY_REQUEST_CAP=45`.

## Data handling note (flagged per 5-data-lifecycle, jump-gate applicable at any phase)
- Chat transcripts may contain personal information a client volunteers (name, phone, email) even though the assistant never asks for it.
- These files are local disk only, gitignored, no backup mechanism — acceptable for a 6-8 week disposable test, explicitly NOT acceptable if this continues past Phase 0 without revisiting (real retention/export/deletion mechanics required before any real launch — see `ops/data.md`).
- Retention for this round: kept for the duration of the test; deleted when the test ends or the project is killed/archived.

## Options considered
| Option | For | Against |
|---|---|---|
| Local Markdown file per session, LLM summary + full transcript (chosen) | Zero new paid services; directly answers the request; naturally captures doc gaps for the owner to fix | Owner must check a folder manually; no notification when a new one lands |
| Email delivery via a transactional email provider | Owner gets notified without checking a folder | New paid service — needs its own decision file, budget line, and provider research; not needed to validate the core hypothesis |
| No summary, raw transcript only | Saves the extra LLM call/cost | Owner has to read the whole conversation to extract anything useful — defeats the point of a "handoff" |

## Consequences
- One additional Haiku call per session, priced into the daily cap above.
- `client-chats/` holds real (if lightly) personal data with no backup/export/deletion tooling — acceptable now, a hard blocker before any real launch.
- If summary generation fails (API error), the file still gets written with a placeholder noting the failure, plus the full raw transcript — the owner never loses the underlying log even if the summary step breaks.

## Revisit if
This continues past the Phase 0 test window — real deletion/export mechanics and a decision on notification (email/SMS) must be made before any real launch, not carried forward on the prototype's shortcuts.
