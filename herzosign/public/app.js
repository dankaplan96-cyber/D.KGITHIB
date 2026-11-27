'use strict';
/* HerzoSign – אפליקציית צד-לקוח (SPA) ללא תלויות. */
(function () {
  // ═════════════ עזרים ═════════════
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v; // CSSOM – מותר תחת CSP
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // רק לתוכן סטטי שנכתב בקוד
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'HerzoSign', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let payload = null;
    try { payload = await res.json(); } catch { /* ignore */ }
    if (res.status === 401 && path !== '/login') { state.me = null; render(); }
    if (!res.ok) throw new Error(payload?.error || `שגיאה (${res.status})`);
    return payload;
  }

  function toast(msg, type = 'ok') {
    const t = h('div', { class: `toast ${type === 'error' ? 'error' : ''}`, text: msg });
    document.getElementById('toasts').append(t);
    setTimeout(() => t.remove(), 4500);
  }

  const pad = (n) => String(n).padStart(2, '0');
  function fmtDate(s, withTime = true) {
    if (!s) return '';
    const d = new Date(/Z|T/.test(s) ? s : `${s.replace(' ', 'T')}Z`);
    if (Number.isNaN(d.getTime())) return s;
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
  }
  const fmtIsoDate = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : s);

  const STATUS = { pending: 'ממתין לאישור', approved: 'אושר', rejected: 'נדחה', returned: 'הוחזר לתיקון', cancelled: 'בוטל' };
  const CATEGORY = { hr: 'כוח אדם', training: 'הדרכה וקליטה', procedure: 'נהלים' };
  const ROLE = { employee: 'עובד/ת', manager: 'מנהל/ת מחלקה', hr: 'משאבי אנוש', education: 'הדרכה', admin: 'מנהל/ת מערכת' };
  const ACTION = {
    submitted: 'הגיש/ה וחתם/ה', resubmitted: 'הגיש/ה מחדש וחתם/ה', approved: 'אישר/ה וחתם/ה', rejected: 'דחה/תה',
    returned: 'החזיר/ה לתיקון', forwarded: 'העביר/ה', cancelled: 'ביטל/ה', completed: 'הטופס הושלם',
    viewed: 'צפה/תה בטופס', attachment_viewed: 'פתח/ה קובץ מצורף',
  };
  const statusBadge = (s) => h('span', { class: `status st-${s}`, text: STATUS[s] || s });
  const catTag = (c) => h('span', { class: `cat-tag cat-${c}`, text: CATEGORY[c] || c });
  const isStaff = () => state.me && state.me.role !== 'employee';
  const hasRole = (...r) => state.me && (r.includes(state.me.role) || state.me.role === 'admin');

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function openDialog({ title, body, actions }) {
    const dlg = h('dialog', { 'aria-labelledby': 'dlg-title' },
      h('div', { class: 'dlg-body' }, h('h2', { id: 'dlg-title', style: 'margin-top:0', text: title }), body),
      h('div', { class: 'dlg-foot' }, actions));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    return dlg;
  }

  function errorBox() {
    const box = h('div', { class: 'error-box', role: 'alert', tabindex: '-1', hidden: true });
    box.show = (msg) => { box.textContent = msg; box.hidden = false; box.focus(); };
    box.hide = () => { box.hidden = true; };
    return box;
  }

  // ═════════════ מצב ═════════════
  const state = { me: null, counts: {}, demo: false };

  // שמירת העדפות נגישות
  const prefs = JSON.parse(localStorage.getItem('hs_prefs') || '{}');
  function applyPrefs() {
    document.documentElement.classList.toggle('large-text', !!prefs.largeText);
    document.documentElement.classList.toggle('high-contrast', !!prefs.highContrast);
  }
  applyPrefs();

  async function loadMe() {
    try {
      const r = await api('/me');
      state.me = r.user; state.counts = r.counts;
    } catch { state.me = null; }
  }
  async function refreshCounts() {
    try { const r = await api('/me'); state.counts = r.counts; renderNav(); } catch { /* ignore */ }
  }

  // ═════════════ ניתוב ═════════════
  const routes = [
    [/^\/$/, viewDashboard],
    [/^\/forms$/, viewCatalog],
    [/^\/forms\/(\d+)$/, viewFill],
    [/^\/s\/(\d+)$/, viewSubmission],
    [/^\/s\/(\d+)\/edit$/, viewResubmit],
    [/^\/mine$/, () => viewList('mine')],
    [/^\/inbox$/, () => viewList('inbox')],
    [/^\/handled$/, () => viewList('handled')],
    [/^\/all$/, () => viewList('all')],
    [/^\/tasks$/, viewTasks],
    [/^\/manage\/assign$/, viewAssignManage],
    [/^\/manage\/users$/, viewUsers],
    [/^\/manage\/departments$/, viewDepartments],
    [/^\/manage\/templates$/, viewTemplates],
    [/^\/manage\/templates\/(new|\d+)$/, viewTemplateEditor],
    [/^\/profile$/, viewProfile],
  ];

  function currentPath() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [p, q] = raw.split('?');
    return { path: p, query: new URLSearchParams(q || '') };
  }
  const go = (p) => { location.hash = `#${p}`; };

  let mainEl, navEl;
  async function render() {
    const app = document.getElementById('app');
    if (!state.me) { app.replaceChildren(viewLogin()); return; }
    if (!mainEl || !document.body.contains(mainEl)) app.replaceChildren(shell());
    renderNav();
    navEl.classList.remove('open');
    const { path, query } = currentPath();
    const match = routes.find(([re]) => re.test(path));
    mainEl.replaceChildren(h('p', { class: 'lead', text: 'טוען…' }));
    try {
      const content = match ? await match[1](...path.match(match[0]).slice(1), query) : h('h1', { text: 'הדף לא נמצא' });
      mainEl.replaceChildren(content);
    } catch (e) {
      mainEl.replaceChildren(h('div', { class: 'error-box', role: 'alert', text: e.message }));
    }
    const h1 = mainEl.querySelector('h1');
    document.title = `${h1 ? `${h1.textContent} | ` : ''}HerzoSign`;
    if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  // ═════════════ מעטפת ═════════════
  function logo() {
    return h('a', { class: 'logo', href: '#/', 'aria-label': 'HerzoSign – לדף הבית' },
      h('span', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8 8 16l1.2-4z"/></svg>' }),
      h('span', null, h('span', { class: 'herzo', text: 'Herzo' }), h('span', { class: 'sign', text: 'Sign' })));
  }

  function shell() {
    navEl = h('nav', { class: 'sidenav', id: 'sidenav', 'aria-label': 'ניווט ראשי' });
    mainEl = h('main', { id: 'main', tabindex: '-1' });
    const menuBtn = h('button', { class: 'icon-btn menu-btn', 'aria-label': 'תפריט', 'aria-controls': 'sidenav', 'aria-expanded': 'false',
      onclick: () => { const open = navEl.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(open)); } }, '☰');
    const header = h('header', { class: 'topbar' },
      menuBtn, logo(), h('span', { class: 'spacer' }),
      h('span', { class: 'help', style: 'margin:0', text: `${state.me.full_name} · ${state.me.job_title || ROLE[state.me.role]}` }),
      h('button', { class: 'btn small', onclick: logout }, 'יציאה'));
    return h('div', null, header, h('div', { class: 'layout' }, navEl, mainEl));
  }

  function renderNav() {
    if (!navEl) return;
    const { path } = currentPath();
    const c = state.counts || {};
    const link = (href, label, count) => h('li', null, h('a', { href: `#${href}`, 'aria-current': path === href ? 'page' : null },
      h('span', { text: label }), count ? h('span', { class: 'badge-count', 'aria-label': `${count} פריטים`, text: count }) : null));
    const groups = [
      h('ul', null,
        link('/', 'לוח בקרה'),
        link('/forms', 'מילוי טופס חדש'),
        link('/tasks', 'משימות לחתימה', c.assignments),
        link('/mine', 'הטפסים שלי', c.returned)),
    ];
    if (isStaff() || c.inbox) {
      groups.push(h('div', { class: 'group', text: 'טיפול ואישור' }), h('ul', null,
        link('/inbox', 'ממתינים לטיפולי', c.inbox),
        link('/handled', 'טופלו על ידי'),
        isStaff() ? link('/all', state.me.role === 'manager' ? 'כל טפסי המחלקה' : 'כל הטפסים') : null));
    }
    if (hasRole('manager', 'hr', 'education')) {
      groups.push(h('div', { class: 'group', text: 'ניהול' }), h('ul', null,
        link('/manage/assign', 'שיוך טפסים ומעקב'),
        hasRole('hr', 'education') ? link('/manage/templates', 'תבניות טפסים') : null,
        hasRole('hr') ? link('/manage/users', 'משתמשים') : null,
        hasRole('admin') ? link('/manage/departments', 'מחלקות') : null));
    }
    groups.push(h('div', { class: 'group', text: 'חשבון' }), h('ul', null, link('/profile', 'הגדרות ונגישות')));
    navEl.replaceChildren(...groups);
  }

  async function logout() {
    await api('/logout', { method: 'POST' }).catch(() => {});
    state.me = null; mainEl = null;
    location.hash = '#/';
    render();
  }

  // ═════════════ התחברות ═════════════
  function viewLogin() {
    const err = errorBox();
    const empNo = h('input', { type: 'text', id: 'emp', autocomplete: 'username', inputmode: 'numeric', required: true });
    const pw = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', required: true });
    const submit = h('button', { class: 'btn primary', type: 'submit', style: 'width:100%' }, 'כניסה');
    const form = h('form', {
      onsubmit: async (e) => {
        e.preventDefault(); err.hide(); submit.disabled = true;
        try {
          await api('/login', { method: 'POST', body: { employee_no: empNo.value, password: pw.value } });
          await loadMe(); mainEl = null; render();
        } catch (ex) { err.show(ex.message); } finally { submit.disabled = false; }
      },
    },
    err,
    h('div', { class: 'field' }, h('label', { for: 'emp', text: 'מספר עובד' }), empNo),
    h('div', { class: 'field' }, h('label', { for: 'pw', text: 'סיסמה' }), pw),
    submit);

    const demo = state.demo ? h('div', { class: 'demo-users', style: 'margin-top:1rem' },
      h('p', { style: 'margin:.25rem 0', text: 'סביבת הדגמה – כניסה מהירה (סיסמה: Herzog2026):' }),
      ...[['1000', 'מנהל מערכת'], ['2001', 'אחות אחראית'], ['3001', 'משאבי אנוש'], ['4001', 'הדרכה'], ['5001', 'אחות'], ['5002', 'סטודנט']]
        .map(([n, l]) => h('button', { type: 'button', onclick: () => { empNo.value = n; pw.value = 'Herzog2026'; } }, `${l} (${n})`))) : null;

    return h('div', { class: 'login-wrap' },
      h('main', { class: 'card login-card', id: 'main' },
        logo(),
        h('h1', { style: 'font-size:1.25rem', text: 'החתימה הדיגיטלית של הרצוג' }),
        h('p', { class: 'lead', text: 'פחות ניירת. יותר זמן לטיפול.' }),
        form, demo));
  }

  // ═════════════ לוח בקרה ═════════════
  async function viewDashboard() {
    const [d, tasks, inbox] = await Promise.all([
      api('/dashboard'), api('/assignments?scope=mine'),
      (isStaff() || state.counts.inbox) ? api('/submissions?scope=inbox') : Promise.resolve([]),
    ]);
    state.counts = d.counts; renderNav();
    const kpi = (num, label, href) => h('div', { class: 'card kpi' }, h('a', { href: `#${href}` }, h('div', { class: 'num', text: num ?? 0 }), h('div', { class: 'lbl', text: label })));
    const myBy = Object.fromEntries((d.my || []).map((r) => [r.status, r.n]));

    const parts = [
      h('h1', { text: `שלום, ${state.me.full_name}` }),
      h('p', { class: 'lead', text: state.me.department_name ? `${state.me.job_title || ''} · ${state.me.department_name}` : '' }),
      h('div', { class: 'grid kpis' },
        isStaff() || d.counts.inbox ? kpi(d.counts.inbox, 'ממתינים לטיפולי', '/inbox') : null,
        kpi(d.counts.assignments, 'משימות פתוחות לחתימה', '/tasks'),
        kpi(myBy.pending, 'טפסים שלי בתהליך', '/mine'),
        d.counts.returned ? kpi(d.counts.returned, 'הוחזרו אליי לתיקון', '/mine') : kpi(myBy.approved, 'טפסים שלי שאושרו', '/mine'),
        d.avgHours != null ? kpi(`${d.avgHours}`, 'שעות בממוצע עד אישור (30 יום)', '/all') : null),
      h('div', { class: 'btn-row', style: 'margin:1.25rem 0' }, h('a', { class: 'btn primary', href: '#/forms' }, '➕ מילוי טופס חדש')),
    ];

    if (inbox.length) {
      parts.push(h('h2', { text: 'ממתינים לטיפולי' }), submissionsTable(inbox.slice(0, 6), 'inbox'));
    }
    if (tasks.length) {
      parts.push(h('h2', { text: 'משימות לחתימה' }), tasksList(tasks.slice(0, 6)));
    }
    if (d.compliance?.length) {
      parts.push(h('h2', { text: 'מעקב חתימה על נהלים והדרכות' }), h('div', { class: 'card' }, ...d.compliance.map((c) => {
        const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
        return h('div', { style: 'margin-bottom:.9rem' },
          h('div', { class: 'row', style: 'justify-content:space-between' }, h('span', { text: c.title }), h('strong', { style: 'flex:0', text: `${c.done}/${c.total} (${pct}%)` })),
          h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': c.title }, h('span', { style: `width:${pct}%` })));
      })));
    }
    if (d.overdue?.length) {
      parts.push(h('h2', { text: 'משימות שעבר מועדן' }), h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, h('th', { text: 'עובד/ת' }), h('th', { text: 'טופס' }), h('th', { text: 'מועד יעד' }))),
        h('tbody', null, d.overdue.map((o) => h('tr', null, h('td', { text: o.user_name }), h('td', { text: o.title }), h('td', { text: fmtIsoDate(o.due_date) })))))));
    }
    if (d.byStatus?.length) {
      const by = Object.fromEntries(d.byStatus.map((r) => [r.status, r.n]));
      parts.push(h('h2', { text: 'סיכום טפסים' }), h('div', { class: 'grid kpis' },
        ...['pending', 'approved', 'returned', 'rejected'].map((s) => kpi(by[s] || 0, STATUS[s], `/all?status=${s}`))));
    }
    return h('div', null, parts);
  }

  // ═════════════ קטלוג טפסים ═════════════
  async function viewCatalog(query) {
    const templates = await api('/templates');
    let cat = query.get('cat') || 'hr';
    let q = '';
    const list = h('div', { class: 'grid cols-3', id: 'catalog-panel', role: 'tabpanel' });
    const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'קטגוריות טפסים' });
    const search = h('input', { type: 'search', id: 'cat-search', placeholder: 'חיפוש טופס…', oninput: (e) => { q = e.target.value.trim(); draw(); } });

    function draw() {
      tabs.replaceChildren(...Object.entries(CATEGORY).map(([k, label]) => h('button', {
        class: 'btn small', role: 'tab', 'aria-selected': String(k === cat), 'aria-controls': 'catalog-panel',
        onclick: () => { cat = k; draw(); },
      }, label)));
      const items = templates.filter((t) => (q ? t.title.includes(q) || (t.description || '').includes(q) : t.category === cat));
      list.replaceChildren(...(items.length ? items.map((t) => h('article', { class: 'card form-card' },
        catTag(t.category),
        h('h3', { text: t.title }),
        h('p', { text: t.description || '' }),
        h('a', { class: 'btn primary', href: `#/forms/${t.id}`, 'aria-label': `מילוי: ${t.title}` }, 'מילוי וחתימה')))
        : [h('p', { class: 'empty', text: 'לא נמצאו טפסים' })]));
    }
    draw();
    return h('div', null,
      h('h1', { text: 'מילוי טופס חדש' }),
      h('p', { class: 'lead', text: 'בחרו טופס, מלאו, חתמו – והוא יגיע אוטומטית לגורם המאשר.' }),
      h('div', { class: 'field', style: 'max-width:420px' }, h('label', { for: 'cat-search', class: 'sr-only', text: 'חיפוש טופס' }), search),
      tabs, list);
  }

  // ═════════════ רינדור שדות ═════════════
  function renderFields(fields, values = {}) {
    const getters = [];
    const nodes = fields.map((f) => {
      const id = `f-${f.key}`;
      const reqMark = f.required ? h('span', { class: 'req', 'aria-hidden': 'true', text: '*' }) : null;
      const help = f.help ? h('div', { class: 'help', id: `${id}-help`, text: f.help }) : null;
      const described = f.help ? `${id}-help` : null;
      const v = values[f.key];
      switch (f.type) {
        case 'heading': return h('h3', { class: 'form-heading', text: f.label });
        case 'info': return h('p', { class: 'help', text: f.label });
        case 'textarea': {
          const el = h('textarea', { id, required: f.required, 'aria-describedby': described });
          el.value = v || '';
          getters.push([f.key, () => el.value]);
          return h('div', { class: 'field' }, h('label', { for: id }, f.label, reqMark), el, help);
        }
        case 'select': {
          const el = h('select', { id, required: f.required, 'aria-describedby': described },
            h('option', { value: '', text: '— בחירה —' }), f.options.map((o) => h('option', { value: o, text: o, selected: o === v })));
          getters.push([f.key, () => el.value]);
          return h('div', { class: 'field' }, h('label', { for: id }, f.label, reqMark), el, help);
        }
        case 'radio': {
          const inputs = f.options.map((o, i) => h('input', { type: 'radio', name: id, id: `${id}-${i}`, value: o, checked: o === v, required: f.required && i === 0 }));
          getters.push([f.key, () => inputs.find((x) => x.checked)?.value || '']);
          return h('fieldset', { 'aria-describedby': described }, h('legend', null, f.label, reqMark),
            inputs.map((inp, i) => h('label', { class: 'choice', for: `${id}-${i}` }, inp, h('span', { text: f.options[i] }))), help);
        }
        case 'checkbox': {
          const el = h('input', { type: 'checkbox', id, checked: v === true, required: f.required, 'aria-describedby': described });
          getters.push([f.key, () => el.checked]);
          return h('div', { class: 'field' }, h('label', { class: 'choice', for: id }, el, h('span', null, f.label, reqMark)), help);
        }
        case 'checklist': {
          const sel = Array.isArray(v) ? v : [];
          const inputs = f.options.map((o, i) => h('input', { type: 'checkbox', id: `${id}-${i}`, value: o, checked: sel.includes(o) }));
          const counter = h('span', { class: 'help', 'aria-live': 'polite' });
          const upd = () => { counter.textContent = `סומנו ${inputs.filter((x) => x.checked).length} מתוך ${inputs.length}`; };
          inputs.forEach((x) => x.addEventListener('change', upd)); upd();
          const all = h('button', { type: 'button', class: 'btn small', onclick: () => { inputs.forEach((x) => { x.checked = true; }); upd(); } }, 'סימון הכל');
          getters.push([f.key, () => inputs.filter((x) => x.checked).map((x) => x.value)]);
          return h('fieldset', { 'aria-describedby': described }, h('legend', null, f.label, reqMark),
            f.required ? h('div', { class: 'help', text: 'יש לסמן את כל הסעיפים לפני החתימה' }) : null,
            inputs.map((inp, i) => h('label', { class: 'choice', for: `${id}-${i}` }, inp, h('span', { text: f.options[i] }))),
            h('div', { class: 'btn-row' }, all, counter), help);
        }
        case 'file': {
          const el = h('input', { type: 'file', id, accept: 'application/pdf,image/*', capture: null, 'aria-describedby': described });
          const existing = v?.filename ? h('div', { class: 'help', text: `קובץ קיים: ${v.filename} (ניתן להחליף)` }) : null;
          getters.push([f.key, () => el.files[0] || null, 'file']);
          return h('div', { class: 'field' }, h('label', { for: id }, f.label, reqMark), el, existing, help);
        }
        default: {
          const el = h('input', { type: f.type, id, required: f.required, 'aria-describedby': described, value: v ?? '' });
          getters.push([f.key, () => el.value]);
          return h('div', { class: 'field' }, h('label', { for: id }, f.label, reqMark), el, help);
        }
      }
    });
    async function collect() {
      const data = {}; const files = {};
      for (const [key, get, kind] of getters) {
        const val = get();
        if (kind === 'file') {
          if (val) {
            if (val.size > 5 * 1024 * 1024) throw new Error('הקובץ גדול מ-5MB');
            files[key] = { name: val.name, mime: val.type || 'application/octet-stream', data: await fileToBase64(val) };
          }
        } else data[key] = val;
      }
      return { data, files };
    }
    return { nodes, collect };
  }

  function docBlock(text) {
    return text ? h('section', { 'aria-label': 'תוכן המסמך' }, h('div', { class: 'doc-text', tabindex: '0', text })) : null;
  }

  // ═════════════ מילוי טופס ═════════════
  async function viewFill(id, query) {
    const t = await api(`/templates/${id}`);
    const assignmentId = query.get('assignment');
    const { nodes, collect } = renderFields(t.fields);
    const sig = window.createSignaturePad({ name: state.me.full_name, id: 'sig-sub' });
    const err = errorBox();
    const submit = h('button', { class: 'btn primary', type: 'submit' }, 'חתימה ושליחה');
    const route = t.workflow.map((s) => s.label).join(' ← ') || 'ללא שלבי אישור';

    const form = h('form', {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault(); err.hide();
        const signature = sig.getValue();
        if (!signature) { err.show('יש לחתום על הטופס לפני השליחה'); return; }
        submit.disabled = true;
        try {
          const { data, files } = await collect();
          const r = await api('/submissions', { method: 'POST', body: { template_id: t.id, data, files, signature, assignment_id: assignmentId } });
          toast(r.status === 'approved' ? 'הטופס נחתם ונשמר' : 'הטופס נחתם ונשלח לאישור');
          refreshCounts();
          go(`/s/${r.id}`);
        } catch (ex) { err.show(ex.message); } finally { submit.disabled = false; }
      },
    },
    err,
    docBlock(t.document_text),
    h('div', { class: 'card' }, nodes.length ? nodes : h('p', { class: 'help', text: 'אין שדות למילוי.' })),
    h('div', { class: 'card' }, h('p', { class: 'help', style: 'margin-top:0', text: `בחתימתי אני מאשר/ת כי הפרטים בטופס נכונים. החתימה נרשמת יחד עם שמי (${state.me.full_name}), מספר העובד, השעה וטביעת אצבע דיגיטלית של תוכן הטופס.` }), sig.el),
    h('div', { class: 'btn-row', style: 'margin-top:1rem' }, submit, h('a', { class: 'btn', href: '#/forms' }, 'ביטול')));

    return h('div', null,
      catTag(t.category),
      h('h1', { text: t.title }),
      h('p', { class: 'lead' }, t.description || '', h('br'), h('strong', { text: 'מסלול אישור: ' }), route),
      form);
  }

  // ═════════════ צפייה בטופס ═════════════
  function dataList(fields, data) {
    const rows = [];
    for (const f of fields) {
      if (f.type === 'info') continue;
      if (f.type === 'heading') { rows.push(h('dt', { style: 'grid-column:1/-1;font-weight:700;color:var(--text)', text: f.label })); continue; }
      const v = data[f.key];
      let shown;
      if (f.type === 'checkbox') shown = v ? '✔ כן' : '✘ לא';
      else if (f.type === 'checklist') shown = h('ul', { style: 'margin:0;padding-inline-start:1.1rem' }, f.options.map((o) => h('li', { text: `${(v || []).includes(o) ? '✔' : '✘'} ${o}` })));
      else if (f.type === 'file') shown = v?.attachment_id ? h('a', { href: `/api/attachments/${v.attachment_id}`, target: '_blank', rel: 'noopener' }, `📎 ${v.filename}`) : '—';
      else if (f.type === 'date') shown = fmtIsoDate(v) || '—';
      else shown = v === '' || v === null || v === undefined ? '—' : String(v);
      rows.push(h('dt', { text: f.label }), h('dd', null, shown));
    }
    return h('dl', { class: 'data-list' }, rows);
  }

  function routeTimeline(sub) {
    const steps = [{ label: 'הגשה וחתימת העובד/ת' }, ...sub.template.workflow];
    return h('ol', { class: 'timeline', 'aria-label': 'מסלול האישור' }, steps.map((s, i) => {
      const idx = i - 1; // אינדקס שלב בזרימה
      let cls = '';
      let suffix = '';
      if (i === 0) { cls = 'done'; suffix = ' ✓'; }
      else if (sub.status === 'approved') { cls = 'done'; suffix = ' ✓'; }
      else if (sub.status === 'pending' && idx < sub.current.step) { cls = 'done'; suffix = ' ✓'; }
      else if (sub.status === 'pending' && idx === sub.current.step) { cls = 'current'; suffix = ` – ${sub.current.assignee_name || sub.current.role_label || ''}`; }
      else if (sub.status === 'rejected' && idx === sub.current.step) { cls = 'rejected'; }
      return h('li', { class: cls, 'aria-current': cls === 'current' ? 'step' : null, text: `${s.label}${suffix}` });
    }));
  }

  async function viewSubmission(id) {
    const s = await api(`/submissions/${id}`);
    const parts = [];
    parts.push(h('div', { class: 'print-only' }, logo(), h('hr')));
    parts.push(h('div', { class: 'sub-head' },
      h('div', null, catTag(s.category), h('h1', { text: s.title }), h('div', null, statusBadge(s.status), ` · טופס מס׳ ${s.id}`)),
      h('div', { class: 'btn-row no-print' },
        h('button', { class: 'btn', onclick: () => window.print() }, '🖨️ הדפסה / PDF'),
        s.permissions.resubmit ? h('a', { class: 'btn primary', href: `#/s/${s.id}/edit` }, 'תיקון והגשה מחדש') : null,
        s.permissions.cancel ? h('button', { class: 'btn danger', onclick: () => cancelSubmission(s) }, 'ביטול הטופס') : null)));

    parts.push(h('div', { class: 'card' },
      h('dl', { class: 'meta' },
        h('div', null, h('dt', { text: 'מגיש/ה' }), h('dd', { text: `${s.submitter.name} (${s.submitter.employee_no})` })),
        h('div', null, h('dt', { text: 'תפקיד' }), h('dd', { text: s.submitter.job_title || '—' })),
        h('div', null, h('dt', { text: 'מחלקה' }), h('dd', { text: s.department_name || '—' })),
        h('div', null, h('dt', { text: 'הוגש' }), h('dd', { text: fmtDate(s.created_at) })),
        s.completed_at ? h('div', null, h('dt', { text: 'הסתיים' }), h('dd', { text: fmtDate(s.completed_at) })) : null),
      h('h2', { style: 'margin-top:1.25rem', text: 'מסלול האישור' }), routeTimeline(s)));

    const lastReturn = [...s.history].reverse().find((x) => ['returned', 'rejected'].includes(x.action));
    if (lastReturn && ['returned', 'rejected'].includes(s.status)) {
      parts.push(h('div', { class: 'error-box', role: 'note' }, `${ACTION[lastReturn.action]} ע״י ${lastReturn.user_name}: `, lastReturn.comment || ''));
    }

    if (s.permissions.act) parts.push(actionPanel(s));

    if (s.template.document_text) parts.push(h('h2', { text: 'תוכן המסמך' }), docBlock(s.template.document_text));
    parts.push(h('h2', { text: 'פרטי הטופס' }), h('div', { class: 'card' }, dataList(s.template.fields, s.data)));

    parts.push(h('h2', { text: 'חתימות' }), h('div', { class: 'card sig-grid' }, s.signatures.map((g) => h('figure', null,
      h('img', { class: 'sig-img', src: g.image, alt: `חתימת ${g.full_name}` }),
      h('figcaption', null,
        h('strong', { text: g.full_name }), ` · ${g.signer_role === 'submitter' ? 'מגיש/ה' : 'גורם מאשר'}${g.job_title ? ` · ${g.job_title}` : ''}`, h('br'),
        `${fmtDate(g.signed_at)} · ${g.method === 'typed' ? 'חתימה מוקלדת' : 'חתימה ידנית'}`)))));

    parts.push(h('h2', { text: 'יומן פעולות' }), h('div', { class: 'card' }, h('ul', { class: 'history' }, s.history.filter((x) => x.action !== 'viewed' && x.action !== 'attachment_viewed').map((x) => h('li', null,
      h('time', { text: fmtDate(x.at) }), h('strong', { text: x.user_name || 'מערכת' }), ` ${ACTION[x.action] || x.action}`,
      x.target_name ? ` אל ${x.target_name}` : '', x.comment ? ` – "${x.comment}"` : '')))));

    parts.push(h('div', { class: 'card integrity' },
      h('strong', { text: 'אימות שלמות: ' }),
      s.integrity.valid ? h('span', { class: 'ok', text: '✔ תוכן הטופס לא שונה מאז החתימה' }) : h('span', { class: 'bad', text: '✘ תוכן הטופס אינו תואם לחתימה!' }),
      h('br'), `טביעת אצבע (SHA-256): ${s.integrity.stored_hash}`));
    return h('div', null, parts);
  }

  async function cancelSubmission(s) {
    if (!confirm('לבטל את הטופס? לא ניתן לשחזר.')) return;
    try { await api(`/submissions/${s.id}/cancel`, { method: 'POST', body: {} }); toast('הטופס בוטל'); render(); } catch (e) { toast(e.message, 'error'); }
  }

  let usersCache = null;
  async function getUsers() { if (!usersCache) usersCache = await api('/users'); return usersCache; }

  function userSelect(id, users, exclude) {
    return h('select', { id }, h('option', { value: '', text: '— בחירת עובד/ת —' }),
      users.filter((u) => u.id !== exclude).map((u) => h('option', { value: u.id, text: `${u.full_name} · ${u.job_title || ROLE[u.role]}${u.department_name ? ` · ${u.department_name}` : ''}` })));
  }

  function actionPanel(s) {
    const err = errorBox();
    const comment = h('textarea', { id: 'act-comment', placeholder: 'הערה (חובה בדחייה או בהחזרה לתיקון)' });
    const sig = window.createSignaturePad({ name: state.me.full_name, id: 'sig-act' });
    const fwdWrap = h('div', { class: 'field' });
    const forwardCheck = h('input', { type: 'checkbox', id: 'act-fwd' });
    let fwdSelect = null;
    forwardCheck.addEventListener('change', async () => {
      if (forwardCheck.checked) {
        fwdSelect = userSelect('act-fwd-user', await getUsers(), state.me.id);
        fwdWrap.replaceChildren(h('label', { for: 'act-fwd-user', text: 'לאחר האישור – להעביר גם אל:' }), fwdSelect);
      } else { fwdSelect = null; fwdWrap.replaceChildren(); }
    });

    const doAction = async (action, extra = {}) => {
      err.hide();
      try {
        const body = { action, comment: comment.value, ...extra };
        if (action === 'approve') {
          body.signature = sig.getValue();
          if (!body.signature) { err.show('יש לחתום כדי לאשר'); return; }
          if (fwdSelect?.value) body.forward_to = Number(fwdSelect.value);
        }
        const r = await api(`/submissions/${s.id}/action`, { method: 'POST', body });
        toast({ approve: r.status === 'approved' ? 'הטופס אושר סופית' : 'אושר והועבר לשלב הבא', reject: 'הטופס נדחה', return: 'הטופס הוחזר לתיקון', forward: 'הטופס הועבר' }[action]);
        refreshCounts();
        render();
      } catch (e) { err.show(e.message); }
    };

    const forwardDialog = async () => {
      const users = await getUsers();
      const sel = userSelect('fwd-user', users, state.me.id);
      const note = h('textarea', { id: 'fwd-note' });
      const dlg = openDialog({
        title: 'העברת הטופס לגורם אחר',
        body: h('div', null, h('p', { class: 'help', text: 'הטופס יעבור לטיפול הגורם שתבחרו (במקומכם, ללא אישור שלכם).' }),
          h('div', { class: 'field' }, h('label', { for: 'fwd-user', text: 'העברה אל' }), sel),
          h('div', { class: 'field' }, h('label', { for: 'fwd-note', text: 'הערה' }), note)),
        actions: [
          h('button', { class: 'btn primary', onclick: async () => { if (!sel.value) { sel.focus(); return; } dlg.close(); comment.value = note.value; await doAction('forward', { to_user_id: Number(sel.value) }); } }, 'העברה'),
          h('button', { class: 'btn', onclick: () => dlg.close() }, 'ביטול'),
        ],
      });
    };

    return h('section', { class: 'card action-panel no-print', 'aria-labelledby': 'act-title' },
      h('h2', { id: 'act-title', style: 'margin-top:0', text: 'הטופס ממתין לטיפולך' }),
      err,
      h('div', { class: 'field' }, h('label', { for: 'act-comment', text: 'הערה' }), comment),
      sig.el,
      h('div', { class: 'field', style: 'margin-top:1rem' }, h('label', { class: 'choice', for: 'act-fwd' }, forwardCheck, h('span', { text: 'אישור והעברה לגורם נוסף (מעבר למסלול הקבוע)' }))),
      fwdWrap,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary', onclick: () => doAction('approve') }, '✔ אישור וחתימה'),
        h('button', { class: 'btn', onclick: () => doAction('return') }, '↩ החזרה לתיקון'),
        h('button', { class: 'btn', onclick: forwardDialog }, '➜ העברה לגורם אחר'),
        h('button', { class: 'btn danger', onclick: () => doAction('reject') }, '✘ דחייה')));
  }

  async function viewResubmit(id) {
    const s = await api(`/submissions/${id}`);
    if (!s.permissions.resubmit) return h('div', { class: 'error-box', text: 'לא ניתן לערוך טופס זה' });
    const { nodes, collect } = renderFields(s.template.fields, s.data);
    const sig = window.createSignaturePad({ name: state.me.full_name, id: 'sig-re' });
    const err = errorBox();
    const ret = [...s.history].reverse().find((x) => x.action === 'returned');
    const submit = h('button', { class: 'btn primary', type: 'submit' }, 'חתימה והגשה מחדש');
    return h('div', null,
      h('h1', { text: `תיקון: ${s.title}` }),
      ret ? h('div', { class: 'error-box', role: 'note', text: `הערת ${ret.user_name}: ${ret.comment}` }) : null,
      h('form', {
        novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault(); err.hide();
          const signature = sig.getValue();
          if (!signature) { err.show('יש לחתום מחדש'); return; }
          submit.disabled = true;
          try {
            const { data, files } = await collect();
            await api(`/submissions/${s.id}/resubmit`, { method: 'POST', body: { data, files, signature } });
            toast('הטופס הוגש מחדש'); refreshCounts(); go(`/s/${s.id}`);
          } catch (ex) { err.show(ex.message); } finally { submit.disabled = false; }
        },
      }, err, docBlock(s.template.document_text), h('div', { class: 'card' }, nodes), h('div', { class: 'card' }, sig.el),
      h('div', { class: 'btn-row', style: 'margin-top:1rem' }, submit, h('a', { class: 'btn', href: `#/s/${s.id}` }, 'ביטול'))));
  }

  // ═════════════ רשימות ═════════════
  function submissionsTable(rows, scope) {
    if (!rows.length) return h('div', { class: 'table-wrap' }, h('p', { class: 'empty', text: 'אין טפסים להצגה' }));
    const showSubmitter = scope !== 'mine';
    return h('div', { class: 'table-wrap' }, h('table', null,
      h('caption', { class: 'sr-only', text: 'רשימת טפסים' }),
      h('thead', null, h('tr', null,
        h('th', { scope: 'col', text: 'מס׳' }), h('th', { scope: 'col', text: 'טופס' }),
        showSubmitter ? h('th', { scope: 'col', text: 'מגיש/ה' }) : null,
        h('th', { scope: 'col', text: 'סטטוס' }), h('th', { scope: 'col', text: 'אצל' }), h('th', { scope: 'col', text: 'עודכן' }))),
      h('tbody', null, rows.map((r) => h('tr', { class: 'clickable', onclick: (e) => { if (e.target.tagName !== 'A') go(`/s/${r.id}`); } },
        h('td', { text: r.id }),
        h('td', null, h('a', { href: `#/s/${r.id}`, text: r.title }), h('div', { class: 'help', style: 'margin:0', text: CATEGORY[r.category] })),
        showSubmitter ? h('td', null, r.submitter_name, h('div', { class: 'help', style: 'margin:0', text: [r.submitter_job, r.department_name].filter(Boolean).join(' · ') })) : null,
        h('td', null, statusBadge(r.status)),
        h('td', { text: r.status === 'pending' ? (r.assignee_name || ROLE[r.current_role] || '') : '—' }),
        h('td', { text: fmtDate(r.updated_at) }))))));
  }

  async function viewList(scope, query) {
    const titles = { mine: 'הטפסים שלי', inbox: 'ממתינים לטיפולי', handled: 'טופלו על ידי', all: state.me.role === 'manager' ? 'כל טפסי המחלקה' : 'כל הטפסים' };
    const q = query || currentPath().query;
    const filters = { status: q.get('status') || '', category: '', q: '' };
    const holder = h('div');
    const load = async () => {
      const p = new URLSearchParams({ scope });
      for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
      holder.replaceChildren(submissionsTable(await api(`/submissions?${p}`), scope));
    };
    const statusSel = h('select', { id: 'flt-status', onchange: (e) => { filters.status = e.target.value; load(); } },
      h('option', { value: '', text: 'כל הסטטוסים' }), Object.entries(STATUS).map(([k, v]) => h('option', { value: k, text: v, selected: k === filters.status })));
    const catSel = h('select', { id: 'flt-cat', onchange: (e) => { filters.category = e.target.value; load(); } },
      h('option', { value: '', text: 'כל הקטגוריות' }), Object.entries(CATEGORY).map(([k, v]) => h('option', { value: k, text: v })));
    let timer;
    const search = h('input', { type: 'search', id: 'flt-q', placeholder: 'שם טופס / עובד / מספר עובד', oninput: (e) => { clearTimeout(timer); timer = setTimeout(() => { filters.q = e.target.value; load(); }, 300); } });
    await load();
    return h('div', null,
      h('h1', { text: titles[scope] }),
      h('div', { class: 'filters' },
        h('div', { class: 'grow' }, h('label', { for: 'flt-q', class: 'sr-only', text: 'חיפוש' }), search),
        scope !== 'inbox' ? h('div', null, h('label', { for: 'flt-status', class: 'sr-only', text: 'סטטוס' }), statusSel) : null,
        h('div', null, h('label', { for: 'flt-cat', class: 'sr-only', text: 'קטגוריה' }), catSel)),
      holder);
  }

  // ═════════════ משימות ═════════════
  function tasksList(tasks) {
    if (!tasks.length) return h('div', { class: 'table-wrap' }, h('p', { class: 'empty', text: 'אין משימות פתוחות 🎉' }));
    const today = new Date().toISOString().slice(0, 10);
    return h('div', { class: 'grid cols-2' }, tasks.map((t) => h('article', { class: 'card form-card' },
      catTag(t.category), h('h3', { text: t.title }),
      h('p', null,
        t.due_date ? h('span', { style: t.due_date < today ? 'color:var(--danger);font-weight:700' : '', text: `לביצוע עד ${fmtIsoDate(t.due_date)}${t.due_date < today ? ' (עבר המועד)' : ''}` }) : 'ללא מועד יעד',
        t.assigned_by_name ? ` · שויך ע״י ${t.assigned_by_name}` : '', t.note ? h('br') : null, t.note || ''),
      h('a', { class: 'btn primary', href: `#/forms/${t.template_id}?assignment=${t.id}` }, 'קריאה וחתימה'))));
  }

  async function viewTasks() {
    const tasks = await api('/assignments?scope=mine');
    return h('div', null, h('h1', { text: 'משימות לחתימה' }),
      h('p', { class: 'lead', text: 'נהלים, חוברות הדרכה וטפסים ששויכו אליך לקריאה וחתימה.' }), tasksList(tasks));
  }

  // ═════════════ ניהול: שיוך טפסים ═════════════
  async function viewAssignManage() {
    const [templates, departments, users, list] = await Promise.all([api('/templates'), api('/departments'), getUsers(), api('/assignments?scope=managed')]);
    const err = errorBox();
    const tSel = h('select', { id: 'as-t', required: true }, h('option', { value: '', text: '— בחירת טופס —' }),
      Object.entries(CATEGORY).map(([k, v]) => h('optgroup', { label: v }, templates.filter((t) => t.category === k).map((t) => h('option', { value: t.id, text: t.title })))));
    const mode = h('select', { id: 'as-mode' },
      h('option', { value: 'dept', text: 'כל עובדי מחלקה' }), h('option', { value: 'job', text: 'לפי תפקיד' }), h('option', { value: 'users', text: 'עובדים מסוימים' }));
    const deptSel = h('select', { id: 'as-dept' }, departments.map((d) => h('option', { value: d.id, text: d.name, selected: d.manager_id === state.me.id })));
    const jobs = [...new Set(users.map((u) => u.job_title).filter(Boolean))].sort();
    const jobSel = h('select', { id: 'as-job' }, jobs.map((j) => h('option', { value: j, text: j })));
    const userBoxes = users.map((u) => h('label', { class: 'choice' }, h('input', { type: 'checkbox', value: u.id }), h('span', { text: `${u.full_name} · ${u.job_title || ''} · ${u.department_name || ''}` })));
    const userList = h('fieldset', { style: 'max-height:260px;overflow:auto' }, h('legend', { text: 'בחירת עובדים' }), userBoxes);
    const target = h('div');
    const drawTarget = () => {
      target.replaceChildren(
        mode.value === 'dept' ? h('div', { class: 'field' }, h('label', { for: 'as-dept', text: 'מחלקה' }), deptSel) : null,
        mode.value === 'job' ? h('div', { class: 'row' },
          h('div', { class: 'field' }, h('label', { for: 'as-job', text: 'תפקיד' }), jobSel),
          h('div', { class: 'field' }, h('label', { for: 'as-dept', text: 'מחלקה (אופציונלי)' }), deptSel)) : null,
        mode.value === 'users' ? userList : null);
    };
    mode.addEventListener('change', drawTarget); drawTarget();
    const due = h('input', { type: 'date', id: 'as-due' });
    const note = h('input', { type: 'text', id: 'as-note', placeholder: 'למשל: נוהל מעודכן – חובה לכל הצוות' });

    const form = h('form', {
      class: 'card',
      onsubmit: async (e) => {
        e.preventDefault(); err.hide();
        const body = { template_id: Number(tSel.value), due_date: due.value || null, note: note.value };
        if (mode.value === 'dept') body.department_id = Number(deptSel.value);
        if (mode.value === 'job') { body.job_title = jobSel.value; body.department_id = Number(deptSel.value) || null; }
        if (mode.value === 'users') body.user_ids = userBoxes.map((l) => l.querySelector('input')).filter((i) => i.checked).map((i) => Number(i.value));
        try {
          const r = await api('/assignments', { method: 'POST', body });
          toast(`שויך ל-${r.created} עובדים${r.skipped ? ` (${r.skipped} כבר שויכו)` : ''}`);
          render();
        } catch (ex) { err.show(ex.message); }
      },
    }, h('h2', { style: 'margin-top:0', text: 'שיוך טופס לחתימה' }), err,
    h('div', { class: 'row' },
      h('div', { class: 'field' }, h('label', { for: 'as-t', text: 'טופס / נוהל' }), tSel),
      h('div', { class: 'field' }, h('label', { for: 'as-mode', text: 'למי לשייך' }), mode)),
    target,
    h('div', { class: 'row' },
      h('div', { class: 'field' }, h('label', { for: 'as-due', text: 'מועד יעד' }), due),
      h('div', { class: 'field' }, h('label', { for: 'as-note', text: 'הערה לעובדים' }), note)),
    h('button', { class: 'btn primary', type: 'submit' }, 'שיוך'));

    const STATUS_A = { open: 'פתוח', done: 'נחתם', cancelled: 'בוטל' };
    const table = list.length ? h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['עובד/ת', 'מחלקה', 'טופס', 'יעד', 'סטטוס', ''].map((x) => h('th', { scope: 'col', text: x })))),
      h('tbody', null, list.map((a) => h('tr', null,
        h('td', { text: a.user_name }), h('td', { text: a.department_name || '' }), h('td', { text: a.title }),
        h('td', { text: fmtIsoDate(a.due_date) || '—' }),
        h('td', null, h('span', { class: `status ${a.status === 'done' ? 'st-approved' : 'st-pending'}`, text: STATUS_A[a.status] })),
        h('td', null, a.status === 'open' ? h('button', { class: 'btn small', onclick: async () => { await api(`/assignments/${a.id}`, { method: 'DELETE' }); toast('השיוך בוטל'); render(); } }, 'ביטול') : null))))))
      : h('p', { class: 'empty', text: 'עדיין לא שויכו טפסים' });

    return h('div', null, h('h1', { text: 'שיוך טפסים ומעקב' }),
      h('p', { class: 'lead', text: 'שייכו נהלים וחוברות הדרכה לעובדים, ועקבו מי חתם.' }), form, h('h2', { text: 'שיוכים קיימים' }), table);
  }

  // ═════════════ ניהול: משתמשים ═════════════
  async function viewUsers() {
    usersCache = null;
    const [users, departments] = await Promise.all([api('/users'), api('/departments')]);
    const edit = (u) => {
      const isNew = !u;
      u = u || { role: 'employee', active: 1 };
      const f = {
        employee_no: h('input', { type: 'text', id: 'u-no', value: u.employee_no || '' }),
        full_name: h('input', { type: 'text', id: 'u-name', value: u.full_name || '' }),
        job_title: h('input', { type: 'text', id: 'u-job', value: u.job_title || '', list: 'jobs' }),
        email: h('input', { type: 'email', id: 'u-email', value: u.email || '' }),
        phone: h('input', { type: 'tel', id: 'u-phone', value: u.phone || '' }),
        department_id: h('select', { id: 'u-dept' }, h('option', { value: '', text: '—' }), departments.map((d) => h('option', { value: d.id, text: d.name, selected: d.id === u.department_id }))),
        role: h('select', { id: 'u-role' }, Object.entries(ROLE).filter(([k]) => k !== 'admin' || hasRole('admin')).map(([k, v]) => h('option', { value: k, text: v, selected: k === u.role }))),
        active: h('input', { type: 'checkbox', id: 'u-active', checked: !!u.active }),
        password: h('input', { type: 'password', id: 'u-pw', autocomplete: 'new-password' }),
      };
      const err = errorBox();
      const fld = (id, label, el) => h('div', { class: 'field' }, h('label', { for: id, text: label }), el);
      const dlg = openDialog({
        title: isNew ? 'הוספת משתמש' : `עריכת ${u.full_name}`,
        body: h('div', null, err,
          h('datalist', { id: 'jobs' }, ['אחות', 'אח', 'סטודנט/ית', 'כוח עזר', 'אחות אחראית', 'רופא/ה', 'מזכיר/ה רפואי/ת'].map((j) => h('option', { value: j }))),
          h('div', { class: 'row' }, fld('u-no', 'מספר עובד', f.employee_no), fld('u-name', 'שם מלא', f.full_name)),
          h('div', { class: 'row' }, fld('u-job', 'תפקיד', f.job_title), fld('u-dept', 'מחלקה', f.department_id)),
          h('div', { class: 'row' }, fld('u-email', 'דוא"ל', f.email), fld('u-phone', 'טלפון', f.phone)),
          h('div', { class: 'row' }, fld('u-role', 'הרשאה במערכת', f.role), fld('u-pw', isNew ? 'סיסמה ראשונית' : 'איפוס סיסמה (אופציונלי)', f.password)),
          h('label', { class: 'choice', for: 'u-active' }, f.active, h('span', { text: 'משתמש פעיל' }))),
        actions: [
          h('button', { class: 'btn primary', onclick: async () => {
            err.hide();
            const body = { employee_no: f.employee_no.value, full_name: f.full_name.value, job_title: f.job_title.value, email: f.email.value, phone: f.phone.value,
              department_id: f.department_id.value || null, role: f.role.value, active: f.active.checked, password: f.password.value };
            try {
              if (isNew) await api('/users', { method: 'POST', body });
              else {
                await api(`/users/${u.id}`, { method: 'PUT', body });
                if (f.password.value) await api(`/users/${u.id}/reset-password`, { method: 'POST', body: { password: f.password.value } });
              }
              dlg.close(); toast('נשמר'); render();
            } catch (e) { err.show(e.message); }
          } }, 'שמירה'),
          h('button', { class: 'btn', onclick: () => dlg.close() }, 'ביטול'),
        ],
      });
    };
    return h('div', null,
      h('div', { class: 'sub-head' }, h('h1', { text: 'משתמשים' }), h('button', { class: 'btn primary', onclick: () => edit(null) }, '➕ משתמש חדש')),
      h('div', { class: 'table-wrap', style: 'margin-top:1rem' }, h('table', null,
        h('thead', null, h('tr', null, ['מס׳ עובד', 'שם', 'תפקיד', 'מחלקה', 'הרשאה', 'סטטוס', ''].map((x) => h('th', { scope: 'col', text: x })))),
        h('tbody', null, users.map((u) => h('tr', null,
          h('td', { text: u.employee_no }), h('td', { text: u.full_name }), h('td', { text: u.job_title || '' }), h('td', { text: u.department_name || '' }),
          h('td', { text: ROLE[u.role] }), h('td', { text: u.active ? 'פעיל' : 'לא פעיל' }),
          h('td', null, h('button', { class: 'btn small', onclick: () => edit(u), 'aria-label': `עריכת ${u.full_name}` }, 'עריכה'))))))));
  }

  // ═════════════ ניהול: מחלקות ═════════════
  async function viewDepartments() {
    const [departments, users] = await Promise.all([api('/departments'), api('/users')]);
    const edit = (d) => {
      const name = h('input', { type: 'text', id: 'd-name', value: d?.name || '' });
      const mgr = h('select', { id: 'd-mgr' }, h('option', { value: '', text: '— ללא —' }),
        users.filter((u) => u.role !== 'employee').map((u) => h('option', { value: u.id, text: `${u.full_name} (${ROLE[u.role]})`, selected: u.id === d?.manager_id })));
      const err = errorBox();
      const dlg = openDialog({
        title: d ? `עריכת ${d.name}` : 'מחלקה חדשה',
        body: h('div', null, err, h('div', { class: 'field' }, h('label', { for: 'd-name', text: 'שם המחלקה' }), name),
          h('div', { class: 'field' }, h('label', { for: 'd-mgr', text: 'מנהל/ת המחלקה (מקבל/ת את הטפסים לאישור)' }), mgr)),
        actions: [
          h('button', { class: 'btn primary', onclick: async () => {
            try {
              await api(d ? `/departments/${d.id}` : '/departments', { method: d ? 'PUT' : 'POST', body: { name: name.value, manager_id: Number(mgr.value) || null } });
              dlg.close(); toast('נשמר'); render();
            } catch (e) { err.show(e.message); }
          } }, 'שמירה'),
          h('button', { class: 'btn', onclick: () => dlg.close() }, 'ביטול'),
        ],
      });
    };
    return h('div', null,
      h('div', { class: 'sub-head' }, h('h1', { text: 'מחלקות' }), h('button', { class: 'btn primary', onclick: () => edit(null) }, '➕ מחלקה חדשה')),
      h('div', { class: 'table-wrap', style: 'margin-top:1rem' }, h('table', null,
        h('thead', null, h('tr', null, ['מחלקה', 'מנהל/ת', 'עובדים', ''].map((x) => h('th', { scope: 'col', text: x })))),
        h('tbody', null, departments.map((d) => h('tr', null, h('td', { text: d.name }), h('td', { text: d.manager_name || '—' }), h('td', { text: d.user_count }),
          h('td', null, h('button', { class: 'btn small', onclick: () => edit(d) }, 'עריכה'))))))));
  }

  // ═════════════ ניהול: תבניות ═════════════
  async function viewTemplates() {
    const templates = await api('/templates?all=1');
    return h('div', null,
      h('div', { class: 'sub-head' }, h('h1', { text: 'תבניות טפסים' }), h('a', { class: 'btn primary', href: '#/manage/templates/new' }, '➕ טופס חדש')),
      h('p', { class: 'lead', text: 'כל שינוי בתבנית יוצר גרסה חדשה. טפסים שכבר נחתמו שומרים את הגרסה שבה נחתמו.' }),
      h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['טופס', 'קטגוריה', 'מסלול אישור', 'גרסה', 'סטטוס', ''].map((x) => h('th', { scope: 'col', text: x })))),
        h('tbody', null, templates.map((t) => h('tr', null,
          h('td', { text: t.title }), h('td', null, catTag(t.category)), h('td', { text: t.workflow.map((s) => s.label).join(' ← ') || '—' }),
          h('td', { text: t.version }), h('td', { text: t.active ? 'פעיל' : 'מושבת' }),
          h('td', null, h('a', { class: 'btn small', href: `#/manage/templates/${t.id}` }, 'עריכה'))))))));
  }

  const FIELD_TYPE_LABELS = { text: 'טקסט קצר', textarea: 'טקסט ארוך', number: 'מספר', date: 'תאריך', time: 'שעה', email: 'דוא"ל', tel: 'טלפון', select: 'רשימה נפתחת', radio: 'בחירה יחידה', checkbox: 'תיבת אישור', checklist: 'רשימת סימון', file: 'קובץ מצורף', heading: 'כותרת ביניים', info: 'טקסט הסבר' };

  async function viewTemplateEditor(id) {
    const isNew = id === 'new';
    const t = isNew ? { title: '', category: 'procedure', description: '', document_text: '', fields: [], workflow: [{ type: 'direct_manager', label: 'אישור מנהל/ת ישיר/ה' }], active: true } : await api(`/templates/${id}`);
    const users = await getUsers();
    const err = errorBox();
    const title = h('input', { type: 'text', id: 't-title', value: t.title });
    const category = h('select', { id: 't-cat' }, Object.entries(CATEGORY).map(([k, v]) => h('option', { value: k, text: v, selected: k === t.category })));
    const desc = h('input', { type: 'text', id: 't-desc', value: t.description || '' });
    const doc = h('textarea', { id: 't-doc', style: 'min-height:180px' }); doc.value = t.document_text || '';
    const active = h('input', { type: 'checkbox', id: 't-active', checked: t.active });

    let fields = t.fields.map((f) => ({ ...f }));
    let workflow = t.workflow.map((s) => ({ ...s }));
    const fieldsBox = h('div');
    const wfBox = h('div');

    const drawFields = () => {
      fieldsBox.replaceChildren(...fields.map((f, i) => {
        const lbl = h('input', { type: 'text', id: `bf-l-${i}`, value: f.label, oninput: (e) => { f.label = e.target.value; } });
        const typ = h('select', { id: `bf-t-${i}`, onchange: (e) => { f.type = e.target.value; drawFields(); } }, Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => h('option', { value: k, text: v, selected: k === f.type })));
        const req = h('input', { type: 'checkbox', id: `bf-r-${i}`, checked: !!f.required, onchange: (e) => { f.required = e.target.checked; } });
        const opts = ['select', 'radio', 'checklist'].includes(f.type)
          ? h('div', { class: 'field' }, h('label', { for: `bf-o-${i}`, text: 'אפשרויות (שורה לכל אפשרות)' }),
            (() => { const ta = h('textarea', { id: `bf-o-${i}`, oninput: (e) => { f.options = e.target.value.split('\n'); } }); ta.value = (f.options || []).join('\n'); return ta; })())
          : null;
        const move = (d) => { const j = i + d; if (j < 0 || j >= fields.length) return; [fields[i], fields[j]] = [fields[j], fields[i]]; drawFields(); };
        return h('div', { class: 'builder-field' },
          h('div', { class: 'row' },
            h('div', { class: 'field' }, h('label', { for: `bf-l-${i}`, text: `שדה ${i + 1} – תווית` }), lbl),
            h('div', { class: 'field' }, h('label', { for: `bf-t-${i}`, text: 'סוג' }), typ)),
          opts,
          h('div', { class: 'btn-row' },
            h('label', { class: 'choice', for: `bf-r-${i}` }, req, h('span', { text: 'חובה' })),
            h('button', { type: 'button', class: 'btn small', 'aria-label': 'הזזה למעלה', onclick: () => move(-1) }, '▲'),
            h('button', { type: 'button', class: 'btn small', 'aria-label': 'הזזה למטה', onclick: () => move(1) }, '▼'),
            h('button', { type: 'button', class: 'btn small danger', onclick: () => { fields.splice(i, 1); drawFields(); } }, 'הסרה')));
      }));
    };
    const drawWf = () => {
      wfBox.replaceChildren(h('ol', null, workflow.map((s, i) => h('li', { style: 'margin-bottom:.4rem' },
        `${s.label} `, h('button', { type: 'button', class: 'btn small', onclick: () => { workflow.splice(i, 1); drawWf(); } }, 'הסרה')))),
      workflow.length ? null : h('p', { class: 'help', text: 'ללא שלבי אישור – הטופס יסומן "אושר" מיד עם חתימת העובד/ת.' }));
    };
    drawFields(); drawWf();

    const addStepSel = h('select', { id: 't-step' },
      h('option', { value: 'direct_manager', text: 'מנהל/ת ישיר/ה של המגיש/ה' }),
      h('option', { value: 'role:hr', text: 'משאבי אנוש' }), h('option', { value: 'role:education', text: 'מחלקת הדרכה' }), h('option', { value: 'role:admin', text: 'מנהלי מערכת' }),
      h('optgroup', { label: 'גורם ספציפי' }, users.filter((u) => u.role !== 'employee').map((u) => h('option', { value: `user:${u.id}`, text: u.full_name }))));
    const addStep = () => {
      const [type, v] = addStepSel.value.split(':');
      const label = addStepSel.selectedOptions[0].textContent;
      if (type === 'direct_manager') workflow.push({ type, label: 'אישור מנהל/ת ישיר/ה' });
      else if (type === 'role') workflow.push({ type, role: v, label });
      else workflow.push({ type, user_id: Number(v), label: `אישור ${label}` });
      drawWf();
    };

    const save = async () => {
      err.hide();
      const body = { title: title.value, category: category.value, description: desc.value, document_text: doc.value, active: active.checked,
        fields: fields.map((f) => ({ ...f, options: f.options ? f.options.map((o) => o.trim()).filter(Boolean) : undefined })), workflow };
      try {
        if (isNew) { const r = await api('/templates', { method: 'POST', body }); toast('התבנית נוצרה'); go(`/manage/templates/${r.id}`); }
        else { await api(`/templates/${id}`, { method: 'PUT', body }); toast('נשמר – נוצרה גרסה חדשה'); render(); }
      } catch (e) { err.show(e.message); }
    };

    return h('div', null,
      h('h1', { text: isNew ? 'טופס חדש' : `עריכת: ${t.title}` }),
      !isNew ? h('p', { class: 'lead', text: `גרסה ${t.version}` }) : null,
      err,
      h('div', { class: 'card' },
        h('div', { class: 'row' },
          h('div', { class: 'field' }, h('label', { for: 't-title', text: 'כותרת' }), title),
          h('div', { class: 'field' }, h('label', { for: 't-cat', text: 'קטגוריה' }), category)),
        h('div', { class: 'field' }, h('label', { for: 't-desc', text: 'תיאור קצר' }), desc),
        h('div', { class: 'field' }, h('label', { for: 't-doc', text: 'תוכן מסמך / נוהל לקריאה (אופציונלי)' }), doc),
        h('label', { class: 'choice', for: 't-active' }, active, h('span', { text: 'טופס פעיל (מופיע לעובדים)' }))),
      h('h2', { text: 'שדות' }), fieldsBox,
      h('button', { type: 'button', class: 'btn', onclick: () => { fields.push({ key: `f${Date.now().toString(36)}`, label: '', type: 'text' }); drawFields(); fieldsBox.lastElementChild?.querySelector('input')?.focus(); } }, '➕ הוספת שדה'),
      h('h2', { text: 'מסלול אישור' }), h('div', { class: 'card' }, wfBox,
        h('div', { class: 'row', style: 'align-items:end' }, h('div', { class: 'field' }, h('label', { for: 't-step', text: 'הוספת שלב' }), addStepSel),
          h('div', { class: 'field', style: 'flex:0' }, h('button', { type: 'button', class: 'btn', onclick: addStep }, 'הוספה')))),
      h('div', { class: 'btn-row', style: 'margin-top:1.25rem' }, h('button', { class: 'btn primary', onclick: save }, 'שמירה'), h('a', { class: 'btn', href: '#/manage/templates' }, 'חזרה')));
  }

  // ═════════════ פרופיל ונגישות ═════════════
  function viewProfile() {
    const err = errorBox();
    const cur = h('input', { type: 'password', id: 'p-cur', autocomplete: 'current-password' });
    const nw = h('input', { type: 'password', id: 'p-new', autocomplete: 'new-password' });
    const nw2 = h('input', { type: 'password', id: 'p-new2', autocomplete: 'new-password' });
    const pref = (key, label) => {
      const el = h('input', { type: 'checkbox', id: `pref-${key}`, checked: !!prefs[key], onchange: (e) => { prefs[key] = e.target.checked; localStorage.setItem('hs_prefs', JSON.stringify(prefs)); applyPrefs(); } });
      return h('label', { class: 'choice', for: `pref-${key}` }, el, h('span', { text: label }));
    };
    return h('div', null,
      h('h1', { text: 'הגדרות ונגישות' }),
      state.me.must_change_password ? h('div', { class: 'error-box', role: 'alert', text: 'יש להחליף את הסיסמה הראשונית.' }) : null,
      h('div', { class: 'card' }, h('h2', { style: 'margin-top:0', text: 'נגישות' }), pref('largeText', 'הגדלת טקסט'), pref('highContrast', 'ניגודיות גבוהה')),
      h('form', {
        class: 'card',
        onsubmit: async (e) => {
          e.preventDefault(); err.hide();
          if (nw.value !== nw2.value) { err.show('הסיסמאות אינן תואמות'); return; }
          try { await api('/me/password', { method: 'POST', body: { current: cur.value, next: nw.value } }); toast('הסיסמה עודכנה'); state.me.must_change_password = 0; render(); }
          catch (ex) { err.show(ex.message); }
        },
      }, h('h2', { style: 'margin-top:0', text: 'שינוי סיסמה' }), err,
      h('div', { class: 'field' }, h('label', { for: 'p-cur', text: 'סיסמה נוכחית' }), cur),
      h('div', { class: 'row' },
        h('div', { class: 'field' }, h('label', { for: 'p-new', text: 'סיסמה חדשה' }), nw, h('div', { class: 'help', text: 'לפחות 8 תווים, אותיות וספרות' })),
        h('div', { class: 'field' }, h('label', { for: 'p-new2', text: 'אימות סיסמה חדשה' }), nw2)),
      h('button', { class: 'btn primary', type: 'submit' }, 'עדכון סיסמה')));
  }

  // ═════════════ אתחול ═════════════
  (async function init() {
    try { const hres = await fetch('/api/health').then((r) => r.json()); state.demo = !!hres.demo; } catch { /* ignore */ }
    await loadMe();
    if (state.me?.must_change_password && !location.hash.includes('profile')) location.hash = '#/profile';
    render();
  })();
})();
