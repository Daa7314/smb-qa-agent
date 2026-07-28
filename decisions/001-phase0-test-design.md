# DECISION 001 — Phase 0 kill-test design

**Date:** 2026-07-27
**Phase:** Phase 0 — Validate
**Status:** accepted
**Decided by:** owner

## Decision
Run a concierge test (rung 3) in parallel with a bare-bones prototype build, scoped to a single tenant and vertical, before any Phase 1 scoping:

- **Scope:** the committed POC partner only (a service business with a pricelist/services catalogue). Other verticals are explicitly excluded from this round — unvalidated, not assumed to generalize.
- **Concierge track:** owner (or partner staff) manually answers the partner's real incoming client questions using the partner's docs — no agent code required for this track. Purpose: confirm the underlying friction (slow manual walkthroughs) is actually relieved by grounded, fast answers, and surface the real question patterns clients ask, before those patterns get baked into a build.
- **Prototype track:** a minimal agent/LLM prototype is built in parallel, targeting the same partner's docs, so the team isn't idle waiting on the concierge signal and the build gets shaped by real questions as they come in.
- **Window:** 6-8 weeks, matching the owner's stated runway before needing a signal.

## Context
Owner's evidence going in is a single committed POC partner (N=1) — a real commitment, but not yet evidence the problem is common across small businesses. The current alternative being replaced is manual chat walkthroughs by the business, which the owner has observed take too long and still don't scale. Building a full prototype to answer "is this worth building" would repeat the classic Phase 0 failure (rung 4 to answer a rung 1 question) — but because a real partner and real clients are already available, a concierge test can run for the cost of the owner's time, and doesn't have to block prototype work given the fixed 6-8 week runway.

## Options considered
| Option | For | Against |
|---|---|---|
| Concierge + parallel prototype (chosen) | Tests the real hypothesis (grounded answers reduce friction) cheaply via concierge; doesn't burn runway waiting since prototype builds alongside; prototype gets shaped by real question patterns as they surface | Some prototype effort is sunk cost if concierge signal comes back negative; running both at once is more for the owner to coordinate than either alone |
| Concierge only, then prototype after | Cleanest test — no wasted build effort if the idea is killed | Given a fixed 6-8 week total runway, sequencing eats into the very runway the owner said they can't extend |
| Prototype only (rung 4) | Fastest to a "real" demo | Skips the ladder — answers "can we build it," not "should we." Risks confirming enthusiasm from a partner who already committed, not independent demand |
| Landing page + waitlist (rung 2) | Cheap, scales past personal network | Doesn't touch the actual multi-tenant / grounded-answer hypothesis, and the owner already has a better rung 3 option available |

## Consequences
- Owner (or partner staff) personally handles real client questions by hand during the concierge window — a real time cost, not automated.
- Prototype build work begins before the core hypothesis is confirmed; if the test comes back KILL or PIVOT, that build effort does not carry forward assuming the same premise.
- Verticals other than the POC partner's remain completely unvalidated after this test — must not be generalized from a single-vertical result.
- The ≥5-outside-business-owner criterion (see STATE.md) is the actual gate — enthusiasm from the POC partner or their clients, on its own, does not clear it.

## Revisit if
Fewer than 5 business owners outside the POC partner request a similar solution within the 6-8 week window, OR the concierge test shows no real friction reduction for the partner's clients (e.g. they still escalate to human/phone despite grounded answers) — either triggers a KILL or PIVOT decision, not a quiet lowering of the bar.
