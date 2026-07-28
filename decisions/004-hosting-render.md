# DECISION 004 — Hosting: Render (Starter + persistent disk)

**Date:** 2026-07-28
**Phase:** Phase 0 — Validate (prototype track of decisions/001)
**Status:** accepted
**Decided by:** owner

## Decision
Host the existing Node/Express prototype on Render, Starter instance
(512MB RAM / 0.5 CPU, confirmed via Render's own `docs/compute-plans`),
with a persistent disk add-on mounted and referenced through a new
`DATA_DIR` environment variable so `client-chats/*.md` and `usage.log`
survive redeploys and restarts (`src/server.js`).

This runs **alongside**, not instead of, a parallel experiment where Manus
builds its own equivalent app on its own platform (`ops/manus-build-prd.md`).
Neither track is chosen yet — this decision covers only how *our own*
existing build gets a public URL.

## Context
The prototype needs a stable public link for the pilot partner's clients as
part of the Phase 0 test (decisions/001). Owner has existing Vercel and
Supabase accounts but no existing Node-hosting account; owner confirmed a
~$7/month hosting budget is manageable, separate from the $20/month LLM
ceiling (`ops/costs.md`).

Two requirements ruled out the obvious default (Vercel serverless):
- The app's session state, daily request cap, and handoff-file writes
  (`server.js`) are all in-memory/local-disk and assume a single, long-running
  process — a stateless serverless model would let the daily cost cap reset
  per cold instance and risk losing the `client-chats/` handoff files
  entirely, which is the actual deliverable for the business owner.
- Rearchitecting onto Vercel + Supabase (replacing in-memory state with
  Postgres) was considered and rejected for this round: real, if modest,
  refactor work against a disposable 6-8 week test that doesn't need it.

## Options considered
| Option | For | Against |
|---|---|---|
| **Render, Starter + persistent disk (chosen)** | Flat, predictable $7/mo price matching stated budget; paid tier confirmed not to sleep (`docs/free` vs `docs/compute-plans`); persistent disk preserves data under its mount path across deploys/restarts (`docs/disks`); simple git-push deploy; near-zero code change (one env var) | Exact disk $/GB price not confirmed via primary source at decision time — flagged below; only the disk's mount path survives a deploy, not the rest of the filesystem, so `DATA_DIR` must point there correctly |
| Railway | Supports persistent volumes | No free tier since 2023, usage-metered pricing made the real total cost unreliable to estimate from available sources at research time; less predictable than Render's flat fee |
| Fly.io | Cheaper in principle (~$3.50-4.50/mo estimated) | More operational surface (flyctl, per-region machines, manual volume attachment) than a disposable test warrants |
| Rearchitect onto Vercel + Supabase | No new account; arguably better long-term architecture | Real refactor of in-memory session/counter/file-write logic into Postgres — scope beyond what a throwaway Phase 0 vehicle needs; Phase 2 re-decides the real architecture anyway if this continues |
| Manus (own platform, own domain) | Could eliminate the hosting decision entirely if it builds a working equivalent | Being run as a genuinely separate parallel experiment (`ops/manus-build-prd.md`), not adopted here — outcome unknown at time of this decision |

Research conducted 2026-07-28 via Render's own docs (`render.com/docs/compute-plans`,
`render.com/docs/disks`, `render.com/docs/web-services`) plus a general web
search for comparison; the search results were mostly low-authority
comparison-site content, not primary sources, so treat anything not
cross-checked against Render's own docs as directional only.

## Consequences
- Requires the owner to: create a Render account, connect this repo, choose
  the Starter instance, attach a persistent disk, set all required env vars
  (`ANTHROPIC_API_KEY`, `ACCESS_CODE`, `DATA_DIR` pointed at the disk's mount
  path, plus the existing safeguard vars from `.env.example`), and deploy.
  None of this has been done yet — this decision records the choice, not
  its execution.
- **UNCHECKED:** the exact persistent-disk price per GB — Render's pricing
  page did not yield this via automated fetch. Confirm at signup before
  treating the $7/month figure as the full hosting cost.
- The daily request cap and session state remain in-memory (unchanged from
  decisions/002/003) — on Render's paid tier this only resets on an actual
  redeploy or crash, not on a sleep/wake cycle, which is a smaller exposure
  window than serverless but not zero.
- No staging environment or branch→environment mapping has been set up —
  disproportionate ceremony for a single-owner, single-environment,
  disposable test. If this continues past Phase 0, Phase 5 (Ship) must
  establish this properly before any real production push.

## Revisit if
- The confirmed disk price meaningfully changes the monthly total
- Manus's parallel build (`ops/manus-build-prd.md`) comes back with a
  demonstrably better answer to the same requirements
- This continues past the Phase 0 test window — proper staging/production
  separation and the Phase 5 skills apply at that point, not before
