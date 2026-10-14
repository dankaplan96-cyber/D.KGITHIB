'use strict';
// ════════════════════════════════════════════════════════════════
// Employees — list, employee card, add / leave, documents
// ════════════════════════════════════════════════════════════════

const EmpUI = { q: '', role: '', status: 'current', sort: 'role' };

App.views.employees = {
  render() {
    const D = db();
    const ids = currentDeptIds();
    let list = Object.values(D.employees).filter((e) => ids.includes(e.deptId));
    if (EmpUI.status === 'current') list = list.filter((e) => e.status !== 'left');
    else if (EmpUI.status === 'absent') list = list.filter((e) => e.status !== 'left' && e.status !== 'active');
    else if (EmpUI.status === 'left') list = list.filter((e) => e.status === 'left');
    if (EmpUI.role) list = list.filter((e) => e.role === EmpUI.role);
    if (EmpUI.q) {
      const q = EmpUI.q.trim();
      list = list.filter((e) => e.name.includes(q) || (e.idNum && e.idNum.includes(q.replace(/\D/g, '') || '§')) || U.nameSimilarity(e.name, q) > 0.8);
    }
    list = EmpUI.sort === 'name' ? U.sortBy(list, (e) => e.name) : EmpUI.sort === 'start' ? U.sortBy(list, (e) => U.parseDate(e.startDate) || '9999') : U.sortBy(list, (e) => deptName(D, e.deptId), (e) => ROLE_ORDER.indexOf(e.role), (e) => e.order || 0, (e) => e.name);
    const issuesBy = {};
    for (const e of list) issuesBy[e.id] = employeeIssues(D, e);
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${EmpUI[key] === v ? 'on' : ''}" data-act="empfilter" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const rows = list.map((e) => {
      const iss = issuesBy[e.id];
      const crit = iss.filter((i) => i.sev === 'crit').length, warn = iss.filter((i) => i.sev === 'warn').length;
      return `<tr class="click ${e.status === 'left' ? 'dim' : ''}" data-act="emp" data-id="${e.id}">
        <td><div class="row" style="gap:10px;flex-wrap:nowrap"><div class="avatar" style="width:32px;height:32px;font-size:12px">${esc(initials(e.name))}</div><div><div class="b">${esc(e.name)} ${statusBadge(e)}</div>${e.title ? `<div class="tiny muted">${esc(e.title)}</div>` : ''}</div></div></td>
        <td>${roleBadge(e.role)}</td><td class="num">${esc(e.idNum)}</td>${ids.length > 1 ? `<td>${esc(deptName(D, e.deptId))}</td>` : ''}
        <td class="c num">${Math.round((Number(e.scope) || 0) * 100)}%</td><td class="num">${esc(U.fmtDate(e.startDate))}</td>
        <td>${crit ? `<span class="bdg crit">${crit} דחוף</span> ` : ''}${warn ? `<span class="bdg warn">${warn} לטיפול</span>` : ''}${!crit && !warn && e.status !== 'left' ? '<span class="bdg ok">תקין</span>' : ''}</td></tr>`;
    }).join('');
    return `<div class="card"><div class="hd" style="flex-wrap:wrap">
        <div class="search" style="width:260px">${icon('search', 16)}<input class="inp" id="emp-q" placeholder="חיפוש לפי שם או ת.ז." value="${esc(EmpUI.q)}" data-input="empsearch"></div>
        ${seg('status', [['current', 'עובדים פעילים'], ['absent', 'בהיעדרות'], ['left', 'עזבו'], ['all', 'הכל']])}
        <select class="inp auto" data-act="emprole"><option value="">כל המעמדות</option>${ROLE_ORDER.map((r) => `<option value="${r}" ${EmpUI.role === r ? 'selected' : ''}>${ROLES[r].label}</option>`).join('')}</select>
        <select class="inp auto" data-act="empsort" title="מיון"><option value="role" ${EmpUI.sort === 'role' ? 'selected' : ''}>מיון: מחלקה ומעמד</option><option value="name" ${EmpUI.sort === 'name' ? 'selected' : ''}>מיון: שם</option><option value="start" ${EmpUI.sort === 'start' ? 'selected' : ''}>מיון: ותק</option></select>
        <div class="grow" style="flex:1"></div><span class="muted small">${list.length} עובדים</span>
        ${can('employees_edit') ? `<button class="btn pri" data-act="newemp">${icon('plus', 16)} עובד/ת חדש/ה</button>` : ''}
      </div><div class="bd flush tbl-wrap">${list.length ? `<table class="tbl"><thead><tr><th>שם</th><th>מעמד</th><th>ת.ז.</th>${ids.length > 1 ? '<th>מחלקה</th>' : ''}<th class="c">משרה</th><th>תחילת עבודה</th><th>מצב</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty"><div class="ttl">לא נמצאו עובדים</div>אפשר להוסיף עובד/ת חדש/ה או לייבא מקובץ אקסל</div>'}</div></div>`;
  },
};
Object.assign(ACT, {
  empfilter: (el) => { EmpUI[el.dataset.k] = el.dataset.v; render(); },
  emprole: (el) => { EmpUI.role = el.value; render(); },
  empsort: (el) => { EmpUI.sort = el.value; render(); },
  empsearch: U.debounce((el) => { EmpUI.q = el.value; render(); }, 200),
  newemp: () => newEmployeeDialog(),
});

// ── New employee ────────────────────────────────────────────────
function newEmployeeDialog() {
  const D = db();
  const depts = deptList(D).filter((d) => myDeptIds().includes(d.id));
  if (!depts.length) { toast('יש להגדיר מחלקה לפני הוספת עובדים (הגדרות ומחלקות)', 'warn'); return; }
  const m = openModal({
    title: 'עובד/ת חדש/ה', size: 'lg',
    body: `<div class="grid g3">
      ${fieldHTML('שם מלא *', '<input class="inp" id="ne-name" autofocus>', { hint: 'כפי שיופיע בדוחות, לדוגמה: כהן דנה' })}
      ${fieldHTML('ת.ז. *', '<input class="inp num" id="ne-id" inputmode="numeric" maxlength="9">', { hint: '9 ספרות' })}
      ${fieldHTML('מחלקה *', selectHTML('id="ne-dept"', depts.map((d) => [d.id, d.name]), singleDept()))}
      ${fieldHTML('מעמד מקצועי *', selectHTML('id="ne-role"', ROLE_ORDER.map((r) => [r, ROLES[r].label]), 'rn'))}
      ${fieldHTML('מגדר', selectHTML('id="ne-gender"', [['נ', 'נקבה'], ['ז', 'זכר']], 'נ'))}
      ${fieldHTML('תחילת עבודה *', `<input class="inp" id="ne-start" placeholder="dd.mm.yy" value="${U.fmtDate(U.todayISO())}">`)}
      ${fieldHTML('חלקיות משרה (%)', '<input class="inp num" id="ne-scope" value="100" inputmode="decimal">')}
      ${fieldHTML('חוזה', selectHTML('id="ne-contract"', Object.entries(CONTRACTS), 'ח'))}
      ${fieldHTML('שנת לידה', '<input class="inp num" id="ne-by" inputmode="numeric" maxlength="4">')}
    </div>
    <label class="chk" style="margin-top:14px"><input type="checkbox" id="ne-mov" checked> לרשום גם בטבלת "נכנסים" (תקינה)</label>
    <div id="ne-err" class="small" style="color:var(--crit);margin-top:8px"></div>`,
    footer: '<button class="btn pri" id="ne-save">הוספה</button><button class="btn" data-act="closemodal">ביטול</button>',
  });
  m.querySelector('#ne-save').addEventListener('click', () => {
    const v = (id) => m.querySelector(id).value.trim();
    const err = (t) => { m.querySelector('#ne-err').textContent = t; };
    const name = v('#ne-name'), idNum = U.normId(v('#ne-id')), start = U.parseDate(v('#ne-start'));
    if (!name) return err('יש להזין שם');
    if (!idNum) return err('יש להזין ת.ז.');
    const dup = Object.values(db().employees).find((e) => e.idNum === idNum);
    if (dup) return err(`מספר ת.ז. זה כבר קיים במערכת: ${dup.name} (${deptName(db(), dup.deptId)})`);
    if (!start) return err('תאריך תחילת עבודה לא תקין');
    const proceed = () => {
      const scope = (U.num(v('#ne-scope')) ?? 100);
      const deptId = v('#ne-dept');
      const order = Math.max(0, ...Object.values(db().employees).filter((e) => e.deptId === deptId).map((e) => e.order || 0)) + 1;
      const e = newEmployee({ name, idNum, deptId, role: v('#ne-role'), gender: v('#ne-gender'), startDate: start, scope: scope > 1.5 ? scope / 100 : scope, contract: v('#ne-contract'), birthYear: U.num(v('#ne-by')) || null, order, updatedBy: App.user.username });
      const mov = m.querySelector('#ne-mov').checked;
      Store.update((d) => {
        d.employees[e.id] = e;
        if (mov) { const id = U.uid('mov'); d.movements[id] = { id, kind: 'in', date: start, name, dept: deptName(d, deptId), role: ROLES[e.role].label, reason: '', col1: '', col2: '' }; }
      }, ['עובד חדש', `${name} · ${deptName(db(), deptId)}`, e.id]);
      closeModal();
      toast('העובד/ת נוסף/ה', 'ok');
      go('employee', { id: e.id });
    };
    if (!U.validIsraeliId(idNum)) { confirmBox('ת.ז. לא תקינה', `ספרת הביקורת של ${idNum} אינה תקינה. לשמור בכל זאת?`, { ok: 'שמירה' }).then((ok) => ok && proceed()); return; }
    proceed();
  });
}

// ── Employee card ───────────────────────────────────────────────
const EMP_TABS = [
  ['details', 'פרטים ותקן'], ['safety', 'בטיחות הטיפול'], ['shift', 'אחראיות משמרת'], ['conv', 'שיחות משוב'],
  ['evals', 'הערכות'], ['training', 'חת"ש והרשאות'], ['docs', 'מסמכים'], ['history', 'היסטוריה'],
];
App.views.employee = {
  title: (p) => { const e = db().employees[p.id]; return e ? e.name : 'עובד/ת'; },
  render(p) {
    const D = db();
    const e = D.employees[p.id];
    if (!e || !canSeeEmp(e)) return '<div class="card"><div class="empty"><div class="ttl">העובד/ת לא נמצא/ה</div></div></div>';
    const tab = p.tab && EMP_TABS.some((t) => t[0] === p.tab) ? p.tab : 'details';
    const ed = can('employees_edit') && e.status !== 'left' || (can('employees_edit') && tab === 'details');
    const issues = employeeIssues(D, e);
    const byTab = {};
    issues.forEach((i) => { if (i.sev !== 'info') byTab[i.tab] = (byTab[i.tab] || 0) + 1; });
    const docsCount = Object.values(D.docs).filter((x) => x.empId === e.id).length;
    const tabs = EMP_TABS.filter(([k]) => k !== 'docs' || can('documents_view')).map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-view="employee" data-id="${e.id}" data-tab="${k}">${l}${byTab[k] ? `<span class="n">${byTab[k]}</span>` : ''}${k === 'docs' && docsCount ? ` <span class="faint">(${docsCount})</span>` : ''}</button>`).join('');
    const head = `<div class="emp-head"><button class="iconbtn" data-act="nav" data-view="employees" title="חזרה לרשימה">${icon('back')}</button><div class="avatar">${esc(initials(e.name))}</div>
      <div style="flex:1"><h2>${esc(e.name)} ${statusBadge(e)}</h2><div class="row small muted" style="gap:8px;margin-top:3px">${roleBadge(e.role)}<span>${esc(deptName(D, e.deptId))}</span>${e.title ? `<span>· ${esc(e.title)}</span>` : ''}<span>· ת.ז. <span class="num">${esc(e.idNum || '—')}</span></span><span>· ותק מ-${esc(U.fmtDate(e.startDate) || '—')}</span></div></div>
      ${can('employees_edit') ? (e.status === 'left' ? `<button class="btn" data-act="emprejoin" data-id="${e.id}">החזרה לעבודה</button>` : `<button class="btn" data-act="empleave" data-id="${e.id}">סיום העסקה</button>`) : ''}
      ${can('employees_edit') && can('users_manage') ? `<button class="iconbtn" data-act="empdelete" data-id="${e.id}" title="מחיקה לצמיתות">${icon('trash')}</button>` : ''}</div>`;
    const body = EMP_TAB_RENDER[tab](e, ed, issues);
    return `<div class="card"> ${head}<div class="tabs">${tabs}</div><div class="bd">${body}</div></div>`;
  },
  mounted(p) { const e = db().employees[p.id]; if (e && (p.tab === 'docs')) loadDocList(e); },
};

// Bound input helpers: data-emp + data-path, saved on change
const bindAttrs = (e, path, type = 'text') => `data-act="empfield" data-emp="${e.id}" data-path="${path}" data-type="${type}"`;
function inputF(e, path, type, ed, extra = '') {
  const v = getPath2(e, path);
  const shown = displayCellValue(v, type === 'num' ? 'text' : type);
  const placeholder = type === 'date' ? 'dd.mm.yy' : '';
  return `<input class="inp ${type === 'num' ? 'num' : ''}" ${bindAttrs(e, path, type)} value="${esc(shown)}" placeholder="${placeholder}" ${ed ? '' : 'disabled'} ${extra}>`;
}
function selectF(e, path, options, ed) { return selectHTML(`${bindAttrs(e, path, 'select')} ${ed ? '' : 'disabled'}`, options, getPath2(e, path)); }

ACT.empfield = (el) => {
  const type = el.dataset.type;
  let v = el.type === 'checkbox' ? el.checked : parseCellValue(el.value, type);
  const path = el.dataset.path;
  if (path === 'scope') { const n = U.num(el.value); if (n == null) { toast('חלקיות משרה לא תקינה', 'err'); return; } v = n > 1.5 ? n / 100 : n; el.value = Math.round(v * 100); }
  if (path === 'birthYear') v = U.num(el.value) || null;
  if (path === 'idNum') {
    v = U.normId(el.value);
    const dup = v && Object.values(db().employees).find((x) => x.idNum === v && x.id !== el.dataset.emp);
    if (dup) { toast(`ת.ז. זו כבר קיימת אצל ${dup.name}`, 'err'); el.classList.add('bad'); return; }
    el.classList.toggle('bad', !!v && !U.validIsraeliId(v));
    if (v && !U.validIsraeliId(v)) toast('שימו לב: ספרת הביקורת של ת.ז. אינה תקינה', 'warn');
  }
  if (type === 'date' && el.value.trim() && !U.parseDate(el.value)) toast('התאריך נשמר כטקסט חופשי (לא זוהה כתאריך)', 'warn');
  setEmpField(el.dataset.emp, path, v);
  if (el.tagName === 'INPUT' && el.type !== 'checkbox') el.value = path === 'scope' ? Math.round(v * 100) : displayCellValue(v, type === 'num' ? 'text' : type);
  if (['role', 'deptId', 'name', 'status', 'shift.active', 'title'].includes(path)) render();
};

const EMP_TAB_RENDER = {
  details(e, ed) {
    const D = db();
    const depts = deptList(D).filter((d) => myDeptIds().includes(d.id) || d.id === e.deptId);
    const sc = Math.round((Number(e.scope) || 0) * 100);
    const age = e.birthYear ? ` (גיל ${U.thisYear() - e.birthYear})` : '';
    return `<div class="stack">
      <div class="section-title">פרטים אישיים</div>
      <div class="grid g4">
        ${fieldHTML('שם מלא', inputF(e, 'name', 'text', ed))}
        ${fieldHTML('ת.ז.', inputF(e, 'idNum', 'text', ed, 'inputmode="numeric" maxlength="9"'), { hint: e.idNum && !U.validIsraeliId(e.idNum) ? '<span style="color:var(--crit)">ספרת ביקורת לא תקינה</span>' : '' })}
        ${fieldHTML('מגדר', selectF(e, 'gender', [['נ', 'נקבה'], ['ז', 'זכר']], ed))}
        ${fieldHTML(`שנת לידה${age}`, inputF(e, 'birthYear', 'num', ed, 'maxlength="4"'))}
        ${fieldHTML('מגזר (בדוח: "מגדר")', selectF(e, 'sector', Object.entries(SECTORS), ed))}
        ${fieldHTML('תואר (B.A / M.A)', selectF(e, 'degree', DEGREES.map((x) => [x, x || '—']), ed))}
        ${fieldHTML('קורס על בסיסי', `<input class="inp" list="adv-list" ${bindAttrs(e, 'advCourse')} value="${esc(e.advCourse)}" ${ed ? '' : 'disabled'}><datalist id="adv-list">${ADV_COURSES.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`)}
        ${fieldHTML('הדרכה קלינית / אחר', inputF(e, 'clinical', 'text', ed))}
      </div>
      <div class="section-title" style="margin-top:6px">העסקה ותקן</div>
      <div class="grid g4">
        ${fieldHTML('מחלקה', selectF(e, 'deptId', depts.map((d) => [d.id, d.name]), ed))}
        ${fieldHTML('מעמד מקצועי', selectF(e, 'role', ROLE_ORDER.map((r) => [r, ROLES[r].label]), ed))}
        ${fieldHTML('תפקיד (מופיע ליד השם בדוח התקן)', `<input class="inp" list="title-list" ${bindAttrs(e, 'title')} value="${esc(e.title)}" ${ed ? '' : 'disabled'}><datalist id="title-list"><option value="ראש צוות"><option value="אחראי/ת משמרת"><option value="סגנית אחראית"></datalist>`)}
        ${fieldHTML("מס' רישום", inputF(e, 'regNum', 'text', ed))}
        ${fieldHTML('תחילת עבודה', inputF(e, 'startDate', 'date', ed))}
        ${fieldHTML('חלקיות משרה (%)', `<input class="inp num" ${bindAttrs(e, 'scope', 'num')} value="${sc}" ${ed ? '' : 'disabled'}>`)}
        ${fieldHTML('חוזה', selectF(e, 'contract', Object.entries(CONTRACTS), ed))}
        ${fieldHTML('עובד בי"ח / כח אדם', selectF(e, 'employer', [['', `אוטומטי (${employerOf({ ...e, employer: '' })})`], ['בי"ח', 'בי"ח'], ['כח אדם', 'כח אדם']], ed))}
      </div>
      <div class="section-title" style="margin-top:6px">סטטוס והערות</div>
      <div class="grid g4">
        ${fieldHTML('סטטוס', selectF(e, 'status', Object.entries(STATUSES).filter(([k]) => k !== 'left' || e.status === 'left').map(([k, s]) => [k, s.label]), ed && e.status !== 'left'), { hint: e.status !== 'active' && e.status !== 'left' ? `בדוחות יופיע: "${esc(reportName(e))}"` : '' })}
        ${fieldHTML('הערת סטטוס', inputF(e, 'statusNote', 'text', ed, 'placeholder="לדוגמה: חזרה מחל&quot;ת 25.05.26"'))}
        ${fieldHTML('הערות (עמודת הערות בדוח התקן)', inputF(e, 'notes', 'text', ed), { cls: 'span2' })}
        ${e.status === 'left' ? fieldHTML('תאריך סיום', inputF(e, 'leftDate', 'date', ed)) + fieldHTML('סיבת סיום', inputF(e, 'leftReason', 'text', ed)) : ''}
      </div>
      <div class="faint tiny">השינויים נשמרים אוטומטית · עודכן לאחרונה ${esc(U.fmtDateTime(e.updatedAt))}${e.updatedBy ? ` ע"י ${esc(e.updatedBy)}` : ''}</div>
    </div>`;
  },
  safety(e, ed) {
    const years = db().settings.years.safety.slice().sort((a, b) => b - a);
    return `<div class="muted small" style="margin-bottom:12px">בדיקת בטיחות הטיפול השנתית — מי בודק, תאריך וציון. השנים המוצגות מוגדרות בהגדרות.</div><div class="yeargrid">${years.map((y) => `<div class="yearrow"><div class="y">${y}</div>
      ${fieldHTML('מי בודק', inputF(e, `safety.${y}.checker`, 'text', ed))}${fieldHTML('תאריך', inputF(e, `safety.${y}.date`, 'date', ed))}${fieldHTML('ציון', inputF(e, `safety.${y}.score`, 'num', ed))}</div>`).join('')}</div>${ed ? `<div class="row" style="margin-top:12px"><button class="btn sm" data-act="yearadd" data-k="safety">${icon('plus', 14)} הוספת שנה</button></div>` : ''}`;
  },
  shift(e, ed) {
    const s = e.shift || {};
    const vs = dateStatus(s.validUntil, db().settings.alerts.shiftWarnDays);
    return `<div class="stack"><label class="chk"><input type="checkbox" ${bindAttrs(e, 'shift.active', 'bool')} ${s.active ? 'checked' : ''} ${ed ? '' : 'disabled'}> משמש/ת כאחראי/ת משמרת (מופיע/ה בגיליון "אחראיות משמרת")</label>
      ${s.active ? `<div class="grid g3">
        ${fieldHTML('קורס על בסיסי (כפי שיופיע בגיליון)', inputF(e, 'shift.course', 'text', ed, `placeholder="${esc(e.advCourse || '')}"`), { hint: 'ריק = לפי "קורס על בסיסי" בפרטי העובד' })}
        ${fieldHTML('מינוי לתפקיד', inputF(e, 'shift.appoint', 'date', ed))}
        ${fieldHTML('הערכת ניהול משמרת', inputF(e, 'shift.evalDate', 'date', ed))}
        ${fieldHTML('חידוש מינוי', inputF(e, 'shift.renew', 'date', ed))}
        ${fieldHTML('תוקף המינוי', inputF(e, 'shift.validUntil', 'date', ed), { hint: vs === 'crit' ? '<span style="color:var(--crit)">פג תוקף</span>' : vs === 'warn' ? `<span style="color:var(--warn)">יפוג בעוד ${U.daysUntil(U.parseDate(s.validUntil))} ימים</span>` : '' })}
        ${fieldHTML('ביצוע אחריות למשמרות', inputF(e, 'shift.performs', 'text', ed, 'placeholder="לדוגמה: ערב ולילה"'))}
      </div>` : ''}</div>`;
  },
  conv(e, ed) {
    const years = db().settings.years.conversations.slice().sort((a, b) => b - a);
    return `<div class="muted small" style="margin-bottom:12px">שיחות משוב חצי-שנתיות. ניתן להזין תאריך (לדוגמה 12.5.24) או טקסט חופשי (לדוגמה "אוגוסט").</div><div class="yeargrid">${years.map((y) => `<div class="yearrow" style="grid-template-columns:80px repeat(2,minmax(0,1fr))"><div class="y">${y}</div>
      ${fieldHTML("מחצית א'", inputF(e, `conv.${y}.h1`, 'datetext', ed))}${fieldHTML("מחצית ב'", inputF(e, `conv.${y}.h2`, 'datetext', ed))}</div>`).join('')}</div>${ed ? `<div class="row" style="margin-top:12px"><button class="btn sm" data-act="yearadd" data-k="conversations">${icon('plus', 14)} הוספת שנה</button></div>` : ''}`;
  },
  evals(e, ed) {
    const years = db().settings.years.evaluations.slice().sort((a, b) => b - a);
    return `<div class="muted small" style="margin-bottom:12px">הערכת עובד שנתית — ציון, תאריך או הערה.</div><div class="grid g6">${years.map((y) => fieldHTML(String(y), inputF(e, `evals.${y}`, 'datetext', ed))).join('')}</div>${ed ? `<div class="row" style="margin-top:12px"><button class="btn sm" data-act="yearadd" data-k="evaluations">${icon('plus', 14)} הוספת שנה</button></div>` : ''}`;
  },
  training(e, ed) {
    const defs = trainingDefs(db());
    const groups = TRAINING_GROUPS.filter((g) => defs.some((t) => t.group === g));
    const addBtn = ed ? `<div class="row" style="margin-top:14px"><button class="btn sm" data-act="trnadd">${icon('plus', 14)} הוספת קורס / הרשאה</button></div>` : '';
    const item = (t) => {
      const v = (e.trn || {})[t.key] || '';
      const isChk = v === CHECK;
      const st = t.expiry ? dateStatus(v, db().settings.alerts.bloodWarnDays) : '';
      const done = hasValue(v);
      return `<div class="trn-item ${done ? 'done' : ''}" ${st && st !== 'ok' ? `style="border-color:${st === 'crit' ? '#f2b8b8' : '#f3d29b'};background:${st === 'crit' ? '#fff6f6' : '#fffaf0'}"` : ''}>
        ${t.kind === 'check' ? `<button class="togg ${isChk ? 'on' : ''}" data-act="trntoggle" data-emp="${e.id}" data-key="${t.key}" ${ed ? '' : 'disabled'} title="סימון בוצע">✓</button>` : ''}
        <div class="l">${esc(t.label)}${st === 'crit' ? ' <span class="bdg crit">פג</span>' : st === 'warn' ? ' <span class="bdg warn">יפוג בקרוב</span>' : ''}</div>
        <input class="inp" ${bindAttrs(e, `trn.${t.key}`, t.kind === 'text' ? 'text' : 'check')} value="${esc(isChk ? '' : displayCellValue(v, 'check'))}" placeholder="${t.kind === 'date' ? 'תוקף' : t.kind === 'text' ? '' : 'תאריך / הערה'}" ${ed ? '' : 'disabled'}></div>`;
    };
    if (!ROLES[e.role].nurse) return '<div class="banner info">גיליון חת"ש מנוהל לאחים/אחיות (מוסמכים ומעשיים). ניתן עדיין לתעד כאן עבור עובד/ת זה/ו.</div>' + groups.map((g) => `<div class="section-title" style="margin-top:12px">${g}</div><div class="trn-grid">${defs.filter((t) => t.group === g).map(item).join('')}</div>`).join('') + addBtn;
    return groups.map((g) => `<div class="section-title" style="margin-top:${g === groups[0] ? 0 : 14}px">${g}</div><div class="trn-grid">${defs.filter((t) => t.group === g).map(item).join('')}</div>`).join('') + addBtn;
  },
  docs(e) {
    const ed = can('documents_edit');
    const docs = U.sortBy(Object.values(db().docs).filter((x) => x.empId === e.id), (x) => x.addedAt ? -new Date(x.addedAt).getTime() : 0);
    if (!Store.connected) return '<div class="banner warn">מסמכים נשמרים בתיקייה המשותפת — יש להתחבר אליה כדי לצפות ולהוסיף מסמכים.</div>';
    return `${ed ? `<div class="dropzone" data-drop="docdrop" data-emp="${e.id}" data-act="docpick" style="margin-bottom:14px">${icon('upload', 26)}<div class="big">גרירת קבצים לכאן או לחיצה לבחירה</div><div class="small">PDF, תמונות, Word, Excel — הקבצים נשמרים בתיקייה המשותפת</div></div>` : ''}
      ${docs.length ? `<table class="tbl"><thead><tr><th>מסמך</th><th>סוג</th><th>הועלה</th><th></th></tr></thead><tbody>${docs.map((d) => `<tr><td><a href="#" data-act="docopen" data-id="${d.id}">${esc(d.name)}</a></td><td>${esc(d.type || '')}</td><td class="small muted">${esc(U.fmtDateTime(d.addedAt))} · ${esc(d.addedBy || '')}</td><td class="c">${ed ? `<button class="iconbtn" data-act="docdel" data-id="${d.id}" title="מחיקה">${icon('trash', 16)}</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">אין מסמכים לעובד/ת זה/ו</div>'}`;
  },
  history(e) {
    const items = U.sortBy(Object.values(db().audit).filter((a) => a.ref === e.id), (a) => -new Date(a.at).getTime()).slice(0, 200);
    return items.length ? `<table class="tbl"><thead><tr><th>מתי</th><th>מי</th><th>פעולה</th><th>פירוט</th></tr></thead><tbody>${items.map((a) => `<tr><td class="small nowrap">${esc(U.fmtDateTime(a.at))}</td><td class="small">${esc(a.userName)}</td><td class="small">${esc(a.action)}</td><td class="small">${esc(a.detail)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">אין היסטוריית שינויים</div>';
  },
};
function loadDocList() { /* list is rendered from the database index */ }

Object.assign(ACT, {
  trntoggle: (el) => {
    const e = db().employees[el.dataset.emp];
    const cur = (e.trn || {})[el.dataset.key];
    setEmpField(e.id, `trn.${el.dataset.key}`, cur === CHECK ? '' : CHECK);
    render();
  },
  empleave: (el) => {
    const e = db().employees[el.dataset.id];
    const m = openModal({
      title: `סיום העסקה — ${e.name}`, size: 'sm',
      body: `<div class="stack">${fieldHTML('תאריך סיום', `<input class="inp" id="lv-date" value="${U.fmtDate(U.todayISO())}">`)}${fieldHTML('סיבה', '<input class="inp" id="lv-reason" list="lv-list"><datalist id="lv-list"><option value="התפטרות"><option value="פיטורים"><option value="פרישה"><option value="מעבר מחלקה"><option value="סיום חוזה"></datalist>')}<label class="chk"><input type="checkbox" id="lv-mov" checked> לרשום בטבלת "הפסקת עבודה" (תקינה)</label><div class="muted small">העובד/ת יוסר/תוסר מהדוחות השוטפים, וכל הנתונים יישמרו בהיסטוריה.</div></div>`,
      footer: '<button class="btn danger" id="lv-ok">סיום העסקה</button><button class="btn" data-act="closemodal">ביטול</button>',
    });
    m.querySelector('#lv-ok').addEventListener('click', () => {
      const date = U.parseDate(m.querySelector('#lv-date').value) || U.todayISO(), reason = m.querySelector('#lv-reason').value.trim();
      const mov = m.querySelector('#lv-mov').checked;
      Store.update((d) => {
        const x = d.employees[e.id];
        Object.assign(x, { status: 'left', leftDate: date, leftReason: reason, updatedAt: U.nowISO(), updatedBy: App.user.username });
        if (mov) { const id = U.uid('mov'); d.movements[id] = { id, kind: 'out', date, name: x.name, dept: deptName(d, x.deptId), role: ROLES[x.role].label, reason, col1: '', col2: '' }; }
      }, ['סיום העסקה', `${e.name} · ${reason}`, e.id]);
      closeModal(); render(); toast('העסקה הסתיימה ונרשמה', 'ok');
    });
  },
  emprejoin: (el) => {
    const e = db().employees[el.dataset.id];
    Store.update((d) => { Object.assign(d.employees[e.id], { status: 'active', leftDate: '', leftReason: '' }); }, ['החזרה לעבודה', e.name, e.id]);
    render();
  },
  empdelete: async (el) => {
    const e = db().employees[el.dataset.id];
    if (!(await confirmBox('מחיקת עובד/ת לצמיתות', `<b>${esc(e.name)}</b> וכל הנתונים שלו/ה יימחקו מהמאגר.<br>בדרך כלל עדיף "סיום העסקה" — כך ההיסטוריה נשמרת.`, { ok: 'מחיקה לצמיתות', danger: true }))) return;
    Store.update((d) => { delete d.employees[e.id]; Object.values(d.docs).filter((x) => x.empId === e.id).forEach((x) => delete d.docs[x.id]); }, ['מחיקת עובד', `${e.name} (${e.idNum})`, e.id]);
    go('employees');
  },
  docpick: (el) => pickFiles({ multiple: true }, (files) => ACT.docdrop(el, files)),
  docdrop: async (el, files) => {
    const empId = el.dataset.emp;
    const type = await promptBox('סוג המסמך', 'סוג / תיאור (לא חובה)', '', { placeholder: 'לדוגמה: טופס קליטה, תעודה, הערכה' });
    if (type === null) return;
    let n = 0;
    for (const f of files) {
      try {
        const stored = await Store.saveDocument(empId, f);
        const id = U.uid('doc');
        Store.update((d) => { d.docs[id] = { id, empId, name: f.name, stored, type, size: f.size, addedAt: U.nowISO(), addedBy: App.user.displayName }; }, ['הוספת מסמך', `${db().employees[empId].name}: ${f.name}`, empId]);
        n++;
      } catch (e) { toast(`שמירת ${f.name} נכשלה: ${e.message}`, 'err'); }
    }
    if (n) toast(`${n} מסמכים נשמרו`, 'ok');
    render();
  },
  docopen: async (el) => {
    const d = db().docs[el.dataset.id];
    try { const f = await Store.openDocument(d.empId, d.stored); const url = URL.createObjectURL(f); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000); } catch (e) { toast('הקובץ לא נמצא בתיקייה המשותפת', 'err'); }
  },
  docdel: async (el) => {
    const d = db().docs[el.dataset.id];
    if (!(await confirmBox('מחיקת מסמך', `למחוק את "${esc(d.name)}"?`, { ok: 'מחיקה', danger: true }))) return;
    try { await Store.deleteDocument(d.empId, d.stored); } catch (e) { /* file may already be gone */ }
    Store.update((x) => { delete x.docs[d.id]; }, ['מחיקת מסמך', d.name, d.empId]);
    render();
  },
});
