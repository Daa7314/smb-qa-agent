// Admin-only page. Same rule as chat.js: textContent only, never innerHTML with file content.

const gateSection = document.getElementById('gate');
const dashboardSection = document.getElementById('dashboard');
const gateForm = document.getElementById('gate-form');
const adminCodeInput = document.getElementById('admin-code-input');
const gateError = document.getElementById('gate-error');
const logoutBtn = document.getElementById('logout-btn');
const sessionList = document.getElementById('session-list');
const emptyNote = document.getElementById('empty-note');
const listCard = document.getElementById('list-card');
const detailCard = document.getElementById('detail-card');
const detail = document.getElementById('detail');
const closeDetailBtn = document.getElementById('close-detail');

function showDashboard() {
  gateSection.classList.remove('active');
  dashboardSection.classList.add('active');
  logoutBtn.style.display = '';
  loadSessions();
}

async function loadSessions() {
  sessionList.innerHTML = '';
  try {
    const res = await fetch('/api/admin/sessions');
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 440) {
        dashboardSection.classList.remove('active');
        gateSection.classList.add('active');
        logoutBtn.style.display = 'none';
      }
      return;
    }
    emptyNote.style.display = data.files.length === 0 ? '' : 'none';
    for (const filename of data.files) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = filename; // textContent only - filename comes from the server's file list
      btn.addEventListener('click', () => openSession(filename));
      li.appendChild(btn);
      sessionList.appendChild(li);
    }
  } catch (err) {
    // best-effort - leave the list empty rather than throw
  }
}

async function openSession(filename) {
  try {
    const res = await fetch(`/api/admin/sessions/${encodeURIComponent(filename)}`);
    const data = await res.json();
    if (!res.ok) return;
    detail.textContent = data.content; // textContent only - never innerHTML with chat content
    listCard.style.display = 'none';
    detailCard.style.display = '';
  } catch (err) {
    // best-effort
  }
}

closeDetailBtn.addEventListener('click', () => {
  detailCard.style.display = 'none';
  listCard.style.display = '';
});

gateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  gateError.textContent = '';
  try {
    const res = await fetch('/api/admin/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: adminCodeInput.value }),
    });
    const data = await res.json();
    if (!res.ok) {
      gateError.textContent = data.error || 'Something went wrong.';
      return;
    }
    showDashboard();
  } catch (err) {
    gateError.textContent = 'Could not reach the server. Please try again.';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
  } catch (err) {
    // best-effort
  }
  dashboardSection.classList.remove('active');
  gateSection.classList.add('active');
  logoutBtn.style.display = 'none';
  adminCodeInput.value = '';
  gateError.textContent = '';
});
