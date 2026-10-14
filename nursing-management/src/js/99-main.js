'use strict';
// ════════════════════════════════════════════════════════════════
// Boot
// ════════════════════════════════════════════════════════════════
(async function boot() {
  App.booting = true;
  document.body.innerHTML = '<div class="auth"><div class="box" style="text-align:center">טוען את המערכת…</div></div>';
  try {
    await Store.init();
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `<div class="auth"><div class="box"><h1>שגיאה בטעינת המערכת</h1><p>${U.esc(e.message)}</p><p class="muted small">יש לפתוח את הקובץ ב-Google Chrome או Microsoft Edge.</p></div></div>`;
    return;
  }
  if (window.__NM_SEED_ADMIN__) await seedTestAdmin(window.__NM_SEED_ADMIN__);
  let sess = null;
  try { sess = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { sess = null; }
  const u = sess && db().users[sess.id];
  App.booting = false;
  if (u && u.active) startSession(u); else renderAuth();
})();

// Hooks for the automated browser tests (enabled only by the test harness)
if (window.__NM_TEST__) {
  window.addEventListener('nm-test-edit', (e) => setEmpField(e.detail.id, 'notes', e.detail.val));
  window.__nmPeek = (id) => db().employees[id] && db().employees[id].notes;
}

// Test builds only (node build.js --test-admin): creates/repairs a known admin
// account and clears login lockouts. Never included in the regular file.
async function seedTestAdmin({ username, password, displayName }) {
  const cred = await hashPassword(password);
  const existing = Object.values(db().users).find((u) => u.username === username);
  Store.update((d) => {
    const id = existing ? existing.id : U.uid('usr');
    d.users[id] = { ...(existing || { id, createdAt: U.nowISO(), lastLogin: '' }), username, displayName, role: 'admin', perms: ['*'], depts: [], cred, active: true, mustChange: false, failed: 0, lockedUntil: null };
    Object.values(d.users).forEach((u) => { u.failed = 0; u.lockedUntil = null; });
  }, ['משתמש ניסיון', `${username} הוקם/אופס מקובץ ניסיון`]);
  await Store.saveNow();
}

// Show / hide password: an eye button is added to every password field
function enhancePasswords(root = document) {
  root.querySelectorAll('input[type=password]:not([data-pw])').forEach((inp) => {
    inp.dataset.pw = '1';
    const wrap = document.createElement('div');
    wrap.className = 'pwwrap';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pweye'; btn.tabIndex = -1; btn.title = 'הצגת הסיסמה';
    btn.innerHTML = icon('eye', 17);
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.classList.toggle('on', show);
      btn.title = show ? 'הסתרת הסיסמה' : 'הצגת הסיסמה';
      inp.focus();
    });
    wrap.appendChild(btn);
  });
}
new MutationObserver(() => enhancePasswords()).observe(document.documentElement, { childList: true, subtree: true });
