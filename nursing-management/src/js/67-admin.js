'use strict';
// ════════════════════════════════════════════════════════════════
// Administration — users & permissions, settings & departments,
// shared folder / backups / audit log
// ════════════════════════════════════════════════════════════════

App.views.users = {
  render() {
    const D = db();
    const users = U.sortBy(Object.values(D.users), (u) => (u.active ? 0 : 1), (u) => u.displayName);
    const deptsLabel = (u) => (!u.depts || !u.depts.length || (u.perms || []).includes('*') ? 'כל המחלקות' : u.depts.map((id) => deptName(D, id)).filter(Boolean).join(', '));
    return `<div class="card"><div class="hd"><h3>משתמשים (${users.length})</h3><span class="muted small">משתמשים, סיסמאות והרשאות נשמרים במאגר המשותף ומתעדכנים בכל המחשבים</span><div style="flex:1"></div><button class="btn" data-act="usersexport">${icon('download', 16)} ייצוא רשימת משתמשים</button><button class="btn pri" data-act="useredit">${icon('plus', 16)} משתמש חדש</button></div>
      <div class="bd flush tbl-wrap"><table class="tbl"><thead><tr><th>שם</th><th>שם משתמש</th><th>תבנית הרשאות</th><th>מחלקות</th><th>כניסה אחרונה</th><th>מצב</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr class="${u.active ? '' : 'dim'}"><td class="b">${esc(u.displayName)}${u.id === App.user.id ? ' <span class="bdg blue">את/ה</span>' : ''}</td><td class="ltr">${esc(u.username)}</td>
        <td>${esc((ROLE_TEMPLATES[u.role] || {}).label || 'מותאם')}${u.role === 'custom' ? ` <span class="faint small">(${(u.perms || []).length})</span>` : ''}</td><td class="small">${esc(deptsLabel(u))}</td>
        <td class="small muted">${esc(U.fmtDateTime(u.lastLogin) || '—')}</td>
        <td>${u.active ? (u.lockedUntil && u.lockedUntil > Date.now() ? '<span class="bdg crit">נעול זמנית</span>' : u.mustChange ? '<span class="bdg warn">סיסמה זמנית</span>' : '<span class="bdg ok">פעיל</span>') : '<span class="bdg">מושבת</span>'}</td>
        <td class="nowrap"><button class="btn sm" data-act="useredit" data-id="${u.id}">${icon('edit', 14)} עריכה</button> <button class="btn sm" data-act="userreset" data-id="${u.id}">איפוס סיסמה</button></td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="banner info" style="margin-top:16px">${icon('lock')}<div class="grow small">הסיסמאות נשמרות כ-hash מוצפן בלבד. מאחר שהמערכת פועלת ללא שרת, הגנת הקבצים עצמם בתיקיית הרשת נקבעת בהרשאות Windows של התיקייה — מומלץ לאפשר גישה לתיקייה רק לצוות המורשה.</div></div>`;
  },
};

function permMatrixHTML(perms, disabled) {
  const has = (p) => perms.includes('*') || perms.includes(p);
  return `<table class="tbl perm-tbl"><thead><tr><th>אזור במערכת</th>${['view', 'edit', 'other'].map((l) => `<th class="c">${l === 'view' ? 'צפייה' : l === 'edit' ? 'עריכה' : 'פעולה'}</th>`).join('')}</tr></thead><tbody>
    ${PERMISSIONS.map((m) => `<tr><td>${esc(m.label)}</td>${['view', 'edit', 'other'].map((col) => {
      const lvl = col === 'other' ? m.levels.find((x) => !['view', 'edit'].includes(x)) : m.levels.includes(col) ? col : null;
      if (!lvl) return '<td></td>';
      const key = `${m.key}_${lvl}`;
      return `<td class="c"><label class="chk" title="${esc(LEVEL_LABEL[lvl])}"><input type="checkbox" class="permchk" value="${key}" ${has(key) ? 'checked' : ''} ${disabled ? 'disabled' : ''}>${col === 'other' ? ` <span class="small">${esc(LEVEL_LABEL[lvl])}</span>` : ''}</label></td>`;
    }).join('')}</tr>`).join('')}</tbody></table>`;
}

ACT.useredit = (el) => {
  const D = db();
  const u = el.dataset.id ? D.users[el.dataset.id] : null;
  const isNew = !u;
  const role = u ? u.role : 'editor';
  const perms = u ? (u.perms || []) : ROLE_TEMPLATES.editor.perms;
  const depts = deptList(D);
  const m = openModal({
    title: isNew ? 'משתמש חדש' : `עריכת משתמש — ${u.displayName}`, size: 'lg',
    body: `<div class="stack">
      <div class="grid g3">
        ${fieldHTML('שם לתצוגה *', `<input class="inp" id="ue-name" value="${esc(u ? u.displayName : '')}" autofocus>`)}
        ${fieldHTML('שם משתמש (לכניסה) *', `<input class="inp" id="ue-user" style="direction:ltr;text-align:left" value="${esc(u ? u.username : '')}">`, { hint: 'אותיות באנגלית / ספרות' })}
        ${fieldHTML('תבנית הרשאות', selectHTML('id="ue-role"', Object.entries(ROLE_TEMPLATES).map(([k, r]) => [k, r.label]), role))}
        ${isNew ? fieldHTML('סיסמה ראשונית *', '<input class="inp" id="ue-pass" type="text" autocomplete="off">', { hint: 'המשתמש יתבקש להחליף בכניסה הראשונה' }) : ''}
        <div class="field" style="justify-content:flex-end"><label class="chk"><input type="checkbox" id="ue-active" ${!u || u.active ? 'checked' : ''}> חשבון פעיל</label></div>
      </div>
      <div><div class="section-title">הרשאות</div><div id="ue-perms">${permMatrixHTML(perms, role === 'admin')}</div><div class="faint small">שינוי סימון הופך את התבנית ל"מותאם אישית". עריכה כוללת צפייה.</div></div>
      <div><div class="section-title">מחלקות שהמשתמש רואה</div><div class="row" style="gap:14px" id="ue-depts">
        <label class="chk"><input type="radio" name="ue-scope" value="all" ${!u || !u.depts || !u.depts.length ? 'checked' : ''}> כל המחלקות</label>
        <label class="chk"><input type="radio" name="ue-scope" value="some" ${u && u.depts && u.depts.length ? 'checked' : ''}> רק המחלקות המסומנות:</label>
        ${depts.map((d) => `<label class="chk"><input type="checkbox" class="ue-dept" value="${d.id}" ${u && (u.depts || []).includes(d.id) ? 'checked' : ''}> ${esc(d.name)}</label>`).join('') || '<span class="muted small">לא הוגדרו מחלקות</span>'}
      </div><div class="faint small">לדוגמה: אחראית מחלקה תראה ותעדכן רק את עובדי המחלקה שלה.</div></div>
      <div id="ue-err" class="small" style="color:var(--crit)"></div>
    </div>`,
    footer: `<button class="btn pri" id="ue-save">שמירה</button><button class="btn" data-act="closemodal">ביטול</button>${!isNew && u.id !== App.user.id ? '<span style="flex:1"></span><button class="btn danger" id="ue-del">מחיקת משתמש</button>' : ''}`,
  });
  const roleSel = m.querySelector('#ue-role');
  roleSel.addEventListener('change', () => {
    const r = roleSel.value;
    if (r !== 'custom') m.querySelector('#ue-perms').innerHTML = permMatrixHTML(ROLE_TEMPLATES[r].perms, r === 'admin');
    else m.querySelector('#ue-perms').innerHTML = permMatrixHTML([...m.querySelectorAll('.permchk:checked')].map((x) => x.value), false);
  });
  m.querySelector('#ue-perms').addEventListener('change', () => { roleSel.value = 'custom'; });
  m.querySelectorAll('.ue-dept').forEach((c) => c.addEventListener('change', () => { m.querySelector('input[name=ue-scope][value=some]').checked = true; }));
  const delBtn = m.querySelector('#ue-del');
  if (delBtn) delBtn.addEventListener('click', async () => {
    const others = activeAdmins(db()).filter((x) => x.id !== u.id);
    if (userCan(u, 'users_manage') && !others.length) { m.querySelector('#ue-err').textContent = 'חייב להישאר לפחות משתמש פעיל אחד עם הרשאת ניהול משתמשים'; return; }
    if (!(await confirmBox('מחיקת משתמש', `למחוק את המשתמש <b>${esc(u.displayName)}</b>? (מומלץ להשבית במקום למחוק)`, { ok: 'מחיקה', danger: true }))) return;
    Store.update((d) => { delete d.users[u.id]; }, ['מחיקת משתמש', u.username]);
    closeModal(); render();
  });
  m.querySelector('#ue-save').addEventListener('click', async () => {
    const err = (t) => { m.querySelector('#ue-err').textContent = t; };
    const name = m.querySelector('#ue-name').value.trim(), username = m.querySelector('#ue-user').value.trim().toLowerCase();
    const r = roleSel.value;
    const active = m.querySelector('#ue-active').checked;
    let p = r === 'admin' ? ['*'] : [...m.querySelectorAll('.permchk:checked')].map((x) => x.value);
    if (r !== 'custom' && r !== 'admin') p = ROLE_TEMPLATES[r].perms.slice();
    const scope = m.querySelector('input[name=ue-scope]:checked').value;
    const dsel = scope === 'all' ? [] : [...m.querySelectorAll('.ue-dept:checked')].map((x) => x.value);
    if (!name || !username) return err('יש למלא שם ושם משתמש');
    if (!/^[a-z0-9._-]{2,}$/.test(username)) return err('שם המשתמש: אותיות באנגלית, ספרות, נקודה או מקף');
    if (Object.values(db().users).some((x) => x.username === username && (!u || x.id !== u.id))) return err('שם המשתמש כבר קיים');
    if (scope === 'some' && !dsel.length) return err('יש לסמן לפחות מחלקה אחת');
    if (!p.length) return err('יש לבחור לפחות הרשאה אחת');
    const willManage = active && (p.includes('*') || p.includes('users_manage'));
    if (u && userCan(u, 'users_manage') && !willManage && !activeAdmins(db()).some((x) => x.id !== u.id)) return err('חייב להישאר לפחות משתמש פעיל אחד עם הרשאת ניהול משתמשים');
    let cred = null;
    if (isNew) {
      const pw = m.querySelector('#ue-pass').value;
      const pp = passwordProblem(pw, username);
      if (pp) return err(pp);
      cred = await hashPassword(pw);
    }
    const id = u ? u.id : U.uid('usr');
    Store.update((d) => {
      const base = d.users[id] || { id, createdAt: U.nowISO(), cred, mustChange: true, lastLogin: '' };
      d.users[id] = { ...base, username, displayName: name, role: r, perms: p, depts: p.includes('*') ? [] : dsel, active };
    }, [isNew ? 'משתמש חדש' : 'עדכון משתמש', `${username} · ${ROLE_TEMPLATES[r].label}${active ? '' : ' (מושבת)'}`]);
    closeModal(); render();
    toast(isNew ? 'המשתמש נוצר' : 'המשתמש עודכן', 'ok');
    if (isNew) showCredentials(name, username, m.querySelector('#ue-pass').value, true);
  });
};
ACT.usersexport = async () => {
  const D = db();
  const wb = new window.ExcelJS.Workbook();
  const ws = wb.addWorksheet('משתמשים', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [{ header: 'שם', width: 26 }, { header: 'שם משתמש', width: 16 }, { header: 'תבנית הרשאות', width: 26 }, { header: 'הרשאות', width: 60 }, { header: 'מחלקות', width: 30 }, { header: 'מצב', width: 14 }, { header: 'כניסה אחרונה', width: 18 }, { header: 'סיסמה', width: 30 }];
  const permLabel = (p) => { if (p === '*') return 'הכל'; const [k, l] = p.split('_'); const m = PERMISSIONS.find((x) => x.key === k); return m ? `${m.label} (${LEVEL_LABEL[l] || l})` : p; };
  for (const u of U.sortBy(Object.values(D.users), (x) => x.displayName)) {
    ws.addRow([u.displayName, u.username, (ROLE_TEMPLATES[u.role] || {}).label || '', (u.perms || []).map(permLabel).join('; '),
      !u.depts || !u.depts.length || (u.perms || []).includes('*') ? 'כל המחלקות' : u.depts.map((id) => deptName(D, id)).join(', '),
      u.active ? (u.mustChange ? 'פעיל — סיסמה זמנית' : 'פעיל') : 'מושבת', U.fmtDateTime(u.lastLogin), 'מוצפנת — ניתן לאפס במערכת']);
  }
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  ws.eachRow((r) => { r.alignment = { vertical: 'middle', wrapText: true, readingOrder: 'rtl' }; });
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `משתמשים_${U.todayISO()}.xlsx`);
  Store.update(() => {}, ['ייצוא נתונים', 'רשימת משתמשים']);
};
ACT.userreset = async (el) => {
  const u = db().users[el.dataset.id];
  if (!(await confirmBox('איפוס סיסמה', `ליצור סיסמה זמנית חדשה עבור <b>${esc(u.displayName)}</b>?<br>המשתמש יתבקש לבחור סיסמה אישית בכניסה הבאה.`, { ok: 'איפוס' }))) return;
  const pw = tempPassword();
  const cred = await hashPassword(pw);
  Store.update((d) => { Object.assign(d.users[u.id], { cred, mustChange: true, failed: 0, lockedUntil: null }); }, ['איפוס סיסמה', u.username]);
  render();
  showCredentials(u.displayName, u.username, pw, true);
};

// Shows a new / reset password once, with copy and print
function showCredentials(name, username, pw, temp) {
  const box = (lbl, v) => `<div class="field"><label>${lbl}</label><div style="font-size:20px;font-weight:700;letter-spacing:1px;direction:ltr;text-align:center;padding:10px;background:#f3f6f9;border-radius:8px;user-select:all">${esc(v)}</div></div>`;
  const m = openModal({
    title: `פרטי כניסה — ${name}`, size: 'sm',
    body: `<div class="stack">${box('שם משתמש', username)}${box(temp ? 'סיסמה זמנית' : 'סיסמה', pw)}<div class="muted small">יש למסור למשתמש. מטעמי אבטחה הסיסמה נשמרת מוצפנת ולא תוצג שוב${temp ? ', והמשתמש יתבקש לבחור סיסמה אישית בכניסה הראשונה' : ''}.</div></div>`,
    footer: '<button class="btn pri" data-act="closemodal">סגירה</button><button class="btn" id="cr-copy">העתקה</button><button class="btn" id="cr-print">הדפסה</button>',
  });
  m.querySelector('#cr-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`שם משתמש: ${username}\nסיסמה: ${pw}`); toast('הועתק', 'ok'); } catch (e) { toast('ההעתקה נחסמה — יש לסמן ולהעתיק ידנית', 'warn'); }
  });
  m.querySelector('#cr-print').addEventListener('click', () => {
    const w = window.open('', '_blank');
    if (!w) return toast('יש לאפשר חלונות קופצים', 'err');
    w.document.write(`<!doctype html><html dir="rtl" lang="he"><meta charset="utf-8"><title>פרטי כניסה</title><body style="font-family:Arial;padding:30px"><h2>מערכת ניהול סיעוד — פרטי כניסה</h2><p><b>${esc(name)}</b></p><p>שם משתמש: <b dir="ltr">${esc(username)}</b></p><p>${temp ? 'סיסמה זמנית' : 'סיסמה'}: <b dir="ltr">${esc(pw)}</b></p><p style="color:#666;font-size:13px">${temp ? 'בכניסה הראשונה תתבקש/י לבחור סיסמה אישית.' : ''} אין להעביר את הפרטים לאחרים.</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  });
}

// ── Settings ────────────────────────────────────────────────────
App.views.settings = {
  render() {
    const D = db();
    const S = D.settings;
    const depts = deptList(D);
    const yearsField = (k, label) => fieldHTML(label, `<div class="chips">${S.years[k].slice().sort().map((y) => `<span class="chip">${y}<button class="chip-x" data-act="yeardel" data-k="${k}" data-y="${y}" title="הסרת השנה">×</button></span>`).join('')}<button class="btn sm" data-act="yearadd" data-k="${k}">${icon('plus', 14)} הוספת שנה</button></div>`);
    const num = (path, label, hint = '') => fieldHTML(label, `<input class="inp num" data-act="setnum" data-path="${path}" value="${esc(getPath2(S, path))}">`, { hint });
    return `<div class="card" style="margin-bottom:16px"><div class="hd"><h3>מחלקות</h3><span class="muted small">כל מחלקה מופקת כקובץ Excel נפרד</span><div style="flex:1"></div><button class="btn pri" data-act="deptadd">${icon('plus', 16)} מחלקה חדשה</button></div>
      <div class="bd flush tbl-wrap"><table class="tbl"><thead><tr><th>שם המחלקה (כותרת הדוח)</th><th>אגף</th><th>תמהיל חולים</th><th class="c">מיטות</th><th>אחראי/ת</th><th class="c">עובדים</th><th></th></tr></thead><tbody>
      ${depts.map((d) => `<tr><td><input class="inp" data-act="deptset" data-id="${d.id}" data-k="name" value="${esc(d.name)}"></td>
        <td>${selectHTML(`data-act="deptset" data-id="${d.id}" data-k="division"`, [['', '—'], ...S.divisions.map((x) => [x, x])], d.division)}</td>
        <td><input class="inp" data-act="deptset" data-id="${d.id}" data-k="mix" value="${esc(d.mix || '')}"></td>
        <td class="c"><input class="inp num" style="width:70px;text-align:center" data-act="deptset" data-id="${d.id}" data-k="beds" data-type="num" value="${esc(d.beds ?? '')}"></td>
        <td><input class="inp" data-act="deptset" data-id="${d.id}" data-k="headNurse" value="${esc(d.headNurse || '')}"></td>
        <td class="c num">${employeesOf(D, { deptId: d.id }).length}</td>
        <td class="nowrap"><button class="iconbtn" data-act="deptmove" data-id="${d.id}" data-dir="-1" title="למעלה">▲</button><button class="iconbtn" data-act="deptmove" data-id="${d.id}" data-dir="1" title="למטה">▼</button><button class="iconbtn" data-act="deptdel" data-id="${d.id}" title="מחיקה">${icon('trash', 15)}</button></td></tr>`).join('') || '<tr><td colspan="7" class="faint" style="padding:14px">אין מחלקות — הוסיפו מחלקה או ייבאו קובץ אקסל</td></tr>'}
      </tbody></table></div></div>
      <div class="grid g2" style="align-items:start">
        <div class="card"><div class="hd"><h3>כללי</h3></div><div class="bd stack">
          ${fieldHTML('שם הארגון', `<input class="inp" data-act="settext" data-path="orgName" value="${esc(S.orgName)}">`)}
          <div class="grid g2">${num('alerts.shiftWarnDays', 'התראה לפני פקיעת מינוי אחראי/ת משמרת (ימים)')}${num('alerts.bloodWarnDays', 'התראה לפני פקיעת הרשאת מתן דם (ימים)')}</div>
        </div></div>
        <div class="card"><div class="hd"><h3>אגפים</h3><div style="flex:1"></div><button class="btn sm pri" data-act="divadd">${icon('plus', 14)} אגף חדש</button></div><div class="bd flush"><table class="tbl"><tbody>
          ${S.divisions.map((x, i) => { const n = depts.filter((d) => d.division === x).length; return `<tr><td class="b">${esc(x)}</td><td class="muted small">${n} מחלקות</td><td class="nowrap" style="text-align:left"><button class="iconbtn" data-act="divrename" data-i="${i}" title="שינוי שם">${icon('edit', 15)}</button><button class="iconbtn" data-act="divdel" data-i="${i}" title="מחיקה">${icon('trash', 15)}</button></td></tr>`; }).join('') || '<tr><td class="faint">אין אגפים</td></tr>'}
        </tbody></table></div></div>
        <div class="card"><div class="hd"><h3>שנים בגיליונות ובדוחות</h3><span class="muted small">קובע את עמודות השנים בגיליון ובדוח</span></div><div class="bd stack">
          ${yearsField('safety', 'בטיחות הטיפול')}${yearsField('conversations', 'שיחות משוב')}${yearsField('evaluations', 'הערכות עובדים')}
        </div></div>
        <div class="card"><div class="hd"><h3>קורסים והרשאות נוספים (חת"ש)</h3><div style="flex:1"></div><button class="btn sm pri" data-act="trnadd">${icon('plus', 14)} הוספה</button></div><div class="bd flush"><table class="tbl"><tbody>
          ${S.customTraining.map((t, i) => `<tr><td class="b">${esc(t.label)}</td><td class="muted small">${esc(t.group)} · ${({ check: 'סימון ✓', date: 'תאריך תוקף', text: 'טקסט' })[t.kind] || ''}</td><td class="nowrap" style="text-align:left"><button class="iconbtn" data-act="trnrename" data-i="${i}" title="שינוי שם">${icon('edit', 15)}</button><button class="iconbtn" data-act="trndel" data-i="${i}" title="הסרה">${icon('trash', 15)}</button></td></tr>`).join('') || '<tr><td class="faint">אין — הקורסים וההרשאות הקבועים של הקובץ קיימים תמיד. כאן מוסיפים חדשים (מופיעים בגיליון, בכרטיס העובד ובדוח).</td></tr>'}
        </tbody></table></div></div>
        <div class="card"><div class="hd"><h3>מקדמי תקינה (תקן מקוצר)</h3></div><div class="bd grid g2">
          ${num('staffing.nurseFactor', 'מקדם תקינה לאחות')}${num('staffing.auxFactor', 'מקדם תקינה לכוח עזר')}
          ${num('staffing.auxBedFactor', 'דרישת כ"ע לפי מיטה', 'משמש לחישוב אוטומטי של דרישות משה"ב לכוחות עזר')}
          ${num('staffing.nurseGross', 'מחלק משמרות→תקנים (אחיות)', 'ברירת מחדל 4.5')}${num('staffing.otherGross', 'מחלק משמרות→תקנים (סטודנטים וכ"ע)', 'ברירת מחדל 5')}
        </div></div>
      </div>`;
  },
};
Object.assign(ACT, {
  deptadd: () => {
    const S = db().settings;
    const m = openModal({
      title: 'מחלקה חדשה', size: 'lg',
      body: `<div class="grid g3">
        ${fieldHTML('שם המחלקה *', '<input class="inp" id="nd-name" placeholder="לדוגמה: שיקום ה\'" autofocus>', { hint: 'כפי שיופיע בכותרת הדוח' })}
        ${fieldHTML('אגף', selectHTML('id="nd-div"', [...S.divisions.map((x) => [x, x]), ['__new', '+ אגף חדש…']], S.divisions[0] || '__new'))}
        ${fieldHTML('שם האגף החדש', '<input class="inp" id="nd-newdiv">', { cls: 'nd-newdiv' })}
        ${fieldHTML('תמהיל חולים', '<input class="inp" id="nd-mix" placeholder="לדוגמה: צעירים">')}
        ${fieldHTML('מספר מיטות', '<input class="inp num" id="nd-beds" inputmode="numeric">')}
        ${fieldHTML('אחראי/ת מחלקה', '<input class="inp" id="nd-head">')}
        ${fieldHTML('סגן/ית', '<input class="inp" id="nd-dep">')}
      </div><div id="nd-err" class="small" style="color:var(--crit);margin-top:8px"></div>`,
      footer: '<button class="btn pri" id="nd-save">הוספת המחלקה</button><button class="btn" data-act="closemodal">ביטול</button>',
    });
    const sel = m.querySelector('#nd-div'), nw = m.querySelector('.nd-newdiv');
    const sync = () => { nw.style.visibility = sel.value === '__new' ? 'visible' : 'hidden'; };
    sel.addEventListener('change', sync); sync();
    m.querySelector('#nd-save').addEventListener('click', () => {
      const v = (id) => m.querySelector(id).value.trim();
      const err = (t) => { m.querySelector('#nd-err').textContent = t; };
      const name = v('#nd-name');
      if (!name) return err('יש להזין שם מחלקה');
      if (findDeptByName(db(), name)) return err('מחלקה בשם זה כבר קיימת');
      let div = sel.value;
      if (div === '__new') { div = v('#nd-newdiv'); if (!div) return err('יש להזין שם לאגף החדש'); }
      const d = newDept(name, { order: Object.keys(db().depts).length, division: div, mix: v('#nd-mix'), beds: U.num(v('#nd-beds')), headNurse: v('#nd-head'), deputy: v('#nd-dep') });
      Store.update((x) => { if (!x.settings.divisions.includes(div)) x.settings.divisions.push(div); x.depts[d.id] = d; }, ['מחלקה חדשה', `${name} · ${div}`]);
      closeModal(); render(); toast('המחלקה נוספה', 'ok');
    });
  },
  deptset: (el) => {
    const v = el.dataset.type === 'num' ? (U.num(el.value) ?? null) : el.value.trim();
    if (el.dataset.k === 'name' && !v) { toast('שם המחלקה לא יכול להיות ריק', 'err'); render(); return; }
    Store.update((d) => { d.depts[el.dataset.id][el.dataset.k] = v; }, ['עדכון מחלקה', `${el.dataset.k}: ${v}`]);
  },
  deptmove: (el) => {
    const list = deptList(db());
    const i = list.findIndex((d) => d.id === el.dataset.id), j = i + Number(el.dataset.dir);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    Store.update((d) => { list.forEach((x, k) => { d.depts[x.id].order = k; }); });
    render();
  },
  deptdel: async (el) => {
    const D = db();
    const d = D.depts[el.dataset.id];
    const n = Object.values(D.employees).filter((e) => e.deptId === d.id).length;
    if (n) return toast(`לא ניתן למחוק מחלקה עם ${n} עובדים. יש להעביר אותם קודם למחלקה אחרת.`, 'err');
    if (!(await confirmBox('מחיקת מחלקה', `למחוק את המחלקה "${esc(d.name)}"?`, { ok: 'מחיקה', danger: true }))) return;
    Store.update((x) => { delete x.depts[d.id]; delete x.staffing[d.id]; }, ['מחיקת מחלקה', d.name]);
    render();
  },
  settext: (el) => { Store.update((d) => { setPath(d.settings, el.dataset.path, el.value.trim()); }, ['הגדרות', el.dataset.path]); },
  setnum: (el) => {
    const n = U.num(el.value);
    if (n == null) { toast('יש להזין מספר', 'err'); return; }
    Store.update((d) => { setPath(d.settings, el.dataset.path, n); }, ['הגדרות', `${el.dataset.path} = ${n}`]);
  },
  trnadd: () => {
    const m = openModal({
      title: 'הוספת קורס / הרשאה', size: 'sm',
      body: `<div class="stack">${fieldHTML('שם', '<input class="inp" id="ta-l" placeholder="לדוגמה: חתימה על נהלים 2027" autofocus>')}
        ${fieldHTML('קבוצה', selectHTML('id="ta-g"', TRAINING_GROUPS.map((g) => [g, g]), 'קורסים'))}
        ${fieldHTML('סוג', selectHTML('id="ta-k"', [['check', 'סימון ✓ (או תאריך ביצוע)'], ['date', 'תאריך תוקף (עם התראה לפני פקיעה)'], ['text', 'טקסט חופשי']], 'check'))}
        <div id="ta-e" class="small" style="color:var(--crit)"></div></div>`,
      footer: '<button class="btn pri" id="ta-ok">הוספה</button><button class="btn" data-act="closemodal">ביטול</button>',
    });
    m.querySelector('#ta-ok').addEventListener('click', () => {
      const label = m.querySelector('#ta-l').value.trim();
      if (!label) { m.querySelector('#ta-e').textContent = 'יש להזין שם'; return; }
      if (trainingDefs(db()).some((t) => t.label.replace(/\s/g, '') === label.replace(/\s/g, ''))) { m.querySelector('#ta-e').textContent = 'כבר קיים פריט בשם זה'; return; }
      const t = { key: customKey(label + Date.now()), label, group: m.querySelector('#ta-g').value, kind: m.querySelector('#ta-k').value };
      Store.update((d) => { d.settings.customTraining.push(t); }, ['הגדרות', `נוסף לחת"ש: ${label}`]);
      closeModal(); render(); toast('נוסף — מופיע בגיליון חת"ש, בכרטיס העובד ובדוח', 'ok');
    });
  },
  trnrename: async (el) => {
    const t = db().settings.customTraining[+el.dataset.i];
    const name = await promptBox('שינוי שם', 'שם', t.label);
    if (!name || name === t.label) return;
    Store.update((d) => { d.settings.customTraining[+el.dataset.i].label = name; }, ['הגדרות', `שינוי שם בחת"ש: ${t.label} ← ${name}`]);
    render();
  },
  trndel: async (el) => {
    const t = db().settings.customTraining[+el.dataset.i];
    if (!(await confirmBox('הסרה', `להסיר את "${esc(t.label)}" מהגיליון ומהדוח?<br><span class="muted small">הנתונים שהוזנו נשמרים, ויחזרו אם יוסף שוב פריט עם אותו מזהה.</span>`, { ok: 'הסרה' }))) return;
    Store.update((d) => { d.settings.customTraining.splice(+el.dataset.i, 1); }, ['הגדרות', `הוסר מחת"ש: ${t.label}`]);
    render();
  },
  divadd: async () => {
    const name = await promptBox('אגף חדש', 'שם האגף', '', { placeholder: 'לדוגמה: אגף שיקום', ok: 'הוספה' });
    if (!name) return;
    if (db().settings.divisions.includes(name)) return toast('אגף בשם זה כבר קיים', 'err');
    Store.update((d) => { d.settings.divisions.push(name); }, ['אגף חדש', name]);
    render();
  },
  divrename: async (el) => {
    const old = db().settings.divisions[+el.dataset.i];
    const name = await promptBox('שינוי שם אגף', 'שם האגף', old);
    if (!name || name === old) return;
    if (db().settings.divisions.includes(name)) return toast('אגף בשם זה כבר קיים', 'err');
    Store.update((d) => {
      d.settings.divisions = d.settings.divisions.map((x) => (x === old ? name : x));
      Object.values(d.depts).forEach((x) => { if (x.division === old) x.division = name; });
    }, ['שינוי שם אגף', `${old} ← ${name}`]);
    render();
  },
  divdel: async (el) => {
    const D = db();
    const name = D.settings.divisions[+el.dataset.i];
    const used = Object.values(D.depts).filter((x) => x.division === name);
    if (used.length) return toast(`לא ניתן למחוק: ${used.length} מחלקות משויכות לאגף זה (${used.map((x) => x.name).join(', ')}). יש לשייך אותן לאגף אחר קודם.`, 'err');
    if (D.settings.divisions.length === 1) return toast('חייב להישאר לפחות אגף אחד', 'err');
    if (!(await confirmBox('מחיקת אגף', `למחוק את "${esc(name)}"?`, { ok: 'מחיקה', danger: true }))) return;
    Store.update((d) => { d.settings.divisions = d.settings.divisions.filter((x) => x !== name); }, ['מחיקת אגף', name]);
    render();
  },
  yearadd: (el) => {
    const k = el.dataset.k;
    const cur = db().settings.years[k];
    const y0 = U.thisYear();
    const options = [];
    for (let y = y0 + 3; y >= y0 - 8; y--) if (!cur.includes(y)) options.push([y, y]);
    if (!options.length) return toast('כל השנים האפשריות כבר קיימות', 'warn');
    const next = cur.length ? Math.max(...cur) + 1 : y0;
    const m = openModal({
      title: 'הוספת שנה', size: 'sm',
      body: fieldHTML('שנה', selectHTML('id="ya-y"', options, options.some(([y]) => y === next) ? next : options[0][0]), { hint: 'תתווסף עמודה לשנה זו בגיליון ובדוח' }),
      footer: '<button class="btn pri" id="ya-ok">הוספה</button><button class="btn" data-act="closemodal">ביטול</button>',
    });
    m.querySelector('#ya-ok').addEventListener('click', () => {
      const y = Number(m.querySelector('#ya-y').value);
      Store.update((d) => { d.settings.years[k] = [...new Set([...d.settings.years[k], y])].sort(); }, ['הגדרות', `נוספה שנה ${y} (${k})`]);
      closeModal(); render();
    });
  },
  yeardel: async (el) => {
    const k = el.dataset.k, y = Number(el.dataset.y);
    if (db().settings.years[k].length === 1) return toast('חייבת להישאר לפחות שנה אחת', 'err');
    if (!(await confirmBox('הסרת שנה', `להסיר את ${y} מהגיליון ומהדוח?<br><span class="muted small">הנתונים שהוזנו לשנה זו לא נמחקים — אפשר להחזיר את השנה בכל עת.</span>`, { ok: 'הסרה' }))) return;
    Store.update((d) => { d.settings.years[k] = d.settings.years[k].filter((x) => x !== y); }, ['הגדרות', `הוסרה שנה ${y} (${k})`]);
    render();
  },
});

// ── System: folder, backups, audit ──────────────────────────────
const SysUI = { backups: null, auditQ: '', auditN: 200 };
App.views.system = {
  title: () => 'תיקייה, גיבויים ויומן',
  render() {
    const admin = can('settings_edit') || can('backups_manage');
    const st = Store;
    const folder = `<div class="card" style="margin-bottom:16px"><div class="hd"><h3>${icon('folder', 18)} תיקייה משותפת וסנכרון</h3></div><div class="bd stack">
      <div class="grid g4">
        ${fieldHTML('מצב', `<div>${syncPillHTML()}</div>`)}
        ${fieldHTML('תיקייה', `<div class="b">${esc(st.folderName || '—')}</div>`)}
        ${fieldHTML('גרסת נתונים', `<div class="num">${st.baseRev || '—'}${st.lastRemote && st.lastRemote.savedByName ? ` <span class="muted small">· נשמר ע"י ${esc(st.lastRemote.savedByName)} ${esc(U.fmtDateTime(st.lastRemote.savedAt))}</span>` : ''}</div>`)}
        ${fieldHTML('מחוברים כעת', `<div class="small">${st.online.length ? st.online.map((p) => esc(p.name)).join(', ') : 'רק את/ה'}</div>`)}
      </div>
      ${st.statusText ? `<div class="small" style="color:var(--crit)">${esc(st.statusText)}</div>` : ''}
      <div class="row">${admin ? `<button class="btn" data-act="connect">${icon('folder', 16)} ${st.root ? 'החלפת תיקייה' : 'חיבור לתיקייה משותפת'}</button>` : ''}
        ${st.status === 'needs-permission' ? `<button class="btn pri" data-act="grant">אישור גישה</button>` : ''}
        ${st.connected ? `<button class="btn" data-act="syncnow">${icon('refresh', 16)} סנכרון עכשיו</button>` : ''}
        <button class="btn" data-act="exportjson">${icon('download', 16)} הורדת עותק מלא של הנתונים (JSON)</button></div>
      <div class="muted small">מבנה התיקייה: <span class="ltr">data/nursing-db.json</span> (המאגר) · <span class="ltr">backups/</span> · <span class="ltr">documents/</span> · <span class="ltr">reports/</span>. כל מחשב שומר גם עותק מקומי, כך שאפשר להמשיך לעבוד גם בניתוק זמני מהרשת.</div>
      ${st.conflicts.length ? `<div class="banner warn" style="margin:0">${icon('warn')}<div class="grow small"><b>עריכות מקבילות אחרונות:</b> ${st.conflicts.slice(0, 8).map((c) => esc(c.label)).join(' · ')}</div></div>` : ''}
    </div></div>`;
    const backups = can('backups_manage') ? `<div class="card" style="margin-bottom:16px"><div class="hd"><h3>${icon('history', 18)} גיבויים</h3><span class="muted small">גיבוי אוטומטי יומי (60 ימים אחרונים) + גיבוי לפני כל ייבוא ושחזור</span><div style="flex:1"></div>${st.connected ? `<button class="btn" data-act="backupnow">גיבוי עכשיו</button><button class="btn" data-act="backuplist">רענון רשימה</button>` : ''}</div>
      <div class="bd flush">${!st.connected ? '<div class="empty">יש להתחבר לתיקייה המשותפת</div>' : SysUI.backups == null ? '<div class="empty"><button class="btn" data-act="backuplist">הצגת רשימת הגיבויים</button></div>' : SysUI.backups.length ? `<div class="tbl-wrap" style="max-height:320px"><table class="tbl"><thead><tr><th>קובץ</th><th>תאריך</th><th>גודל</th><th></th></tr></thead><tbody>${SysUI.backups.map((b) => `<tr><td class="ltr small">${esc(b.name)}</td><td class="small">${esc(U.fmtDateTime(new Date(b.modified).toISOString()))}</td><td class="small num">${Math.round(b.size / 1024)} KB</td><td><button class="btn sm" data-act="restore" data-name="${esc(b.name)}">שחזור…</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">אין גיבויים עדיין</div>'}</div></div>` : '';
    let audit = '';
    if (can('users_manage')) {
      const q = SysUI.auditQ;
      const items = U.sortBy(Object.values(db().audit).filter((a) => !q || `${a.userName} ${a.action} ${a.detail}`.includes(q)), (a) => -new Date(a.at).getTime());
      audit = `<div class="card"><div class="hd"><h3>יומן פעולות</h3><span class="muted small">${items.length} רשומות</span><div style="flex:1"></div><div class="search" style="width:240px">${icon('search', 15)}<input class="inp" id="audit-q" placeholder="חיפוש ביומן" value="${esc(q)}" data-input="auditq"></div><button class="btn" data-act="auditcsv">${icon('download', 16)} CSV</button></div>
        <div class="bd flush tbl-wrap" style="max-height:480px"><table class="tbl"><thead><tr><th>מתי</th><th>משתמש</th><th>פעולה</th><th>פירוט</th></tr></thead><tbody>${items.slice(0, SysUI.auditN).map((a) => `<tr><td class="small nowrap">${esc(U.fmtDateTime(a.at))}</td><td class="small">${esc(a.userName)}</td><td class="small">${esc(a.action)}</td><td class="small">${a.ref && db().employees[a.ref] ? `<a href="#" data-act="emp" data-id="${a.ref}">${esc(a.detail)}</a>` : esc(a.detail)}</td></tr>`).join('')}</tbody></table>${items.length > SysUI.auditN ? `<div class="row" style="justify-content:center;padding:10px"><button class="btn sm" data-act="auditmore">הצגת עוד</button></div>` : ''}</div></div>`;
    }
    return folder + backups + audit;
  },
};
Object.assign(ACT, {
  syncnow: async () => { await Store.poll(); await Store.saveNow(); toast('סונכרן', 'ok'); render(); },
  exportjson: () => {
    const doc = { format: DOC_FORMAT, schema: SCHEMA_VERSION, appVersion: APP_VERSION, revision: Store.baseRev, savedAt: U.nowISO(), savedByName: App.user.displayName, data: db() };
    downloadBlob(new Blob([JSON.stringify(doc)], { type: 'application/json' }), `nursing-db_${U.todayISO()}.json`);
    Store.update(() => {}, ['ייצוא נתונים', 'הורדת עותק מלא']);
  },
  backupnow: async () => { try { const n = await Store.backupNow('ידני'); toast(`נשמר גיבוי: ${n}`, 'ok'); SysUI.backups = await Store.listBackups(); render(); } catch (e) { toast(e.message, 'err'); } },
  backuplist: async () => { SysUI.backups = await Store.listBackups(); render(); },
  restore: async (el) => {
    try {
      const data = await Store.readBackup(el.dataset.name);
      const n = Object.keys(data.employees).length, cur = Object.keys(db().employees).length;
      if (!(await confirmBox('שחזור מגיבוי', `לשחזר את המאגר מהגיבוי <span class="ltr">${esc(el.dataset.name)}</span>?<br><br>בגיבוי: <b>${n}</b> עובדים · במאגר כעת: <b>${cur}</b> עובדים.<br>כל השינויים שנעשו אחרי הגיבוי יוחלפו (המצב הנוכחי יישמר כגיבוי לפני השחזור).`, { ok: 'שחזור', danger: true }))) return;
      await Store.restore(data, el.dataset.name);
      toast('המאגר שוחזר', 'ok');
      render();
    } catch (e) { toast(`השחזור נכשל: ${e.message}`, 'err'); }
  },
  auditq: U.debounce((el) => { SysUI.auditQ = el.value.trim(); render(); }, 250),
  auditmore: () => { SysUI.auditN += 300; render(); },
  auditcsv: () => {
    const items = U.sortBy(Object.values(db().audit), (a) => a.at);
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + ['מתי,משתמש,פעולה,פירוט', ...items.map((a) => [U.fmtDateTime(a.at), a.userName, a.action, a.detail].map(q).join(','))].join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `audit_${U.todayISO()}.csv`);
  },
});
