// Client-side only: no API key here, everything paid goes through /api/* on the server.
// All rendered text uses textContent, never innerHTML, so nothing here can inject HTML/script.

const gateSection = document.getElementById('gate');
const chatSection = document.getElementById('chat');
const gateForm = document.getElementById('gate-form');
const codeInput = document.getElementById('code-input');
const gateError = document.getElementById('gate-error');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const endChatButton = document.getElementById('end-chat');
const log = document.getElementById('log');
const starterChips = document.getElementById('starter-chips');

const STARTER_QUESTIONS = [
  'What services do you offer?',
  "I'm planning a wedding - can you help?",
  'Do you have wine or soft drinks?',
  'How does pricing work?',
];

function renderStarterChips() {
  starterChips.replaceChildren();
  for (const question of STARTER_QUESTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = question; // textContent only - hardcoded starter text, not user/model content
    btn.addEventListener('click', () => {
      messageInput.value = question;
      chatForm.requestSubmit();
    });
    starterChips.appendChild(btn);
  }
}

function clearStarterChips() {
  starterChips.replaceChildren();
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text; // textContent only - never innerHTML with model or user content
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing-indicator';
  div.setAttribute('aria-label', 'Assistant is typing');
  for (let i = 0; i < 3; i++) div.appendChild(document.createElement('span'));
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

gateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  gateError.textContent = '';
  try {
    const res = await fetch('/api/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeInput.value }),
    });
    const data = await res.json();
    if (!res.ok) {
      gateError.textContent = data.error || 'Something went wrong.';
      return;
    }
    gateSection.classList.remove('active');
    chatSection.classList.add('active');
    appendMessage('assistant', 'Hi! Ask me anything about our services and pricing.');
    renderStarterChips();
  } catch (err) {
    gateError.textContent = 'Could not reach the server. Please try again.';
  }
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  clearStarterChips();
  appendMessage('user', text);
  messageInput.value = '';
  messageInput.disabled = true;
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    hideTyping();
    if (!res.ok) {
      appendMessage('error', data.error || 'Something went wrong.');
      if (res.status === 440) {
        chatSection.classList.remove('active');
        gateSection.classList.add('active');
      }
    } else {
      appendMessage('assistant', data.reply);
    }
  } catch (err) {
    hideTyping();
    appendMessage('error', 'Could not reach the server. Please try again.');
  } finally {
    messageInput.disabled = false;
    messageInput.focus();
  }
});

endChatButton.addEventListener('click', async () => {
  endChatButton.disabled = true;
  try {
    await fetch('/api/end', { method: 'POST' });
  } catch (err) {
    // best-effort - the server also finalizes idle sessions on its own
  }
  chatSection.classList.remove('active');
  gateSection.classList.add('active');
  log.replaceChildren();
  clearStarterChips();
  codeInput.value = '';
  gateError.textContent = '';
  endChatButton.disabled = false;
});
