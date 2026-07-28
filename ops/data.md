# Data inventory — SMB Q&A Agent (prototype)

Lightweight version per `5-data-lifecycle` (jump-gate applicable at any phase — this project has no
database yet, just flat files, so the full backup/migration/deletion apparatus does not apply; the
inventory and retention discipline still does).

## What is stored

| What | Where | Personal data? | Why it's needed | Retention | How it's deleted |
|---|---|---|---|---|---|
| Chat transcripts + LLM-generated summaries (decisions/003, revised by 005/006) | `client-chats/*.md` on the server's local disk; same content also emailed to `OWNER_EMAIL` if configured (decisions/006), and readable via the admin dashboard (`/admin.html`, own `ADMIN_CODE`) | Yes, intentionally as of decisions/005 — the assistant now asks for a phone number or email so the owner can deliver a quotation; a client may also volunteer other personal info in free text | Lets the business owner follow up with the client, deliver a quotation, and see gaps in the docs | Duration of the Phase 0 test (6-8 weeks) | Manual file deletion by the owner; no automated tooling in this round. Email copies live in the owner's dedicated Gmail account until manually deleted there too. |
| Usage log (request counts, session prefixes, cap hits) | `usage.log` on the server's local disk | No — session IDs are truncated, no message content | Cost/abuse visibility during the test | Duration of the test | Manual file deletion |
| Business docs (pricelist/services) | `src/docs/business-docs.txt` | No — business's own public-facing content | Grounds the assistant's answers | Indefinite while the prototype runs | Manual edit/delete |

## Explicitly NOT in place (acceptable for a disposable Phase 0 test, NOT before a real launch)

- No backup of `client-chats/` — lives only on whatever machine runs the server
- No tested restore procedure — there is nothing to restore from
- No automated deletion/export mechanism if a client asks for their data — would be handled by hand,
  by the owner, by finding and deleting/copying the relevant `.md` file
- No encryption at rest beyond whatever the hosting disk provides by default

## Revisit if

This project continues past the Phase 0 test window. Before any real launch: real retention policy,
an actual deletion/export procedure (tested with a test session, not just documented), and a decision
on where transcripts live if the server needs to run on more than one instance.
