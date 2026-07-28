# Delivery brief for Manus — SMB Q&A Agent prototype

**Purpose of this brief:** get this existing app hosted at a working public URL.
This is a **scoped execution task, not a design or product handoff.** Orchestration,
decisions, and process for this project stay with the owner and their Builder
system (this file's origin) — you are being asked to handle hosting/delivery
of code that already exists, not to redesign it, rearchitect it, or make
product decisions.

This is also an evaluation: the owner wants to see how you approach this
delivery task before deciding whether to use you for it. Please make your
approach visible — see "What we want back" at the end.

---

## What this app is

A single-tenant Node/Express + Anthropic (Claude Haiku 4.5) chat backend that
answers a small business's client questions, grounded in that business's own
docs. It is a **disposable 6-8 week test prototype**, not a production system
— built fast and cheap on purpose, for one committed pilot partner's clients.

- Stack: Node.js, Express, `@anthropic-ai/sdk`
- Entry point: `src/server.js`
- Static frontend: `public/index.html`, `public/chat.js`
- Reference docs the assistant is grounded on: `src/docs/business-docs.txt`
- Full local dev instructions: this project's `README.md`

## Exactly what we need from you

Get the existing codebase running at a stable public URL that the pilot
partner's clients can reach, with **no functional changes to the app itself**
unless a hosting constraint requires it (call out any such change explicitly —
see below).

## Hard constraints — do not deploy in a way that violates any of these

1. **No API keys or secrets in the repo or in client-side code.** The app
   needs two secret values (`ANTHROPIC_API_KEY`, `ACCESS_CODE`) — see
   `.env.example` for the full list of required env vars. **Real secret values
   are intentionally NOT included in this brief or in the repo.** Whatever
   hosting mechanism you use, tell us where to enter them directly (your
   platform's env var / secrets UI) — do not ask us to paste them into chat,
   and do not put them in any file that gets committed.
2. **The existing access-code gate and per-IP/per-session rate limiting must
   stay intact and enforced server-side.** This is the only thing standing
   between the pilot partner's clients and an unauthenticated public endpoint
   that calls a paid LLM API.
3. **Two things currently write to local disk and must survive restarts and
   redeploys**, or the app's core deliverable breaks silently:
   - `client-chats/*.md` — per-conversation summary + transcript, the actual
     handoff artifact the business owner reads. Written in `finalizeSession()`
     in `server.js`.
   - `usage.log` — running usage/cost log.
   If your hosting approach doesn't give these a persistent path by default,
   say so explicitly rather than deploying anyway with data that will vanish.
4. **Budget ceiling: ~$7/month for hosting**, separate from the existing
   ~$20/month Anthropic API budget. If your approach costs more, flag it
   before proceeding rather than after.
5. **Prefer always-on over sleep-on-idle** if there's a choice — a client
   mid-conversation shouldn't hit a multi-second cold start. Not a hard
   blocker for this low-traffic test, but state which behavior your choice has.

## Known limitation in the current code (not yours to fix, just know about it)

Session state and the daily request cap (`sessions` Map, `dailyCounter` in
`server.js`) are in-memory, not persisted. On a normal always-on host this
only resets on an actual redeploy/crash, which is an acceptable, known
tradeoff for this test. If your hosting model restarts the process more
often than that (e.g. serverless, scale-to-zero), flag it — that would
silently blow through the cost-control design this app depends on.

## What we want back

Since this is an evaluation of your approach, please make explicit:
- Which hosting mechanism/platform you used and why
- How you solved the persistent-storage requirement (constraint 3)
- Where/how you want the two secret values entered
- The resulting public URL
- Any code changes you made, listed explicitly (nothing silent — these get
  reviewed on our side before we trust them)
- How future code changes get redeployed (the mechanism, not just "push to deploy")

---
*Generated 2026-07-27 as a delivery brief only — see this project's `STATE.md`
and `decisions/` for full project history and context, not included here by
design (kept this brief scoped to the delivery task).*
