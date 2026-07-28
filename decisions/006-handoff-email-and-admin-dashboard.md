# DECISION 006 — Handoff email notification + admin dashboard

**Date:** 2026-07-28
**Phase:** Phase 0 — Validate (prototype track of decisions/001)
**Status:** accepted
**Decided by:** owner

## Decision
Two additions to close the gap where the business owner had no non-technical way
to read handoff summaries (Render's Shell access was the only path before this,
and assumes technical comfort the owner doesn't have):

1. **Email notification** — on session finalize, in addition to writing the
   existing `client-chats/*.md` file, send an email via Gmail SMTP (`nodemailer`)
   with the summary at the top, a divider, then the full transcript. Sent from a
   **dedicated Gmail account created only for this app** (not the owner's personal
   inbox), to an `OWNER_EMAIL` the owner actually checks. Optional/soft-configured:
   if the three env vars aren't all set, email is skipped and the file write
   (already the load-bearing copy) is unaffected.
2. **Admin dashboard** — a second authenticated web page (`public/admin.html`,
   `/api/admin/*` routes) protected by its own `ADMIN_CODE`, completely separate
   from the client-facing `ACCESS_CODE`. Lists session files, lets the owner open
   one and read it in a browser. No shell, no file system access needed.

## Context
The owner flagged that Render Shell access (proposed as the zero-build fix in the
prior session turn) assumes technical skills the actual pilot partner won't have —
a fair correction. The owner separately floated giving the *client* a "you'll get a
summary" confirmation as a trust-building hook; WhatsApp was identified as the
best product fit for this Nigerian audience but deferred until post-funding
(Business API verification/template approval is slow and not worth it for a POC).
Email and SMS were considered as the near-term option; SMS was dropped because it
can't practically carry the summary content itself (too short, no formatting) and
would still need something else for the actual package - so it would only solve
"notify," not "deliver," while email does both in one message.
Resend was evaluated for the email piece but requires custom domain verification
before it will deliver to a real inbox (checked against Resend's own docs,
2026-07-28) - the owner does not want to buy a domain for this POC, so Gmail SMTP
via a dedicated account was chosen as the bootstrap alternative.

## Options considered
| Option | For | Against |
|---|---|---|
| **Gmail SMTP (dedicated account) + custom admin dashboard (chosen)** | Zero new cost, no domain purchase, works today; dashboard needs no technical skill from the owner | More code to maintain than either piece alone; Gmail SMTP is a bootstrap solution, not built for scale |
| Resend/Brevo (real email API) | Better deliverability at scale, cleaner sender reputation | Requires a verified custom domain (Resend) or unconfirmed setup friction (Brevo) - owner explicitly does not want to buy a domain right now |
| Render Shell only (no email, no dashboard) | Zero new code | Requires technical comfort the actual business owner (pilot partner) doesn't have - not viable for real use, not just non-ideal |
| SMS-only notification | Simple "new lead" ping | Can't carry the actual summary/transcript content - still needs a second delivery mechanism for the package itself |
| WhatsApp Business API now | Best product fit for this audience | Requires Meta business verification and template approval (days, not hours) - disproportionate for a POC, explicitly deferred by owner until post-funding |

## Consequences
- **Using a personal Gmail account here would be a mistake** - a dedicated,
  purpose-created account is required so a leaked App Password (which is not
  cryptographically scoped to send-only; Google accepts it for SMTP, IMAP, and
  POP alike) can't expose real personal email history. This was flagged to the
  owner explicitly before proceeding.
- The admin dashboard is a new, unauthenticated-by-default attack surface if
  `ADMIN_CODE` isn't set - the route rejects all codes in that case (fails closed),
  but the owner must actually set a real code before relying on it.
- `ADMIN_CODE`, `GMAIL_APP_PASSWORD` join the existing secrets that must never be
  committed or exposed client-side (build/CONDUCT-delta.md §5 safety floor).
- Gmail's own sending limits (~500/day for a standard account) are far above this
  app's existing 45/day hard cap, so no new cost-control math is needed.
- Filename-based admin session reads are restricted to the exact generated
  handoff-filename pattern (`YYYY-MM-DD-xxxxxxxx.md`) to prevent path traversal.

## Revisit if
This continues past Phase 0, or volume grows enough that Gmail SMTP's informal
sending limits become a real constraint - at that point, a real transactional
email provider with a verified domain (Resend, Brevo, etc.) replaces this, and
WhatsApp Business API becomes worth its setup cost once there's paying traction.
