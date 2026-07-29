# Cost ledger — SMB Q&A Agent (prototype)

**Budget:** $20/month (owner-set, 2026-07-27), single provider for now.

## Providers table
| Service | What it's for | Plan | Cap (hard/soft/none) | Alert thresholds | Invoice destination | Kill switch |
|---|---|---|---|---|---|---|
| Anthropic API | Chat completion for the prototype (Claude Haiku 4.5) | Pay-as-you-go, prepaid | **Hard cap in practice** (2026-07-28): ~$6 prepaid balance, auto-reload disabled — spend physically cannot exceed the loaded balance, tighter than the original $20 target | Not separately configured — the prepaid-balance-plus-no-auto-reload approach makes formal $10/$16 alerts less critical, since the ceiling is already lower and hard | REPLACE_WITH_BILLING_EMAIL | Revoke/rotate `ANTHROPIC_API_KEY` in `.env` and restart the server without it — endpoint fails closed with no key present; balance exhaustion also fails closed on its own |

## Code-level prevention (decisions/002, revised by 003)
- Per-IP rate limit: 20 req / 15 min
- Per-session cap: 40 messages
- Idle session timeout: 15 min
- Conversation history truncated to last 10 turns per request
- Output capped at 500 tokens/response
- One handoff-summary LLM call per session (decisions/003), priced into the daily cap below
- **Global daily hard stop: 45 requests/day** (revised down from 75 in decisions/003 to absorb the per-session summary call cost), fails closed with a plain-language message once hit
- All figures configurable via `.env`, not hardcoded

## Monthly entries
| Date | Anthropic actual | Total | vs budget | Anomalies | Actions taken |
|---|---|---|---|---|---|
| REPLACE_WITH_DATE | REPLACE_WITH_AMOUNT | REPLACE_WITH_AMOUNT | REPLACE_WITH_DELTA | REPLACE_WITH_NOTES | REPLACE_WITH_ACTIONS |

## Free-tier tripwires
- None — Anthropic API is pay-as-you-go from the first token, no free tier to track here.

## Outstanding — owner action required
- [x] Provider-side spend protection — resolved 2026-07-28 via prepaid balance (~$6) with auto-reload disabled, rather than a formal console spend-limit setting. Functionally equivalent (spend cannot exceed loaded balance) and tighter than originally planned.
- Note: $6 gives ~9-10 days of runway at worst-case max daily usage (45 req/day cap hit every day), well under a full month — app fails gracefully (existing 502 handling) if balance runs out, but expect to reload if the test runs the full 6-8 weeks.
