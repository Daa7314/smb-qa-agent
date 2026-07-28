# PRD — SMB Q&A Agent (Manus build track)
## Product summary

A single-tenant chat agent for one small service business. The business
owner supplies their own docs (pricelist, services, policies); a client-facing
chat widget answers visitor questions grounded **only** in those docs — never
guessing prices, policies, or availability that aren't in the material. This
is a **disposable 6-8 week validation test** with one committed pilot partner,
not a production system — built to find out whether outside demand exists
for this idea, not to be the permanent architecture. (If it continues past
this test, a separate design phase re-decides the real architecture — do not
over-engineer for permanence.)

---

## Functional requirements

1. **Access gate** — a shared access code (known only to the pilot partner's
   clients) required before any chat interaction. No open, unauthenticated
   entry point to the chat endpoint.
2. **Grounded answers only** — if the answer isn't in the business's docs,
   the assistant says so plainly and suggests contacting the business
   directly. Never invent prices, policies, or availability.
3. **Per-conversation handoff artifact** — at the end of every session
   (client ends chat, idle timeout, or message cap reached), produce one
   record containing:
   - Session metadata: start/end time, message count, end reason
   - A short generated summary for the business owner: what the client
     wanted, any question the assistant couldn't answer from the docs
     (flagged explicitly as a content gap to fill), whether the client
     seemed ready to book or be contacted directly
   - The full raw transcript
   - **This must still be produced even if summary generation fails** —
     write the raw transcript with a placeholder note, never lose the
     underlying log because a secondary step broke.
   The business owner needs to be able to actually read these afterward
   (a folder, a simple dashboard, an export — your call on mechanism, but
   flag it if reaching it requires a new paid service we haven't approved).

---

## Hard requirements — safety floor, do not build without these

Non-negotiable regardless of your architecture choice:

1. No unauthenticated path to the chat endpoint — access gate enforced
   server-side, not just in the UI
2. Per-IP rate limiting on the chat endpoint (reference: 20 req/15min)
3. Per-session message cap, after which the session must restart
   (reference: 40 messages)
4. Idle session timeout (reference: 15 minutes)
5. Conversation history sent to the model bounded — per-request token cost
   must not scale unboundedly with total conversation length
6. Output token cap per response (reference: ~500 tokens)
7. **A global daily hard request cap, enforced server-side, that fails
   closed** with a plain-language "temporarily unavailable" message once
   hit, and logs the event — this is not best-effort, it is the primary
   defense against the cost model below actually being exceeded
8. No API keys or secrets in client-side code, in any repo, or pasted into
   chat with us — tell us where to enter them into your platform's own
   secrets mechanism
9. No unescaped user- or AI-generated content inserted into HTML (XSS)
10. No session identifiers or transcript content in URL parameters or
    localStorage

---

## Cost model — derive your own cap from this, don't copy ours blindly

Our own build uses Claude Haiku 4.5 ($1/$5 per million input/output tokens,
checked 2026-07-27) and derived a **45 requests/day** hard cap to stay under
a **$20/month** ceiling, using worst-case cold-cache math (~$0.0085/message +
~$0.0055/session-summary-call, at the degenerate case of one message per
session). That reference number is specific to that model and architecture —
**if you choose a different model or approach, redo this math and pick a
daily cap that actually holds your real cost under $20/month, worst case,**
and show the arithmetic the way we did (don't assert a number without it —
this is a checkable claim, not a judgment call).

Hosting/infrastructure cost is separate from the $20/month LLM ceiling —
report it separately, whatever it is on your platform.

---

## Data handling

- Transcripts may contain personal info a client volunteers (name, phone,
  email) even though the assistant never asks for it
- Acceptable for this 6-8 week round: no backup, no automated export/deletion
  tooling, manual deletion by the owner, retention limited to the test window
- **Not acceptable:** data persisted somewhere the owner can't easily find
  and delete manually, or retained beyond the test window by default — flag
  explicitly if your platform's model doesn't support easy manual deletion

---

## Explicitly out of scope for this build

- Multi-tenant support (multiple businesses/doc sets)
- Booking or calendar integration
- Email/SMS/Slack notification delivery
- An admin dashboard beyond what's needed to read handoff artifacts
- Anything beyond one business, one doc set, one pilot partner

---

## What "done" looks like

A public URL, gated by the access code, that the business owner can hand to
their pilot partner's clients — with all ten hard requirements demonstrably
in place, not just asserted.

## What we want back (this is also an evaluation of your approach)

- The architecture/stack you chose, and why
- A completed checklist against the 10 hard requirements above — how each
  one is actually implemented, specifically
- Where and how to enter the two secret values (access code, model API key)
- Your derived daily cap and the cost math behind it (per the cost model
  section — show the arithmetic)
- How the business owner reaches the handoff artifacts
- Portability: if this graduates past the test window, can the owner export
  or migrate off your platform, or does continuing mean staying on it?
- The resulting public URL

---
*Generated 2026-07-28. Supersedes `ops/manus-delivery-brief.md` for the Manus
track. See this project's `STATE.md` and `decisions/001-003` for full
context, deliberately not included here to keep this scoped to the build task.*
