# STATE — SMB Q&A Agent

**Domain package:** standards/build
**Size/tier:** not yet confirmed — pending Phase 1 (likely Tier 2: backend, auth, database, multi-tenant, LLM calls)
**Current phase:** Phase 0 — Validate
**Phase started:** 2026-07-27
**Last session:** sessions/2026-07-28-a.md

## Gate status
- [ ] Phase 0 — Validate — handoff: —
- [ ] Phase 1 — Scope — handoff: —
- [ ] Phase 2 — Design — handoff: —
- [ ] Phase 3 — Build — handoff: —
- [ ] Phase 4 — Verify — handoff: —
- [ ] Phase 5 — Ship — handoff: —
- [ ] Phase 6 — Operate — handoff: —

## Outstanding — for later, not blocking right now
- UI polish ("star dust") explicitly deferred by owner 2026-07-28 — current bubble/typing-indicator redesign is judged "ok, not catchy" but owner wants function prioritized over further visual polish right now. Revisit once the core flow (real docs, live test, concierge signal) is further along.
- Owner requested a full repo vulnerability check + cleanup recommendations, deferred until later (2026-07-28). When picked up: load `3-backend-security` (this app has an auth gate, API endpoints, and secrets) plus the `security-review` skill for the actual scan. Repo now exists at github.com/Daa7314/smb-qa-agent (private) with `main`/`dev` branches, first review can run directly against it.

## Currently blocked on
- Owner running the Phase 0 test (decisions/001): concierge Q&A test with the committed POC partner's real clients, in parallel with the prototype below. 6-8 week window. Results not yet in.
- Owner action still needed before real clients can be given the access code: (1) set a hard spend cap on the Anthropic console, (2) set billing alerts at $10/$16, (3) paste the partner's real pricing/services content into `src/docs/business-docs.txt` (business name "August_O" is in, but the actual pricelist/services body is still the placeholder as of 2026-07-28) — see `ops/costs.md`.
- ~~Run one live end-to-end test with a real API key~~ — done 2026-07-28 against the deployed Render instance, confirmed working.

## Gate skips
- none

## Standing notes
- Assistant scope clarified (decisions/005, 2026-07-28): discovery + service recommendation only, no price quoting (this business's pricing is retail/market-rate dependent and fluctuates) — a human delivers the actual invoice. Assistant now asks once for a callback phone/email so that handoff is possible; the handoff summary (decisions/003) now extracts EVENT DETAILS, SERVICES DISCUSSED, CONTACT INFO, CONTENT GAPS, and READINESS as labeled lines. v2 (draft pricing generation) is explicitly deferred until the Phase 0 test signals CONTINUE.
- **Verified live on Render (2026-07-28):** discovery/recommendation flow, contact-info capture, and the labeled handoff summary all confirmed working via a real local test. Business identity + tone added to the system prompt ("client-facing assistant for August Occasions... polite, patient, competent") and separately confirmed live post-redeploy — assistant now proactively opens with "Welcome to August Occasions." A harmless one-message test handoff file was left on Render's persistent disk (`/var/data/client-chats/`) — owner can delete manually.
- Real business content (terms, services, sanitized sample Q&A) added directly to `src/docs/business-docs.txt` by the owner, typed manually to keep any source-document PII out of the AI pipeline entirely — owner's own precaution. Business name set: "August_O" (short UI label) / "August Occasions" (full name used in content and system prompt).
- Three reference image files sitting untracked in `src/docs/` (`price list.jpg`, `sample invoice.png`, sample-questions jpg) — not read by the running app, not yet added to `.gitignore`, not committed. Decision on what to do with them (gitignore, delete, or use for future numeric pricing once v2 pricing is in scope) still open.
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
  1. **Our own build → Render** (decisions/004, 2026-07-28): **Live** at smb-qa-agent.onrender.com — Starter instance + persistent disk (`DATA_DIR=/var/data`) set up, deployed, live end-to-end test passed. Repo: github.com/Daa7314/smb-qa-agent (private), `main`/`dev` branches. **Render does not auto-deploy on push — confirmed manual-only 2026-07-28**; every push to `main` needs an explicit "Deploy latest commit" click. UI redesigned (message bubbles, typing indicator, business name "August_O") and merged to `main` same day — owner judged it "ok, not catchy," deferred further polish (see Outstanding). Exact disk $/GB price still UNCHECKED against Render's own pricing — confirm at signup/first invoice.
  2. **Manus build** (`ops/manus-build-prd.md`, 2026-07-28): Manus builds its own equivalent app on its own platform rather than hosting our code. PRD carries the decisions/002-003 safety floor (access gate, rate/session/daily caps, cost math methodology, handoff-artifact behavior) as hard requirements. Not yet handed to Manus / no output yet as of this session.
  - Do not assume either track is the chosen path — a decision file comparing both is written once Manus's output exists.
