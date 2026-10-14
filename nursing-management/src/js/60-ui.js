'use strict';
// ════════════════════════════════════════════════════════════════
// UI core — shell, routing, dialogs, toasts and event delegation.
// Views are plain functions returning HTML; interactions go through
// data-act="name" attributes handled by ACT[name](el, event).
// ════════════════════════════════════════════════════════════════

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = U.esc;

const ICONS = {
  dash: '<path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"/>',
  people: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>',
  grid: '<path d="M3 3h18v18H3zm2 2v4h6V5zm8 0v4h6V5zM5 11v4h6v-4zm8 0v4h6v-4zM5 17v2h6v-2zm8 0v2h6v-2z"/>',
  swap: '<path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99zM21 9l-3.99-4v3H10v2h7.01v3z"/>',
  chart: '<path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>',
  file: '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z"/>',
  upload: '<path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>',
  download: '<path d="M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z"/>',
  users: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
  cog: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
  plus: '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>',
  search: '<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
  close: '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
  back: '<path d="M4 11h12.17l-5.59-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4z"/>',
  print: '<path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12z"/>',
  folder: '<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8z"/>',
  cloud: '<path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>',
  warn: '<path d="M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z"/>',
  check: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
  edit: '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"/>',
  trash: '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/>',
  lock: '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1z"/>',
  logout: '<path d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>',
  history: '<path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z"/>',
  hospital: '<path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4z"/>',
  eye: '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>',
  refresh: '<path d="M17.65 6.35A7.958 7.958 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/>',
};
const icon = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[n] || ''}</svg>`;

// ── App state ───────────────────────────────────────────────────
const App = {
  user: null,
  route: { view: 'dashboard', params: {} },
  dept: localStorage.getItem('nm3.dept') || 'all',
  lastActivity: Date.now(),
  views: {},
};
const db = () => Store.db;
const can = (perm) => userCan(App.user, perm);
const myDeptIds = () => userDeptIds(db(), App.user);
// Department context: 'all' or a department id the user may see
function currentDeptIds() {
  const mine = myDeptIds();
  if (App.dept !== 'all' && mine.includes(App.dept)) return [App.dept];
  return mine;
}
function singleDept() {
  const mine = myDeptIds();
  if (App.dept !== 'all' && mine.includes(App.dept)) return App.dept;
  return mine[0] || null;
}
function setDept(id) { App.dept = id; localStorage.setItem('nm3.dept', id); render(); }
const canSeeEmp = (e) => e && myDeptIds().includes(e.deptId);

// ── Navigation ──────────────────────────────────────────────────
const NAV = [
  { sec: 'עבודה שוטפת' },
  { view: 'dashboard', label: 'לוח בקרה', icon: 'dash', perm: 'dashboard_view' },
  { view: 'employees', label: 'עובדים', icon: 'people', perm: 'employees_view' },
  { view: 'sheets', label: 'גיליונות הנהלת הסיעוד', icon: 'grid', perm: 'sheets_view' },
  { view: 'movements', label: 'נכנסים ועוזבים', icon: 'swap', perm: 'movements_view' },
  { view: 'staffing', label: 'תקן מקוצר', icon: 'chart', perm: 'staffing_view' },
  { sec: 'דוחות ונתונים' },
  { view: 'reports', label: 'הפקת דוחות', icon: 'file', perm: 'reports_export' },
  { view: 'import', label: 'ייבוא מקבצים', icon: 'upload', perm: 'import_run' },
  { sec: 'ניהול' },
  { view: 'users', label: 'משתמשים והרשאות', icon: 'users', perm: 'users_manage' },
  { view: 'settings', label: 'הגדרות ומחלקות', icon: 'cog', perm: 'settings_edit' },
  { view: 'system', label: 'תיקייה, גיבויים ויומן', icon: 'folder', perm: null },
];
const VIEW_TITLE = Object.fromEntries(NAV.filter((n) => n.view).map((n) => [n.view, n.label]));

function go(view, params = {}) {
  App.route = { view, params };
  const hash = `#${view}${params.id ? '/' + params.id : ''}${params.tab ? '/' + params.tab : ''}`;
  if (location.hash !== hash) history.pushState(null, '', hash);
  render();
  $('#main') && ($('#main').scrollTop = 0);
  Store.presence(view);
}
window.addEventListener('popstate', () => {
  const [view, id, tab] = location.hash.replace(/^#/, '').split('/');
  if (view && App.user) { App.route = { view, params: { id, tab } }; render(); }
});

// ── Rendering ───────────────────────────────────────────────────
function render() {
  if (!App.user) return renderAuth();
  const v = App.route.view;
  const navItem = NAV.find((n) => n.view === v);
  if (navItem && navItem.perm && !can(navItem.perm)) { App.route = { view: firstAllowedView(), params: {} }; }
  if (!$('#app')) document.body.innerHTML = shellHTML();
  $('#side nav').innerHTML = sideHTML();
  $('#top').innerHTML = topHTML();
  const view = App.views[App.route.view] || App.views.dashboard;
  const active = document.activeElement;
  const keep = active && active.id && $('#main').contains(active) ? { id: active.id, s: active.selectionStart, e: active.selectionEnd } : null;
  $('#main').innerHTML = `<div class="page ${view.wide ? 'wide' : ''}">${bannersHTML()}${view.render(App.route.params)}</div>`;
  if (view.mounted) view.mounted(App.route.params);
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (e) { /* not text */ } } }
}
function firstAllowedView() { const n = NAV.find((x) => x.view && (!x.perm || can(x.perm))); return n ? n.view : 'system'; }

function shellHTML() {
  return `<div id="app"><aside id="side"><div class="brand"><div class="logo">${icon('hospital', 18)}</div><div><div class="t1">ניהול סיעוד</div><div class="t2">${esc(db().settings.orgName)}</div></div></div><nav></nav><div class="foot">גרסה ${APP_VERSION}</div></aside><header id="top"></header><main id="main"></main></div><div id="toasts"></div>`;
}
function sideHTML() {
  const issues = can('dashboard_view') ? deptStats(db(), currentDeptIds()).issues.filter((i) => i.sev === 'crit').length : 0;
  let out = '', pendingSec = '';
  for (const n of NAV) {
    if (n.sec) { pendingSec = n.sec; continue; }
    if (n.perm && !can(n.perm)) continue;
    if (pendingSec) { out += `<div class="navsec">${esc(pendingSec)}</div>`; pendingSec = ''; }
    out += `<button class="nav ${App.route.view === n.view ? 'on' : ''}" data-act="nav" data-view="${n.view}" title="${esc(n.label)}">${icon(n.icon)}<span>${esc(n.label)}</span>${n.view === 'dashboard' && issues ? `<b class="cnt">${issues}</b>` : ''}</button>`;
  }
  return out;
}
function topHTML() {
  const depts = deptList(db()).filter((d) => myDeptIds().includes(d.id));
  const view = App.views[App.route.view] || {};
  const title = (view.title && view.title(App.route.params)) || VIEW_TITLE[App.route.view] || '';
  const deptSel = depts.length > 1 || (depts.length === 1 && view.needsDept)
    ? `<select class="inp auto" data-act="dept" title="מחלקה">${!view.needsDept ? `<option value="all" ${App.dept === 'all' ? 'selected' : ''}>כל המחלקות (${depts.length})</option>` : ''}${depts.map((d) => `<option value="${d.id}" ${(view.needsDept ? singleDept() : App.dept) === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>`
    : '';
  const u = App.user;
  return `<h1>${esc(title)}</h1>${deptSel}<div class="grow"></div>${syncPillHTML()}${onlineHTML()}<div class="userbox" data-act="usermenu"><div class="av">${esc((u.displayName || '?').trim()[0])}</div><div><div class="b small">${esc(u.displayName)}</div><div class="tiny muted">${esc(ROLE_TEMPLATES[u.role] ? ROLE_TEMPLATES[u.role].label : '')}</div></div></div>`;
}
function syncPillHTML() {
  const s = Store.status;
  const txt = { connected: Store.dirty ? 'ממתין לשמירה' : 'מסונכרן', saving: 'שומר…', waiting: 'ממתין…', error: 'שגיאת סנכרון', 'needs-permission': 'נדרש אישור לתיקייה', local: 'עבודה מקומית' }[s] || s;
  const tip = Store.statusText || (Store.lastSyncAt ? `סנכרון אחרון: ${U.fmtDateTime(Store.lastSyncAt)}` : '');
  return `<span class="sync ${s}" data-act="syncinfo" title="${esc(tip)}">${icon(s === 'connected' ? 'cloud' : s === 'local' ? 'folder' : s === 'error' || s === 'needs-permission' ? 'warn' : 'refresh', 15)} ${esc(txt)}</span>`;
}
function onlineHTML() {
  if (!Store.online.length) return '';
  const names = Store.online.map((p) => p.name).join(', ');
  return `<span class="small muted" title="${esc(names)}">${icon('people', 15)} ${Store.online.length} מחוברים</span>`;
}
function bannersHTML() {
  let h = '';
  if (window.__NM_DEMO__) return `<div class="banner info">${icon('eye')}<div class="grow"><b>מצב הדגמה</b> — כניסה ללא סיסמה, עם נתונים לדוגמה (שמות בדויים). אפשר לערוך, להפיק דוחות ולייבא קובץ אקסל אמיתי.</div><button class="btn sm" data-act="demoreset">איפוס נתוני ההדגמה</button></div>`;
  if (Store.status === 'local' && can('settings_edit')) h += `<div class="banner warn">${icon('warn')}<div class="grow"><b>המערכת אינה מחוברת לתיקייה משותפת.</b> הנתונים נשמרים רק במחשב זה ולא יגיעו למשתמשים אחרים.</div><button class="btn sm" data-act="connect">חיבור לתיקייה המשותפת</button></div>`;
  if (Store.status === 'needs-permission') h += `<div class="banner crit">${icon('lock')}<div class="grow"><b>נדרש אישור גישה לתיקייה המשותפת.</b> עד לאישור השינויים נשמרים במחשב זה בלבד.</div><button class="btn sm" data-act="grant">אישור גישה</button></div>`;
  if (Store.status === 'error') h += `<div class="banner crit">${icon('warn')}<div class="grow">${esc(Store.statusText)}</div><button class="btn sm" data-act="retrysync">נסה שוב</button></div>`;
  if (!FS.supported()) h += `<div class="banner crit">${icon('warn')}<div class="grow">הדפדפן הנוכחי אינו תומך בעבודה מול תיקיית רשת. יש לפתוח את הקובץ ב-<b>Google Chrome</b> או <b>Microsoft Edge</b>.</div></div>`;
  return h;
}

// ── Toasts, dialogs ─────────────────────────────────────────────
function toast(msg, type = '') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), type === 'err' ? 7000 : 3500);
}

let modalStack = [];
function openModal({ title, body, footer = '', size = '', onClose = null, id = '' }) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${size}" ${id ? `id="${id}"` : ''} role="dialog" aria-modal="true"><div class="hd"><h3>${esc(title)}</h3><button class="iconbtn" data-act="closemodal" title="סגירה">${icon('close')}</button></div><div class="bd">${body}</div>${footer ? `<div class="ft">${footer}</div>` : ''}</div>`;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov._downOnOverlay = true; });
  ov.addEventListener('click', (e) => { if (e.target === ov && ov._downOnOverlay) closeModal(); ov._downOnOverlay = false; });
  document.body.appendChild(ov);
  modalStack.push({ ov, onClose });
  const f = ov.querySelector('[autofocus]') || ov.querySelector('input:not([type=hidden]):not([disabled]),select,textarea');
  if (f) setTimeout(() => f.focus(), 30);
  return ov.querySelector('.modal');
}
function closeModal() {
  const m = modalStack.pop();
  if (!m) return;
  m.ov.remove();
  if (m.onClose) m.onClose();
}
function confirmBox(title, html, { ok = 'אישור', danger = false } = {}) {
  return new Promise((res) => {
    const m = openModal({ title, size: 'sm', body: `<div>${html}</div>`, footer: `<button class="btn ${danger ? 'danger' : 'pri'}" data-r="1">${esc(ok)}</button><button class="btn" data-r="0">ביטול</button>`, onClose: () => res(false) });
    m.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => { const v = b.dataset.r === '1'; modalStack.pop().ov.remove(); res(v); }));
  });
}
function promptBox(title, label, value = '', { placeholder = '', ok = 'שמירה' } = {}) {
  return new Promise((res) => {
    const m = openModal({ title, size: 'sm', body: `<div class="field"><label>${esc(label)}</label><input class="inp" id="pb-in" value="${esc(value)}" placeholder="${esc(placeholder)}" autofocus></div>`, footer: `<button class="btn pri" data-r="1">${esc(ok)}</button><button class="btn" data-r="0">ביטול</button>`, onClose: () => res(null) });
    const done = (v) => { modalStack.pop().ov.remove(); res(v); };
    m.querySelector('[data-r="1"]').addEventListener('click', () => done(m.querySelector('#pb-in').value.trim()));
    m.querySelector('[data-r="0"]').addEventListener('click', () => done(null));
    m.querySelector('#pb-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') done(e.target.value.trim()); });
  });
}
function popMenu(anchor, items) {
  $$('.menu').forEach((m) => m.remove());
  const m = document.createElement('div');
  m.className = 'menu';
  m.innerHTML = items.map((it, i) => (it === '-' ? '<hr>' : `<button data-i="${i}">${it.icon ? icon(it.icon, 16) : ''}${esc(it.label)}</button>`)).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  m.style.top = `${r.bottom + 6}px`;
  m.style.left = `${Math.max(8, r.left)}px`;
  m.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { m.remove(); items[+b.dataset.i].run(); } });
  setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
}

// File picker that lives outside the page (avoids click bubbling loops)
function pickFiles({ accept = '', multiple = false } = {}, cb) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept; inp.multiple = multiple; inp.style.display = 'none';
  inp.addEventListener('change', () => { if (inp.files.length) cb(inp.files); inp.remove(); });
  document.body.appendChild(inp);
  inp.click();
}

// ── Common fragments ────────────────────────────────────────────
const roleBadge = (role) => `<span class="bdg ${ROLES[role].color}">${esc(ROLES[role].label)}</span>`;
function statusBadge(e) {
  if (e.status === 'active') return '';
  const cls = e.status === 'left' ? '' : 'warn';
  return `<span class="bdg ${cls}">${esc(STATUSES[e.status].label)}</span>`;
}
const sevBadge = (s) => `<span class="dot ${s === 'crit' ? 'crit' : s === 'warn' ? 'warn' : 'info'}"></span>`;
const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('');
function fieldHTML(label, inner, { hint = '', cls = '' } = {}) {
  return `<div class="field ${cls}"><label>${esc(label)}</label>${inner}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
}
function selectHTML(attrs, options, value) {
  return `<select class="inp" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}
const dateVal = (v) => U.fmtDate(v);
// Smart date/text value: "6.11.23" → ISO; anything else stays text (e.g. "אוגוסט")
function parseCellValue(raw, type) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (type === 'check') return /^(v|V|✓|✔|\+|1|כן|ü)$/.test(s) ? CHECK : /^(x|X|✗|לא)$/.test(s) ? '✗' : (U.parseDate(s) || s);
  if (type === 'num') { const n = U.num(s); return n == null ? s : n; }
  if (type === 'date' || type === 'datetext') return U.parseDate(s) || s;
  return s;
}
function displayCellValue(v, type) {
  if (v == null || v === '') return '';
  if (type === 'date' || type === 'datetext' || type === 'check') return U.fmtDate(v);
  return String(v);
}
function dateStatus(iso, warnDays = 60) {
  const d = U.daysUntil(U.parseDate(iso));
  if (d == null) return '';
  return d < 0 ? 'crit' : d <= warnDays ? 'warn' : 'ok';
}

// ── Employee mutations (shared by card and sheets) ──────────────
const getPath2 = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setEmpField(empId, path, value, { silent = false } = {}) {
  const e = db().employees[empId];
  if (!e) return;
  const old = getPath2(e, path);
  if (String(old ?? '') === String(value ?? '')) return;
  Store.update((d) => {
    const x = d.employees[empId];
    setPath(x, path, value);
    x.updatedAt = U.nowISO();
    x.updatedBy = App.user.username;
  }, silent ? null : ['עדכון עובד', `${e.name}: ${fieldLabel(path)} — "${displayCellValue(old, 'date')}" ← "${displayCellValue(value, 'date')}"`, empId]);
}

// ── Event delegation ────────────────────────────────────────────
const ACT = {};
document.addEventListener('click', (e) => {
  App.lastActivity = Date.now();
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'button')) return;
  if (el.type === 'checkbox') return; // handled on change
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) { const fn = ACT[el.dataset.act]; if (fn) fn(el, e); }
});
document.addEventListener('keydown', (e) => {
  App.lastActivity = Date.now();
  if (e.key === 'Escape' && modalStack.length) { closeModal(); return; }
  const el = e.target.closest('[data-key]');
  if (el && ACT[el.dataset.key]) ACT[el.dataset.key](el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el && ACT[el.dataset.input]) ACT[el.dataset.input](el, e);
});
document.addEventListener('dragover', (e) => { const z = e.target.closest('.dropzone'); if (z) { e.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', (e) => { const z = e.target.closest('.dropzone'); if (z) z.classList.remove('over'); });
document.addEventListener('drop', (e) => {
  const z = e.target.closest('.dropzone');
  if (!z) return;
  e.preventDefault();
  z.classList.remove('over');
  const fn = ACT[z.dataset.drop];
  if (fn && e.dataTransfer.files.length) fn(z, e.dataTransfer.files);
});

Object.assign(ACT, {
  nav: (el) => go(el.dataset.view),
  closemodal: () => closeModal(),
  dept: (el) => setDept(el.value),
  go: (el) => go(el.dataset.view, { id: el.dataset.id, tab: el.dataset.tab }),
  emp: (el) => go('employee', { id: el.dataset.id, tab: el.dataset.tab }),
  connect: async () => { try { await Store.pickFolder(); toast('התיקייה המשותפת חוברה', 'ok'); render(); } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'err'); } },
  grant: async () => { try { await Store.grantPermission(); toast('הגישה לתיקייה אושרה', 'ok'); render(); } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'err'); } },
  retrysync: async () => { if (Store.status === 'needs-permission') return ACT.grant(); await Store.saveNow(); render(); },
  syncinfo: () => go('system'),
  usermenu: (el) => popMenu(el, [
    { label: 'שינוי סיסמה', icon: 'lock', run: () => changePasswordDialog(false) },
    { label: 'נעילת מסך', icon: 'lock', run: () => lockScreen() },
    '-',
    { label: 'יציאה', icon: 'logout', run: () => logout() },
  ]),
});

Store.on((type, payload) => {
  if (!App.user) { if (type === 'data' || type === 'status') renderAuth(true); return; }
  // local edits update their own DOM; actions that change structure call render() themselves
  if (type === 'data' && payload && payload.source === 'local') { if ($('#side nav')) $('#side nav').innerHTML = sideHTML(); return; }
  if (type === 'status' || type === 'presence') { if ($('#top')) $('#top').innerHTML = topHTML(); return; }
  if (type === 'data') {
    // refresh the current user's permissions from the shared data
    const u = db().users[App.user.id];
    if (!u || !u.active) { toast('החשבון הושבת או נמחק', 'err'); logout(); return; }
    App.user = u; Store.user = u;
    if (modalStack.length) return; // don't disturb an open dialog
    const a = document.activeElement;
    if (a && a.matches('input,textarea') && $('#main').contains(a)) { App.pendingRender = true; return; }
    render();
  }
  if (type === 'conflicts') toast(`נמצאו ${Store.conflicts.length} שדות שנערכו במקביל במחשב אחר — נשמר הערך שלך. פרטים ביומן.`, 'warn');
  if (type === 'migrated') toast('הנתונים מהגרסה הקודמת הועברו בהצלחה', 'ok');
});
document.addEventListener('focusout', () => setTimeout(() => { if (App.pendingRender && !(document.activeElement && document.activeElement.matches('input,textarea'))) { App.pendingRender = false; render(); } }, 50));
