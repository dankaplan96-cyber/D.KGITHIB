'use strict';
// ════════════════════════════════════════════════════════════════
// First-run setup, login, password change, screen lock
// ════════════════════════════════════════════════════════════════

const SESSION_KEY = 'nm3.session';
const IDLE_LOCK_MIN = 30;

function renderAuth(soft = false) {
  if (soft) {
    if (App.booting) return;
    if (!$('.auth')) return;
    const a = document.activeElement;
    if (a && a.matches('input') && a.value) return;
  }
  const users = Object.values(db().users);
  const folderLine = Store.connected
    ? `<div class="banner info" style="margin:0">${icon('cloud')}<div class="grow small">מחובר לתיקייה המשותפת <b>${esc(Store.folderName)}</b></div></div>`
    : '';
  let body;
  if (!users.length) body = setupHTML(folderLine);
  else {
    const perm = Store.status === 'needs-permission'
      ? `<div class="banner crit" style="margin:0">${icon('lock')}<div class="grow small">כדי לקבל את רשימת המשתמשים והנתונים העדכניים יש לאשר גישה לתיקייה המשותפת.</div><button class="btn sm pri" data-act="auth-grant">אישור גישה</button></div>` : '';
    body = `<div class="box"><div class="logo">${icon('hospital', 24)}</div><h1>מערכת ניהול סיעוד</h1><div class="muted small">${esc(db().settings.orgName)} · כניסה למערכת</div>
      <form class="stack" style="margin-top:20px" id="login-form" autocomplete="on">
        ${perm}${folderLine}
        ${fieldHTML('שם משתמש', '<input class="inp" id="li-user" autocomplete="username" autofocus>')}
        ${fieldHTML('סיסמה', '<input class="inp" id="li-pass" type="password" autocomplete="current-password">')}
        <div id="li-err" class="small" style="color:var(--crit);min-height:18px"></div>
        <button class="btn pri lg" type="submit" style="justify-content:center">כניסה</button>
      </form>
      ${Store.status === 'local' ? `<div class="foot"><a href="#" data-act="auth-connect">חיבור לתיקייה משותפת</a></div>` : ''}
      ${window.__NM_TRIAL_USERS__ ? `<div class="banner info" style="margin-top:14px"><div class="grow small"><b>קובץ ניסיון — משתמשים לבדיקה:</b><br>${window.__NM_TRIAL_USERS__.map((x) => `<a href="#" data-act="trialfill" data-u="${esc(x.username)}" data-p="${esc(x.password)}"><bdi dir="ltr">${esc(x.username)} / ${esc(x.password)}</bdi></a> — ${esc(x.displayName)}`).join('<br>')}<br><span class="faint">לחיצה על משתמש ממלאת את הפרטים</span></div></div>` : ''}
      ${db().legacy ? '<div class="foot">המשתמשים הועברו מהגרסה הקודמת של המערכת — נכנסים עם שם המשתמש והסיסמה הקודמים.</div>' : ''}
      <div class="foot"><a href="#" data-act="auth-reset">${Store.folderName ? `מחובר לתיקייה "${esc(Store.folderName)}" · ` : ''}בחירת תיקייה אחרת / התחלה מחדש במחשב זה</a></div>
      <div class="foot">אין סיסמה? יש לפנות להנהלת הסיעוד (מנהל/ת המערכת).</div></div>`;
  }
  document.body.innerHTML = `<div class="auth">${body}</div><div id="toasts"></div>`;
  const f = $('#login-form');
  if (f) f.addEventListener('submit', (e) => { e.preventDefault(); doLogin(); });
  const s = $('#setup-form');
  if (s) s.addEventListener('submit', (e) => { e.preventDefault(); doSetup(); });
}

function setupHTML(folderLine) {
  const connected = Store.connected;
  const needs = Store.status === 'needs-permission';
  return `<div class="box wide"><div class="logo">${icon('hospital', 24)}</div><h1>ברוכים הבאים למערכת ניהול סיעוד</h1>
    <div class="muted small">הקמה ראשונית. המערכת עובדת מתוך תיקייה משותפת ברשת — כל המשתמשים עובדים על אותו מאגר נתונים.</div>
    <div class="steps">
      <div class="step ${connected ? 'done' : ''}"><div class="n">${connected ? '✓' : '1'}</div><div class="grow" style="flex:1">
        <div class="b">חיבור לתיקייה המשותפת</div>
        <div class="small muted">יש לבחור את התיקייה ברשת שבה נמצא קובץ המערכת. אם המערכת כבר הוקמה במחשב אחר — הנתונים והמשתמשים ייטענו ממנה.</div>
        ${connected ? folderLine : `<div class="row" style="margin-top:8px"><button class="btn pri" data-act="${needs ? 'auth-grant' : 'auth-connect'}">${icon('folder', 16)} ${needs ? 'אישור גישה לתיקייה' : 'בחירת התיקייה המשותפת'}</button></div>`}
      </div></div>
      <div class="step"><div class="n">2</div><div style="flex:1">
        <div class="b">הקמת חשבון הנהלת הסיעוד (מנהל/ת המערכת)</div>
        <div class="small muted">חשבון זה יכול להקים משתמשים נוספים ולקבוע הרשאות.${connected ? '' : ' <b>מומלץ להתחבר לתיקייה לפני ההקמה.</b>'}</div>
        <form class="stack" id="setup-form" style="margin-top:10px">
          ${fieldHTML('שם הארגון / בית החולים', `<input class="inp" id="su-org" value="${esc(db().settings.orgName)}">`)}
          <div class="grid g2">${fieldHTML('שם לתצוגה', '<input class="inp" id="su-name" value="הנהלת הסיעוד">')}${fieldHTML('שם משתמש', '<input class="inp ltr" id="su-user" value="admin" style="text-align:left">')}</div>
          <div class="grid g2">${fieldHTML('סיסמה', '<input class="inp" id="su-pass" type="password" autocomplete="new-password">', { hint: 'לפחות 8 תווים, אותיות וספרות' })}${fieldHTML('אימות סיסמה', '<input class="inp" id="su-pass2" type="password" autocomplete="new-password">')}</div>
          <div id="su-err" class="small" style="color:var(--crit);min-height:18px"></div>
          <button class="btn pri lg" type="submit" style="justify-content:center">הקמת המערכת</button>
        </form>
      </div></div>
    </div></div>`;
}

Object.assign(ACT, {
  trialfill: (el) => { $('#li-user').value = el.dataset.u; $('#li-pass').value = el.dataset.p; $('#login-form button[type=submit]').focus(); },
  'auth-reset': async () => {
    if (!(await confirmBox('בחירת תיקייה אחרת', 'החיבור לתיקייה הנוכחית והעותק המקומי במחשב זה יימחקו, ותוכלו לבחור תיקייה אחרת או להקים מערכת חדשה.<br><br><b>הנתונים שבתיקייה עצמה לא נמחקים.</b>', { ok: 'המשך' }))) return;
    await Store.disconnect();
    await IDB.del('nm3.local'); await IDB.del('nm3.base');
    Store.db = normalizeDB(emptyDB()); Store.base = null; Store.baseRev = 0; Store.dirty = false;
    renderAuth();
  },
  'auth-connect': async () => { try { await Store.pickFolder(); toast('התיקייה חוברה', 'ok'); } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'err'); } renderAuth(); },
  'auth-grant': async () => { try { await Store.grantPermission(); toast('הגישה אושרה', 'ok'); } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'err'); } renderAuth(); },
});

async function doSetup() {
  const org = $('#su-org').value.trim(), name = $('#su-name').value.trim(), user = $('#su-user').value.trim().toLowerCase();
  const p1 = $('#su-pass').value, p2 = $('#su-pass2').value;
  const err = (m) => { $('#su-err').textContent = m; };
  if (!name || !user) return err('יש למלא שם ושם משתמש');
  if (!/^[a-z0-9._-]{3,}$/.test(user)) return err('שם המשתמש: אותיות באנגלית/ספרות בלבד, לפחות 3 תווים');
  const pp = passwordProblem(p1, user);
  if (pp) return err(pp);
  if (p1 !== p2) return err('הסיסמאות אינן תואמות');
  if (Object.keys(db().users).length) return renderAuth();
  if (!Store.connected && !(await confirmBox('הקמה ללא תיקייה משותפת', 'המערכת תוקם במחשב זה בלבד, ומשתמשים אחרים לא יראו את הנתונים עד לחיבור התיקייה המשותפת. להמשיך?', { ok: 'המשך' }))) return;
  const cred = await hashPassword(p1);
  const id = U.uid('usr');
  const u = { id, username: user, displayName: name, role: 'admin', perms: ['*'], depts: [], cred, active: true, mustChange: false, createdAt: U.nowISO(), lastLogin: U.nowISO() };
  Store.user = u;
  Store.update((d) => { d.settings.orgName = org || d.settings.orgName; d.users[id] = u; }, ['הקמת מערכת', `נוצר משתמש מנהל: ${user}`]);
  await Store.saveNow();
  startSession(u);
}

async function doLogin() {
  const username = $('#li-user').value.trim().toLowerCase(), pw = $('#li-pass').value;
  const err = (m) => { $('#li-err').textContent = m; };
  if (!username || !pw) return err('יש להזין שם משתמש וסיסמה');
  const u = Object.values(db().users).find((x) => x.username === username);
  if (!u || !u.active) { await new Promise((r) => setTimeout(r, 400)); return err('שם משתמש או סיסמה שגויים'); }
  if (u.lockedUntil && Date.now() < u.lockedUntil) return err(`החשבון נעול זמנית עקב ניסיונות כושלים. ניתן לנסות שוב בעוד ${Math.ceil((u.lockedUntil - Date.now()) / 60000)} דקות.`);
  err('');
  $('#login-form button[type=submit]').disabled = true;
  const ok = await verifyPassword(pw, u.cred);
  $('#login-form button[type=submit]').disabled = false;
  if (!ok) {
    const fails = (u.failed || 0) + 1;
    Store.update((d) => {
      const x = d.users[u.id];
      x.failed = fails;
      if (fails >= LOCK_AFTER_FAILS) { x.lockedUntil = Date.now() + LOCK_MINUTES * 60000; x.failed = 0; }
    }, ['כניסה נכשלה', username]);
    return err(fails >= LOCK_AFTER_FAILS ? `החשבון ננעל ל-${LOCK_MINUTES} דקות` : 'שם משתמש או סיסמה שגויים');
  }
  Store.user = u;
  Store.update((d) => { const x = d.users[u.id]; x.failed = 0; x.lockedUntil = null; x.lastLogin = U.nowISO(); }, ['כניסה למערכת', u.displayName]);
  startSession(db().users[u.id]);
  if (u.mustChange) changePasswordDialog(true);
}

function startSession(u) {
  App.user = u;
  Store.user = u;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id, at: Date.now() }));
  App.lastActivity = Date.now();
  document.body.innerHTML = '';
  const [view, id, tab] = location.hash.replace(/^#/, '').split('/');
  App.route = view && App.views[view] ? { view, params: { id, tab } } : { view: firstAllowedView(), params: {} };
  render();
  Store.presence(App.route.view);
}

function logout() {
  if (window.__NM_DEMO__) { toast('במצב הדגמה אין יציאה מהמערכת'); return; }
  if (App.user) Store.update(() => {}, ['יציאה מהמערכת', App.user.displayName]);
  Store.saveNow();
  sessionStorage.removeItem(SESSION_KEY);
  App.user = null; Store.user = null;
  while (modalStack.length) closeModal();
  renderAuth();
}

function changePasswordDialog(forced) {
  const m = openModal({
    title: forced ? 'יש לבחור סיסמה אישית' : 'שינוי סיסמה', size: 'sm',
    body: `<div class="stack">${forced ? '<div class="banner info" style="margin:0">הסיסמה הנוכחית היא זמנית. יש לבחור סיסמה אישית כדי להמשיך.</div>' : fieldHTML('סיסמה נוכחית', '<input class="inp" id="cp-old" type="password">')}
      ${fieldHTML('סיסמה חדשה', '<input class="inp" id="cp-new" type="password" autocomplete="new-password">', { hint: 'לפחות 8 תווים, אותיות וספרות' })}
      ${fieldHTML('אימות סיסמה חדשה', '<input class="inp" id="cp-new2" type="password" autocomplete="new-password">')}
      <div id="cp-err" class="small" style="color:var(--crit)"></div></div>`,
    footer: `<button class="btn pri" id="cp-save">שמירה</button>${forced ? '' : '<button class="btn" data-act="closemodal">ביטול</button>'}`,
    onClose: forced ? () => logout() : null,
  });
  m.querySelector('#cp-save').addEventListener('click', async () => {
    const err = (t) => { m.querySelector('#cp-err').textContent = t; };
    const u = db().users[App.user.id];
    if (!forced && !(await verifyPassword(m.querySelector('#cp-old').value, u.cred))) return err('הסיסמה הנוכחית שגויה');
    const p = m.querySelector('#cp-new').value;
    const pp = passwordProblem(p, u.username);
    if (pp) return err(pp);
    if (p !== m.querySelector('#cp-new2').value) return err('הסיסמאות אינן תואמות');
    const cred = await hashPassword(p);
    Store.update((d) => { d.users[u.id].cred = cred; d.users[u.id].mustChange = false; }, ['שינוי סיסמה', u.displayName]);
    modalStack.pop().ov.remove();
    toast('הסיסמה עודכנה', 'ok');
  });
}

function lockScreen() {
  if (window.__NM_DEMO__) return;
  if (!App.user || $('#lock-ov')) return;
  const m = openModal({
    title: 'המסך נעול', size: 'sm', id: 'lock-ov',
    body: `<div class="stack"><div class="muted">${esc(App.user.displayName)} — יש להזין סיסמה כדי להמשיך</div>${fieldHTML('סיסמה', '<input class="inp" id="lk-pass" type="password" autofocus>')}<div id="lk-err" class="small" style="color:var(--crit)"></div></div>`,
    footer: '<button class="btn pri" id="lk-ok">פתיחה</button><button class="btn" id="lk-out">החלפת משתמש</button>',
  });
  const ov = m.parentElement;
  ov.style.background = 'rgba(15,23,42,.92)';
  m.querySelector('[data-act=closemodal]').remove();
  const unlock = async () => {
    if (await verifyPassword(m.querySelector('#lk-pass').value, db().users[App.user.id].cred)) { modalStack = modalStack.filter((x) => x.ov !== ov); ov.remove(); App.lastActivity = Date.now(); }
    else m.querySelector('#lk-err').textContent = 'סיסמה שגויה';
  };
  m.querySelector('#lk-ok').addEventListener('click', unlock);
  m.querySelector('#lk-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock(); });
  m.querySelector('#lk-out').addEventListener('click', () => { modalStack = modalStack.filter((x) => x.ov !== ov); ov.remove(); logout(); });
}
setInterval(() => { if (App.user && Date.now() - App.lastActivity > IDLE_LOCK_MIN * 60000) lockScreen(); }, 30000);
document.addEventListener('mousemove', U.debounce(() => { App.lastActivity = Date.now(); }, 1000));
