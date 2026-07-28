// Phase 0 disposable test prototype. See decisions/001, 002, 003 and ops/costs.md, ops/data.md.
// Not the production architecture - Phase 2 (Design) re-decides the real stack if this continues.

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const Anthropic = require('@anthropic-ai/sdk');

const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'ACCESS_CODE'];
for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    console.error(`Missing required env var ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT || 3000);
const DAILY_REQUEST_CAP = Number(process.env.DAILY_REQUEST_CAP || 45);
const SESSION_MESSAGE_CAP = Number(process.env.SESSION_MESSAGE_CAP || 40);
const SESSION_IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES || 15) * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000;
const RATE_LIMIT_MAX_PER_IP = Number(process.env.RATE_LIMIT_MAX_PER_IP || 20);
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 500);
const HISTORY_TURNS_KEPT = 10; // last N messages sent to the model as context, cost control only
const ADMIN_SESSION_IDLE_TIMEOUT_MS = Number(process.env.ADMIN_SESSION_IDLE_TIMEOUT_MINUTES || 30) * 60 * 1000;
const ADMIN_RATE_LIMIT_MAX_PER_IP = Number(process.env.ADMIN_RATE_LIMIT_MAX_PER_IP || 10);

// Email notification (decisions/006) - optional. If not configured, handoffs still write
// to disk as before; only the email step is skipped, with a one-time startup warning.
const EMAIL_ENABLED = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.OWNER_EMAIL);
const mailer = EMAIL_ENABLED
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
  : null;

const DOCS_PATH = path.join(__dirname, 'docs', 'business-docs.txt');
// DATA_DIR: point this at a persistent-disk mount path in production (decisions/004) so
// client-chats/ and usage.log survive redeploys. Defaults to the project root for local dev.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
const CLIENT_CHATS_DIR = path.join(DATA_DIR, 'client-chats');
if (!fs.existsSync(CLIENT_CHATS_DIR)) fs.mkdirSync(CLIENT_CHATS_DIR, { recursive: true });

const businessDocs = fs.readFileSync(DOCS_PATH, 'utf8');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- In-memory state (single-instance prototype only - does not survive restart or scale) ---
const sessions = new Map(); // sessionId -> { contextMessages, fullTranscript, count, lastActive, createdAt }
let dailyCounter = { date: todayKey(), count: 0 };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function checkAndIncrementDailyCap() {
  const key = todayKey();
  if (dailyCounter.date !== key) dailyCounter = { date: key, count: 0 };
  if (dailyCounter.count >= DAILY_REQUEST_CAP) return false;
  dailyCounter.count += 1;
  return true;
}

function logUsage(sessionId, note) {
  const line = `${new Date().toISOString()} session=${sessionId.slice(0, 8)} daily_count=${dailyCounter.count}/${DAILY_REQUEST_CAP} ${note}\n`;
  fs.appendFile(path.join(DATA_DIR, 'usage.log'), line, () => {});
}

// --- Handoff generation: runs once per session, at session end, not per message ---
async function finalizeSession(sessionId, session, reason) {
  if (session.finalized || session.fullTranscript.length === 0) return;
  session.finalized = true;

  const transcriptText = session.fullTranscript
    .map((m) => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  let summary = 'REPLACE_WITH_SUMMARY_UNAVAILABLE (summary generation failed - see raw transcript below)';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system:
        'Summarize this client chat for the business owner as short labeled lines, under 150 words total, ' +
        'plain text, no markdown headers. Cover: EVENT DETAILS (occasion type, guest count, date, venue, ' +
        'drink preferences - whatever was mentioned, or "not discussed"), SERVICES DISCUSSED (what was ' +
        'recommended or asked about), CONTACT INFO (phone or email the client provided - if none was ' +
        'given, write exactly "not provided - unable to follow up with a quotation"), CONTENT GAPS (any ' +
        'question the assistant could not answer from the business docs, flagged for the owner to fill in), ' +
        'and READINESS (does the client seem ready to move forward).',
      messages: [{ role: 'user', content: transcriptText }],
    });
    summary = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  } catch (err) {
    console.error('Handoff summary generation failed:', err.message);
  }

  const startedAt = new Date(session.createdAt).toISOString();
  const endedAt = new Date().toISOString();
  const fileName = `${todayKey()}-${sessionId.slice(0, 8)}.md`;
  const fileBody = [
    `# Client chat handoff`,
    ``,
    `**Started:** ${startedAt}`,
    `**Ended:** ${endedAt}`,
    `**End reason:** ${reason}`,
    `**Messages exchanged:** ${session.count}`,
    ``,
    `## Summary`,
    summary,
    ``,
    `## Full transcript`,
    transcriptText,
    ``,
  ].join('\n');

  fs.writeFile(path.join(CLIENT_CHATS_DIR, fileName), fileBody, (err) => {
    if (err) console.error('Failed to write handoff file:', err.message);
  });
  logUsage(sessionId, `HANDOFF_WRITTEN reason=${reason} file=${fileName}`);

  if (EMAIL_ENABLED) {
    try {
      await mailer.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.OWNER_EMAIL,
        subject: `New client inquiry - August Occasions (${todayKey()})`,
        text: `${summary}\n\n${'-'.repeat(40)}\n\nFULL CHAT LOG\n\n${transcriptText}`,
      });
    } catch (err) {
      // Local file above is already written - email is a notification convenience on top,
      // never the only copy of the handoff.
      console.error('Handoff email failed to send:', err.message);
    }
  }
}

function pruneIdleSessions() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActive > SESSION_IDLE_TIMEOUT_MS) {
      sessions.delete(id);
      finalizeSession(id, s, 'idle_timeout').catch((err) => console.error(err));
    }
  }
}
setInterval(pruneIdleSessions, 60 * 1000).unref();

// --- Access gate: exchanges the shared access code for a session cookie ---
const accessLimiter = rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX_PER_IP });
app.post('/api/access', accessLimiter, (req, res) => {
  const { code } = req.body || {};
  if (typeof code !== 'string' || code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'Invalid access code.' });
  }
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    contextMessages: [],
    fullTranscript: [],
    count: 0,
    lastActive: Date.now(),
    createdAt: Date.now(),
    finalized: false,
  });
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_IDLE_TIMEOUT_MS,
  });
  res.json({ ok: true });
});

// --- Chat endpoint ---
const chatLimiter = rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX_PER_IP });
app.post('/api/chat', chatLimiter, async (req, res) => {
  const sessionId = req.cookies.session_id;
  const session = sessionId && sessions.get(sessionId);
  if (!session) {
    return res.status(440).json({ error: 'Session expired or not started. Enter the access code again.' });
  }

  if (Date.now() - session.lastActive > SESSION_IDLE_TIMEOUT_MS) {
    sessions.delete(sessionId);
    await finalizeSession(sessionId, session, 'idle_timeout');
    return res.status(440).json({ error: 'Session timed out from inactivity. Enter the access code again.' });
  }

  if (session.count >= SESSION_MESSAGE_CAP) {
    sessions.delete(sessionId);
    await finalizeSession(sessionId, session, 'message_cap_reached');
    return res.status(429).json({ error: 'This conversation has reached its message limit. Please start a new session.' });
  }

  if (!checkAndIncrementDailyCap()) {
    logUsage(sessionId, 'DAILY_CAP_HIT');
    return res.status(503).json({ error: 'This test assistant is temporarily unavailable. Please try again tomorrow.' });
  }

  const { message } = req.body || {};
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
    return res.status(400).json({ error: 'Message must be non-empty text under 2000 characters.' });
  }
  const userText = message.trim();

  session.lastActive = Date.now();
  session.count += 1;
  session.fullTranscript.push({ role: 'user', content: userText });
  session.contextMessages.push({ role: 'user', content: userText });
  session.contextMessages = session.contextMessages.slice(-HISTORY_TURNS_KEPT);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: 'text',
          text:
            'You are the client-facing assistant for August Occasions, grounded ONLY in the reference ' +
            'material below. Be polite, patient, and competent - never rushed or dismissive, even if a ' +
            'client asks something repeatedly or is undecided. Your primary goal is to understand the client\'s event (occasion ' +
            'type, guest count, date, venue, drink preferences) and recommend relevant services from the ' +
            'material. Do not attempt to calculate or quote exact prices - pricing depends on current ' +
            'market rates and is prepared by the team directly, not by you. Once the client\'s event ' +
            'details are clear and they seem engaged, ask for their preferred phone number or email so a ' +
            'team member can follow up with a detailed quotation - a quotation cannot be delivered without ' +
            'this. Ask once, naturally, don\'t be pushy about it, and keep helping either way. If the ' +
            'answer to something isn\'t in the material below, say you don\'t have that information and ' +
            'suggest the person contact the business directly - never guess or invent prices, policies, ' +
            'or availability.\n\n---\n' + businessDocs,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: session.contextMessages,
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    session.fullTranscript.push({ role: 'assistant', content: text });
    session.contextMessages.push({ role: 'assistant', content: text });
    session.contextMessages = session.contextMessages.slice(-HISTORY_TURNS_KEPT);

    logUsage(sessionId, `messages_in_session=${session.count}`);
    res.json({ reply: text });
  } catch (err) {
    console.error('Anthropic API error:', err.message);
    res.status(502).json({ error: 'The assistant is temporarily unavailable. Please try again shortly.' });
  }
});

// --- Explicit end-of-chat: client-triggered clean finish, generates the handoff immediately ---
app.post('/api/end', async (req, res) => {
  const sessionId = req.cookies.session_id;
  const session = sessionId && sessions.get(sessionId);
  res.clearCookie('session_id');
  if (session) {
    sessions.delete(sessionId);
    await finalizeSession(sessionId, session, 'client_ended');
  }
  res.json({ ok: true });
});

// --- Admin dashboard (decisions/006): separate secret and session from the client access code ---
const adminSessions = new Map(); // sessionId -> lastActive
const HANDOFF_FILENAME_PATTERN = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}\.md$/;

function pruneIdleAdminSessions() {
  const now = Date.now();
  for (const [id, lastActive] of adminSessions.entries()) {
    if (now - lastActive > ADMIN_SESSION_IDLE_TIMEOUT_MS) adminSessions.delete(id);
  }
}
setInterval(pruneIdleAdminSessions, 60 * 1000).unref();

function requireAdmin(req, res, next) {
  const id = req.cookies.admin_session;
  const lastActive = id && adminSessions.get(id);
  if (!lastActive || Date.now() - lastActive > ADMIN_SESSION_IDLE_TIMEOUT_MS) {
    adminSessions.delete(id);
    return res.status(440).json({ error: 'Admin session expired or not started.' });
  }
  adminSessions.set(id, Date.now());
  next();
}

const adminAccessLimiter = rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: ADMIN_RATE_LIMIT_MAX_PER_IP });
app.post('/api/admin/access', adminAccessLimiter, (req, res) => {
  const { code } = req.body || {};
  if (!process.env.ADMIN_CODE || typeof code !== 'string' || code !== process.env.ADMIN_CODE) {
    return res.status(401).json({ error: 'Invalid admin code.' });
  }
  const id = crypto.randomUUID();
  adminSessions.set(id, Date.now());
  res.cookie('admin_session', id, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_IDLE_TIMEOUT_MS,
  });
  res.json({ ok: true });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  adminSessions.delete(req.cookies.admin_session);
  res.clearCookie('admin_session');
  res.json({ ok: true });
});

app.get('/api/admin/sessions', requireAdmin, (req, res) => {
  fs.readdir(CLIENT_CHATS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Could not list sessions.' });
    const names = files.filter((f) => HANDOFF_FILENAME_PATTERN.test(f)).sort().reverse();
    res.json({ files: names });
  });
});

app.get('/api/admin/sessions/:filename', requireAdmin, (req, res) => {
  const { filename } = req.params;
  if (!HANDOFF_FILENAME_PATTERN.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }
  fs.readFile(path.join(CLIENT_CHATS_DIR, filename), 'utf8', (err, content) => {
    if (err) return res.status(404).json({ error: 'Session not found.' });
    res.json({ content });
  });
});

app.listen(PORT, () => {
  console.log(`SMB Q&A Agent prototype listening on http://localhost:${PORT}`);
  console.log(`Daily request cap: ${DAILY_REQUEST_CAP} | Session message cap: ${SESSION_MESSAGE_CAP} | Idle timeout: ${SESSION_IDLE_TIMEOUT_MS / 60000}min`);
  console.log(`Client chat handoffs written to: ${CLIENT_CHATS_DIR}`);
  console.log(`Handoff email notifications: ${EMAIL_ENABLED ? 'enabled -> ' + process.env.OWNER_EMAIL : 'disabled (GMAIL_USER/GMAIL_APP_PASSWORD/OWNER_EMAIL not fully set)'}`);
  console.log(`Admin dashboard: ${process.env.ADMIN_CODE ? 'enabled at /admin.html' : 'disabled (ADMIN_CODE not set)'}`);
});
