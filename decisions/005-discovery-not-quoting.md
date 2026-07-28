# DECISION 005 — Assistant scope: discovery + recommendation, not pricing; contact capture required

**Date:** 2026-07-28
**Phase:** Phase 0 — Validate (prototype track of decisions/001)
**Status:** accepted
**Decided by:** owner

## Decision
The assistant's job for this round is **event discovery and service recommendation**,
not price quoting. It should:
- Ask about the client's event (occasion type, guest count, date, venue, drink preferences)
- Recommend relevant services from `business-docs.txt`
- Never calculate or invent exact prices (prices fluctuate with retail/market rates -
  baking numbers into the grounding file would risk quoting something wrong)
- Ask, once and without being pushy, for the client's phone number or email before
  wrapping up, and make clear a quotation cannot be delivered without it
- Defer the actual quotation to a human team member, who prepares it using current
  market prices

Implemented in `server.js`'s chat system prompt (the model's real-time instructions)
and its handoff-summary prompt (`finalizeSession`), which now extracts EVENT DETAILS,
SERVICES DISCUSSED, CONTACT INFO, CONTENT GAPS, and READINESS as labeled lines instead
of a single free-form paragraph — this is the actual "summary the owner can work with,"
building on the handoff mechanism from decisions/003.

## Context
Owner flagged that this business's pricing is retail/market-rate dependent and changes
often, so extrapolating a fixed price list into the grounding file was rejected -
consistent with the existing "never guess prices" rule, this makes it explicit rather
than relying on the model to infer it. Owner also flagged a real gap: nothing in the
prior build asked for or captured a way to reach the client afterward, which means the
human-in-the-loop step (owner sends the real invoice) had no way to actually happen.

## Options considered
| Option | For | Against |
|---|---|---|
| **Discovery + recommendation only, contact capture required (chosen)** | Matches actual pricing volatility; makes the human handoff step actually functional; low engineering cost (prompt-level change only) | Assistant can't close the loop end-to-end yet - still needs a human for pricing |
| Extrapolate/estimate pricing from the sample invoice now | Could give clients an instant ballpark | Retail prices move; an estimate presented confidently risks being taken as a real quote, undermining trust when the real price differs |
| Ask for contact info immediately at the start of every chat | Simple to implement | Pushy, likely to reduce engagement before the client has any reason to trust the assistant |

## Consequences
- The handoff file (`client-chats/*.md`) is now the primary artifact the owner needs to
  actually follow up with a lead - if CONTACT INFO comes back "not provided," that lead
  cannot be converted without the owner manually re-engaging some other way.
- `ops/data.md` should be read as: contact info capture is now an **intentional** part
  of the product, not just incidental data a client happens to volunteer - the existing
  retention/deletion posture (6-8 week test only, manual deletion, no backup) still
  applies and is not being upgraded for this.
- Cost math from decisions/002/003 is unaffected - the summary call's `max_tokens: 300`
  cap is unchanged, just restructured into labeled sections.

## Revisit if
The Phase 0 test signals CONTINUE (per decisions/001's success criterion) - this is the
point to consider a v2 where the system generates a **draft** price estimate from
current inputs (not a client-facing quote) for the owner to review and adjust, once the
core discovery/recommendation loop has demonstrated real value. Not before then.
