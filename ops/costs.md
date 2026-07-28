# Cost ledger — SMB Q&A Agent (prototype)

**Budget:** $20/month (owner-set, 2026-07-27), single provider for now.

## Providers table
| Service | What it's for | Plan | Cap (hard/soft/none) | Alert thresholds | Invoice destination | Kill switch |
|---|---|---|---|---|---|---|
| Anthropic API | Chat completion for the prototype (Claude Haiku 4.5) | Pay-as-you-go | REPLACE_WITH_CAP_STATUS — owner to confirm on console whether a hard spend cap is set, or only alerts | Recommended: $10 (50%) and $16 (80%) — REPLACE_WITH_CONFIRMATION owner has set these | REPLACE_WITH_BILLING_EMAIL | Revoke/rotate `ANTHROPIC_API_KEY` in `.env` and restart the server without it — endpoint fails closed with no key present |

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
- [ ] Confirm whether Anthropic console offers a hard spend cap for this account tier, or alerts only — record the answer above
- [ ] Set billing alerts at $10 and $16, wired to an email/channel checked same-day
- [ ] Verify at least one alert end-to-end (or via the provider's test mechanism) once set up, and log the evidence in a session log
