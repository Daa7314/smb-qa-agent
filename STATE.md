# STATE — SMB Q&A Agent

**Domain package:** standards/build
**Size/tier:** not yet confirmed — pending Phase 1 (likely Tier 2: backend, auth, database, multi-tenant, LLM calls)
**Current phase:** Phase 0 — Validate
**Phase started:** 2026-07-27
**Last session:** sessions/2026-07-27-a.md

## Gate status
- [ ] Phase 0 — Validate — handoff: —
- [ ] Phase 1 — Scope — handoff: —
- [ ] Phase 2 — Design — handoff: —
- [ ] Phase 3 — Build — handoff: —
- [ ] Phase 4 — Verify — handoff: —
- [ ] Phase 5 — Ship — handoff: —
- [ ] Phase 6 — Operate — handoff: —

## Currently blocked on
- Owner running the Phase 0 test (decisions/001): concierge Q&A test with the committed POC partner's real clients, in parallel with the prototype below. 6-8 week window. Results not yet in.
- Owner action needed before the prototype is actually usable: (1) set a hard spend cap on the Anthropic console, (2) set billing alerts at $10/$16, (3) paste the partner's real docs into `src/docs/business-docs.txt`, (4) run one live end-to-end test with a real API key — see `ops/costs.md` and sessions/2026-07-27-a.md.

## Gate skips
- none

## Standing notes
- Working idea: multi-tenant Q&A agent for small businesses — owner uploads docs (pricelist, services, policies), an LLM/agent answers client questions grounded in those docs, optionally routes to handoff or booking depending on workflow complexity. Positioned for businesses with no tech team and no bandwidth to build/maintain this themselves.
- Other verticals beyond the first POC partner (a service company) exist as future targets but are explicitly unvalidated and out of scope for this test.
- Evidence going in is a single committed POC partner (N=1) — thin. Do not let this be treated as validated market demand until the outside-interest criterion below is met.
- Success requires ≥5 business owners OTHER than the POC partner requesting a similar solution for their own business, within 6-8 weeks of the concierge test / prototype starting — interest from the POC partner or their clients alone does not clear the gate.
- Project name "smb-qa-agent" is a placeholder — owner has not settled on a name yet.
- Prototype built this session (decisions/002, 003): Node/Express + Claude Haiku 4.5, single tenant, docs stuffed into a cached system prompt (no vector DB). Lives in this project's `src/`, `public/`, `ops/`. Smoke-tested structurally (server, gating, rate limits, graceful degradation, handoff file generation) with a placeholder API key — never yet run against a live key or real traffic.
- $20/month budget ceiling set 2026-07-27. Code-level safeguards in place: per-IP rate limit, per-session message cap (40), idle timeout (15min), daily hard cap (45 requests/day). Provider-side cap and billing alerts are still the owner's action, not yet confirmed done.
- Per-session handoff (decisions/003): each finished chat writes a summary + full transcript to `client-chats/` (gitignored) for the business owner to review. No email/notification delivery yet — files only.
- Data handling note (`ops/data.md`): client chat transcripts may contain personal info clients volunteer; no backup/deletion tooling exists yet — acceptable for this disposable 6-8 week test, not acceptable before any real launch.
- **Two parallel hosting tracks, side by side, neither chosen yet:**
  1. **Our own build → Render** (decisions/004, 2026-07-28): Starter instance + persistent disk. Code updated for this (`DATA_DIR` env var, `src/server.js`), README and `.env.example` updated. **Not yet deployed** — owner still needs to create the Render account, connect the repo, attach the disk, set env vars (including pointing `DATA_DIR` at the disk's mount path), deploy, and run one live end-to-end test before sharing the access code. Exact disk $/GB price UNCHECKED against Render's own pricing (their pricing page didn't yield it via automated fetch) — confirm at signup.
  2. **Manus build** (`ops/manus-build-prd.md`, 2026-07-28): Manus builds its own equivalent app on its own platform rather than hosting our code. PRD carries the decisions/002-003 safety floor (access gate, rate/session/daily caps, cost math methodology, handoff-artifact behavior) as hard requirements. Not yet handed to Manus / no output yet as of this session.
  - Do not assume either track is the chosen path — a decision file comparing both is written once Manus's output exists.
