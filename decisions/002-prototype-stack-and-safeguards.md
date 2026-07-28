# DECISION 002 — Prototype stack and spend safeguards

**Date:** 2026-07-27
**Phase:** Phase 0 — Validate (prototype track of decisions/001)
**Status:** accepted
**Decided by:** owner

## Decision
Build the bare-bones prototype (decision 001's parallel track) as:

- **Runtime:** Node.js + Express, single small server — minimal dependencies, fast to stand up, portable to any host later.
- **Model:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via the Anthropic API — $1/$5 per million input/output tokens (checked 2026-07-27). Chosen over Sonnet 5 for this cost-capped test: the task (grounded Q&A over a single business's own docs) doesn't need frontier reasoning, and Haiku's lower per-token cost gives more margin under a $20/month hard ceiling.
- **Grounding approach:** the partner's docs are stuffed directly into a cached system prompt (Anthropic prompt caching, `cache_control: ephemeral`) — no vector DB or chunking. At small-business pricelist/services scale (expected low tens of KB), this fits comfortably in-context and caching cuts repeat-read cost ~90%. Re-evaluate if the partner's real doc set turns out far larger than expected.
- **Exposure control:** no real auth system exists yet, so the public link is gated by a shared access code (known only to the partner's clients), plus:
  - Per-IP rate limit: 20 requests / 15 minutes
  - Per-session cap: 40 messages, then session must restart (fresh access-code entry)
  - Idle session timeout: 15 minutes of inactivity ends the session
  - Conversation history sent to the model truncated to the last 10 turns, bounding per-request token growth regardless of total conversation length
  - Output capped at 500 tokens per response
  - **Global daily hard stop: 75 requests/day** across all sessions — once hit, the endpoint fails closed with a plain-language "temporarily unavailable" message and logs the event, rather than continuing to serve
- All limits are `.env`-configurable, not hardcoded, so they can be loosened/tightened without a code change.

## Context
This is a disposable Phase 0 test vehicle (see decisions/001) that will be exposed to a real business's real clients over a public link, calling a paid API. The cost-control standard (`6-cost-control`) requires prevention-layer limits in code whenever a paid service is added, in any phase — this isn't deferred to Phase 6 just because the project hasn't reached it yet. Owner set a hard ceiling of **$20/month** for this test and already holds an Anthropic API account/key.

### Cost math behind the 75/day figure
Worst-case per-message estimate (cold cache — a session starting after a >5-minute gap since the last one): ~5k input tokens for docs (uncached, ~$1/M) + ~1k tokens of truncated history (~$1/M) + 500 output tokens (~$5/M) ≈ **$0.0085/message**.
75 messages/day × 30 days × $0.0085 ≈ **$19.10/month** — under the $20 ceiling even assuming every message is a cache miss, which is the pessimistic case. Warm-cache messages cost roughly half that, so the realistic monthly figure should land well under this ceiling.

## Options considered
| Option | For | Against |
|---|---|---|
| Node/Express + Haiku 4.5 + stuffed cached context (chosen) | Minimal code, cheapest per-token model, no infra beyond one small server, fits a disposable test | Not the eventual multi-tenant architecture — Phase 2 will re-decide properly if this continues |
| Sonnet 5 instead of Haiku | Likely better answer quality | ~3-5x the per-token cost of Haiku for a task that doesn't obviously need it; tighter budget margin under a hard $20 cap |
| OpenAI Responses API + vector store (file search) | Handles larger doc sets natively | Per-call charges ($2.50/1000 calls) plus storage on top of generation cost; more moving parts than a single-tenant test needs; Assistants API (older path) is being deprecated Aug 2026 |
| No code-level limits, rely on provider console cap alone | Less code to write | Violates the standard's "prevention + provider cap + alerts, all three layers" rule; a console cap alone still lets the bill run up to that cap before anyone notices, and provides no session/abuse shaping |

## Consequences
- Real users can be told "temporarily unavailable" mid-test if the daily cap is hit — acceptable for a test, would need revisiting before any real launch.
- In-memory rate/session/daily counters do not survive a server restart or scale past one instance — fine for a single-tenant test, not fine past that.
- Owner is still responsible for the second and third layers of defence this skill requires: a **provider-side hard spend cap on the Anthropic console** (not just code limits) and **billing alerts at 50%/80% of budget ($10/$16)** wired somewhere checked same-day. Code-level limits alone are not sufficient per the standard.

## Revisit if
The daily cap is hit more than twice in the test window (signals either real demand exceeding the throwaway design, or abuse worth investigating) — either case is logged in the session log and raised with the owner, not quietly raised without discussion.
