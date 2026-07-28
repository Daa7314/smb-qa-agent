# SMB Q&A Agent — Phase 0 prototype

<!-- This is a disposable test vehicle (decisions/001), not the production build. -->
<!-- If the Phase 0 test resolves CONTINUE, Phase 2 (Design) re-decides the real stack properly. -->

## What this is and why
A grounded Q&A chat agent for a small business: the owner's pricelist/services docs go into
`src/docs/business-docs.txt`, and clients chat with an assistant that answers only from that
material. Built to run decision 001's parallel prototype track alongside a manual concierge test.

**Status:** prototype, not yet run with a real client audience.
**Tier:** not yet confirmed (Phase 1 hasn't happened) — this is a throwaway Tier-1-ish build to
generate a signal, not a scoped Tier 2 product.

## Setup
```
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY (your existing key) and choose an ACCESS_CODE to share with the partner's clients
# paste the partner's real pricelist/services content into src/docs/business-docs.txt
npm start
```
Then open `http://localhost:3000`.

## Required environment variables
- `ANTHROPIC_API_KEY` — your Anthropic API key. Never commit this; `.env` is gitignored.
- `ACCESS_CODE` — shared secret given to the partner's real clients so the public link isn't wide open to anyone.
- `DATA_DIR` — where `client-chats/` and `usage.log` get written. Leave blank locally (defaults to the project root). In production, set to the mounted persistent-disk path (decisions/004) so this data survives redeploys.
- `PORT`, `DAILY_REQUEST_CAP`, `SESSION_MESSAGE_CAP`, `SESSION_IDLE_TIMEOUT_MINUTES`, `RATE_LIMIT_WINDOW_MINUTES`, `RATE_LIMIT_MAX_PER_IP`, `MAX_OUTPUT_TOKENS` — spend/abuse safeguards, see decisions/002 and 003 for the reasoning behind the defaults.

## Hosting (decisions/004)
Render, Starter instance + persistent disk — chosen over Railway, Fly.io, and
rearchitecting onto Vercel+Supabase for this disposable test (see the decision
file for the full tradeoff). One environment only, no staging tier — disproportionate
for a single-owner 6-8 week test; Phase 5 establishes this properly if the project continues.

**Owner action still required, not yet done:** create the Render account, connect this
repo, attach a persistent disk, set `DATA_DIR` to its mount path, set the remaining env
vars above, deploy — then run one live end-to-end test before sharing the access code.

A parallel experiment is separately evaluating whether Manus can build and host an
equivalent app on its own platform (`ops/manus-build-prd.md`) — not chosen, not this
project's hosting, until compared side by side with this one.

## Spend safeguards (decisions/002, 003)
Budget ceiling: **$20/month**, owner-set 2026-07-27. Enforced by, in order:
1. Per-IP rate limit, per-session message cap, idle timeout, truncated context, capped output tokens, and a global daily request hard-stop (code-level — this repo)
2. A hard spend cap on the Anthropic console (provider-level — **owner to confirm/set**, see `ops/costs.md` outstanding items)
3. Billing alerts at $10/$16 (**owner to confirm/set**, see `ops/costs.md`)

Layer 1 is done. Layers 2 and 3 are the owner's action — code limits alone are not sufficient per the cost-control standard.

## Client-facing handoff (decisions/003)
Every finished chat session (client clicks "End chat," idle-times-out, or hits its message cap)
writes one file to `client-chats/` (gitignored — see `ops/data.md` for what's in there and why):
a short summary for the business owner (what the client wanted, any doc gaps the assistant
couldn't answer from, whether they seemed ready to book/be contacted) plus the full raw transcript.

## Constraints
- Single tenant, single vertical for this test — see decisions/001. Not multi-tenant yet.
- No database — all state is in-memory (sessions) or flat files (`client-chats/`, `usage.log`).
  Does not survive a server restart or scale past one instance. Fine for a 6-8 week test, not fine past it.
- No real auth system — access is a shared code, not per-user accounts.

## Operations
- Cost ledger: `ops/costs.md`
- Data inventory and retention: `ops/data.md`
- Runbook: not yet written — this is pre-Phase-5; if the test continues, Phase 5/6 skills own this
