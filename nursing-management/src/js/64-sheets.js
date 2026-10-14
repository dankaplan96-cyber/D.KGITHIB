'use strict';
// ════════════════════════════════════════════════════════════════
// Nursing-administration sheets — Excel-like editing grids.
// Each grid is a different view of the same employee records, laid
// out like the corresponding sheet in the report file.
// Keyboard: Enter/↓ next row, ↑ previous row, Tab next cell,
// in check columns: Space toggles ✓.
// ════════════════════════════════════════════════════════════════

const ENUMS = {
  contract: { opts: ['ח', 'ק', 'כ"א'], norm: (v) => (/^ק/.test(v) ? 'ק' : /^כ/.test(v) ? 'כ"א' : /^ח/.test(v) ? 'ח' : null) },
  sector: { opts: ['י', 'ע'], norm: (v) => (/^י/.test(v) ? 'י' : /^ע/.test(v) ? 'ע' : null) },
  degree: { opts: ['B.A', 'M.A'], norm: (v) => (/m\.?a/i.test(v) ? 'M.A' : /b\.?a/i.test(v) ? 'B.A' : /^-?$/.test(v) ? '' : null) },
};

function sheetDefs() {
  const S = db().settings;
  const A = S.alerts;
  const roName = { h: 'מעמד', type: 'ro', get: (e) => empShort(e), w: 54 };
  const idCol = { h: 'ת.ז.', type: 'ro', get: (e) => e.idNum, w: 96 };
  const start = { h: 'התחלת עבודה', path: 'startDate', type: 'date', w: 92 };
  const nurses = (list) => list.filter((e) => ROLES[e.role].nurse);
  const others = (list) => list.filter((e) => !ROLES[e.role].nurse);
  return {
    safety: {
      label: 'בטיחות הטיפול', hint: 'בדיקת בטיחות הטיפול השנתית לכל עובד/ת',
      sections: (list) => [['אחים/אחיות', nurses(list)], ['כוחות עזר וסטודנטים', others(list)]],
      cols: [idCol, roName, start, ...S.years.safety.slice().sort().flatMap((y) => [
        { g: String(y), h: 'מי בודק', path: `safety.${y}.checker`, type: 'text', w: 90 },
        { g: String(y), h: 'תאריך', path: `safety.${y}.date`, type: 'date', w: 84, cls: (e, v) => (hasValue(v) ? 'ok' : '') },
        { g: String(y), h: 'ציון', path: `safety.${y}.score`, type: 'num', w: 56, cls: (e, v) => (hasValue(v) ? (Number(v) < 80 ? 'warn' : 'ok') : '') },
      ])],
    },
    shift: {
      label: 'אחראיות משמרת', hint: 'אחים/אחיות שמשמשים כאחראי/ת משמרת — מינוי, הערכה, חידוש ותוקף',
      sections: (list) => [['', nurses(list).filter((e) => e.shift && e.shift.active)]],
      addable: (list) => nurses(list).filter((e) => !(e.shift && e.shift.active)),
      cols: [
        { h: 'מעמד מקצועי', type: 'ro', get: (e) => empStatusLabel(e), w: 70 }, start, idCol,
        { g: 'קליטת עובד', h: 'קורס על בסיסי', path: 'shift.course', type: 'text', w: 110, ph: (e) => e.advCourse },
        { g: 'אחריות משמרת', h: 'מינוי לתפקיד', path: 'shift.appoint', type: 'date', w: 90 },
        { g: 'אחריות משמרת', h: 'הערכת ניהול משמרת', path: 'shift.evalDate', type: 'date', w: 90 },
        { g: 'אחריות משמרת', h: 'חידוש מינוי', path: 'shift.renew', type: 'date', w: 90 },
        { g: 'אחריות משמרת', h: 'תוקף המינוי', path: 'shift.validUntil', type: 'date', w: 90, cls: (e, v) => dateStatus(v, A.shiftWarnDays) },
        { g: 'אחריות משמרת', h: 'ביצוע אחריות למשמרות', path: 'shift.performs', type: 'text', w: 150 },
      ],
    },
    conv: {
      label: 'שיחות משוב', hint: 'שיחות משוב חצי-שנתיות — תאריך או טקסט חופשי (למשל חודש)',
      sections: (list) => [['', list]],
      cols: [roName, start, ...S.years.conversations.slice().sort().flatMap((y) => [
        { g: `שיחת משוב ${y}`, h: "מחצית א'", path: `conv.${y}.h1`, type: 'datetext', w: 84, cls: (e, v) => (hasValue(v) ? 'ok' : '') },
        { g: `שיחת משוב ${y}`, h: "מחצית ב'", path: `conv.${y}.h2`, type: 'datetext', w: 84, cls: (e, v) => (hasValue(v) ? 'ok' : '') },
      ])],
    },
    evals: {
      label: 'הערכות עובדים', hint: 'הערכת עובד שנתית — ציון, תאריך או הערה',
      sections: (list) => [['', list]],
      cols: [{ h: 'מעמד מקצועי', type: 'ro', get: (e) => empStatusLabel(e), w: 70 }, { h: 'בי"ח / כ"א', type: 'ro', get: (e) => employerOf(e), w: 64 }, start, idCol,
        ...S.years.evaluations.slice().sort().map((y) => ({ g: 'שנה', h: String(y), path: `evals.${y}`, type: 'datetext', w: 70, cls: (e, v) => (hasValue(v) ? 'ok' : '') }))],
    },
    training: {
      label: 'חת"ש', hint: 'קליטה, קורסים והרשאות. בעמודות סימון: v / רווח = בוצע, או הזנת תאריך',
      sections: (list) => [['', nurses(list)]],
      cols: [{ h: 'מעמד מקצועי', type: 'ro', get: (e) => empStatusLabel(e), w: 70 }, start, idCol,
        { g: 'קליטת עובד', h: 'קורס על בסיסי', path: 'advCourse', type: 'text', w: 100 },
        ...trainingDefs(db()).map((t) => ({
          g: t.group, h: t.label.replace(' - מתן הרשאה', '').replace(' - תוקף מתן הרשאה', ' (תוקף)'), path: `trn.${t.key}`,
          type: t.kind === 'check' ? 'check' : t.kind === 'date' ? 'date' : 'text', w: t.kind === 'text' ? 92 : 78,
          cls: t.expiry ? (e, v) => dateStatus(v, A.bloodWarnDays) : (e, v) => (hasValue(v) ? 'ok' : ''),
        }))],
    },
    takan: {
      label: 'תקן', hint: 'פרטי העסקה ותקן לכל עובד/ת — כפי שמופיעים בגיליון "תקן"',
      sections: (list) => [['אחים/אחיות', nurses(list)], ['סטודנטים', list.filter((e) => e.role === 'student')], ['כוחות עזר', list.filter((e) => e.role === 'aux')]],
      totals: true,
      cols: [idCol, { h: "מס' רישום", path: 'regNum', type: 'text', w: 76 }, roName,
        { h: 'חלקיות משרה', path: 'scope', type: 'pct', w: 66 },
        { h: 'B.A / M.A', path: 'degree', type: 'enum', enum: 'degree', w: 60 },
        { h: 'קורס על בסיסי', path: 'advCourse', type: 'text', w: 100 },
        { h: 'הדרכה קלינית / אחר', path: 'clinical', type: 'text', w: 100 },
        { h: 'שנת לידה', path: 'birthYear', type: 'year', w: 64 },
        { h: 'גיל', type: 'ro', get: (e) => (e.birthYear ? U.thisYear() - e.birthYear : ''), w: 44 },
        { h: 'חוזה', path: 'contract', type: 'enum', enum: 'contract', w: 50 },
        { h: 'מגדר (י/ע)', path: 'sector', type: 'enum', enum: 'sector', w: 56 },
        start, { h: 'הערות', path: 'notes', type: 'text', w: 160 }],
    },
  };
}
const SHEET_YEAR_KEY = { safety: 'safety', conv: 'conversations', evals: 'evaluations' };
const SHEET_ORDER = ['safety', 'shift', 'conv', 'evals', 'training', 'takan'];
const SheetUI = { tab: 'safety', q: '' };

App.views.sheets = {
  wide: true, needsDept: true,
  render(p) {
    if (p && p.tab && SHEET_ORDER.includes(p.tab)) SheetUI.tab = p.tab;
    const deptId = singleDept();
    if (!deptId) return '<div class="card"><div class="empty"><div class="ttl">לא הוגדרו מחלקות</div></div></div>';
    const defs = sheetDefs();
    const def = defs[SheetUI.tab];
    const ed = can('sheets_edit');
    const list = employeesOf(db(), { deptId }).filter((e) => !SheetUI.q || e.name.includes(SheetUI.q));
    const tabs = SHEET_ORDER.map((k) => `<button class="${k === SheetUI.tab ? 'on' : ''}" data-act="sheettab" data-k="${k}">${esc(defs[k].label)}</button>`).join('');
    const addable = def.addable && ed ? def.addable(list) : [];
    return `<div class="row between" style="margin-bottom:10px"><div class="muted small">${esc(def.hint)} · ${esc(deptName(db(), deptId))}</div>
        <div class="row"><div class="search" style="width:200px">${icon('search', 15)}<input class="inp" placeholder="סינון לפי שם" value="${esc(SheetUI.q)}" data-input="sheetq" id="sheet-q"></div>
        ${ed && SHEET_YEAR_KEY[SheetUI.tab] ? `<button class="btn" data-act="yearadd" data-k="${SHEET_YEAR_KEY[SheetUI.tab]}">${icon('plus', 15)} הוספת שנה</button>` : ''}
        ${ed && SheetUI.tab === 'training' ? `<button class="btn" data-act="trnadd">${icon('plus', 15)} הוספת קורס / הרשאה</button>` : ''}
        ${addable.length ? `<select class="inp auto" data-act="shiftadd"><option value="">+ הוספת אחראי/ת משמרת…</option>${addable.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select>` : ''}
        ${can('reports_export') ? `<button class="btn" data-act="quickexport" data-k="${SheetUI.tab}">${icon('download', 16)} ייצוא הגיליון ל-Excel</button>` : ''}</div></div>
      <div class="sheet-tabs">${tabs}</div>
      <div class="xgrid-wrap">${gridHTML(def, list, ed)}</div>
      <div class="row between" style="margin-top:8px"><div class="legend"><span><i style="background:#eaf7ee"></i>בוצע / בתוקף</span><span><i style="background:#fdf2df"></i>יפוג בקרוב / לבדיקה</span><span><i style="background:#fbe4e4"></i>פג תוקף</span></div>
      <div class="faint tiny">${ed ? 'עריכה ישירה בטבלה · השינויים נשמרים אוטומטית ומופיעים מיד אצל כל המשתמשים' : 'צפייה בלבד'}</div></div>`;
  },
  mounted() {
    const t = $('table.xgrid');
    if (!t) return;
    const h = $$('thead tr', t).map((r) => r.getBoundingClientRect().height);
    t.style.setProperty('--h1', `${h[0] || 31}px`);
    t.style.setProperty('--h2', `${(h[0] || 31) + (h[1] || 31)}px`);
  },
};

function gridHTML(def, list, ed) {
  const cols = def.cols;
  const hasGroups = cols.some((c) => c.g);
  // header rows: groups (merged) + column titles
  let h1 = '<th class="nm" rowspan="' + (hasGroups ? 2 : 1) + '">שם העובד/ת</th>', h2 = '';
  if (hasGroups) {
    for (let i = 0; i < cols.length;) {
      const g = cols[i].g;
      let n = 1;
      while (i + n < cols.length && cols[i + n].g === g && g) n++;
      if (g) { h1 += `<th class="grp" colspan="${n}">${esc(g)}</th>`; for (let k = 0; k < n; k++) h2 += `<th style="min-width:${cols[i + k].w}px">${esc(cols[i + k].h)}</th>`; }
      else h1 += `<th rowspan="2" style="min-width:${cols[i].w}px">${esc(cols[i].h)}</th>`;
      i += n;
    }
  } else h1 += cols.map((c) => `<th style="min-width:${c.w}px">${esc(c.h)}</th>`).join('');
  let body = '', r = 0;
  const sections = def.sections(list);
  for (const [title, rows] of sections) {
    if (title && sections.length > 1) body += `<tr class="sec"><td colspan="${cols.length + 1}">${esc(title)} · ${rows.length}</td></tr>`;
    for (const e of rows) {
      body += `<tr><td class="nm" data-act="emp" data-id="${e.id}" title="פתיחת כרטיס עובד">${esc(reportName(e))}</td>${cols.map((c, ci) => cellHTML(e, c, r, ci, ed)).join('')}</tr>`;
      r++;
    }
    if (def.totals && rows.length) body += totalsRowHTML(rows, cols);
    if (!rows.length) body += `<tr><td class="nm faint">—</td><td colspan="${cols.length}" class="faint" style="padding:0 10px">אין עובדים בקטגוריה זו</td></tr>`;
  }
  return `<table class="xgrid"><thead><tr>${h1}</tr>${hasGroups ? `<tr>${h2}</tr>` : ''}</thead><tbody>${body}</tbody></table>`;
}

function cellValue(e, c) { return c.type === 'ro' ? c.get(e) : getPath2(e, c.path); }
function cellDisplay(v, c) {
  if (v == null || v === '') return '';
  if (c.type === 'pct') return `${Math.round(Number(v) * 100)}%`;
  if (c.type === 'check') return v === CHECK ? '✓' : U.fmtDate(v);
  return displayCellValue(v, c.type);
}
function cellHTML(e, c, r, ci, ed) {
  const v = cellValue(e, c);
  if (c.type === 'ro') return `<td class="ro">${esc(v ?? '')}</td>`;
  const cls = [c.cls ? c.cls(e, v) : '', c.type === 'check' && v === CHECK ? 'is-chk' : '', c.type === 'text' ? 'txt' : ''].filter(Boolean).join(' ');
  const ph = c.ph ? c.ph(e) || '' : '';
  return `<td class="${cls}"><input class="cell" id="c-${r}-${ci}" data-r="${r}" data-c="${ci}" data-emp="${e.id}" data-ci="${ci}" data-key="cellkey" data-act="cellchange" value="${esc(cellDisplay(v, c))}" placeholder="${esc(ph)}" ${ed ? '' : 'disabled'} title="${esc(c.g ? c.g + ' · ' : '')}${esc(c.h)}"></td>`;
}
function totalsRowHTML(rows, cols) {
  const fte = U.round(rows.reduce((a, e) => a + (Number(e.scope) || 0), 0), 2);
  const cnt = (f) => rows.filter(f).length;
  const parts = [`${rows.length} עובדים`, `${fte} תקנים`];
  if (rows.some((e) => ROLES[e.role].nurse)) parts.push(`מוסמכים ${cnt((e) => e.role === 'rn')}`, `מעשיים ${cnt((e) => e.role === 'lpn')}`, `M.A ${cnt((e) => e.degree === 'M.A')}`, `B.A ${cnt((e) => e.degree === 'B.A')}`);
  parts.push(`קיבוצי ${cnt((e) => e.contract === 'ק')}`, `חוזה ${cnt((e) => e.contract === 'ח')}`, `כ"א ${cnt((e) => e.contract === 'כ"א')}`, `יהודים ${cnt((e) => e.sector === 'י')}`, `לא יהודים ${cnt((e) => e.sector === 'ע')}`);
  return `<tr><td class="nm" style="background:#f6f8fb;color:var(--muted)">סה"כ</td><td colspan="${cols.length}" style="background:#f6f8fb;padding:0 10px;font-size:12.5px;color:var(--muted)">${parts.join(' · ')}</td></tr>`;
}

Object.assign(ACT, {
  sheettab: (el) => { SheetUI.tab = el.dataset.k; go('sheets', { tab: el.dataset.k }); },
  sheetq: U.debounce((el) => { SheetUI.q = el.value.trim(); render(); }, 250),
  shiftadd: (el) => { if (el.value) { setEmpField(el.value, 'shift.active', true); render(); } },
  cellchange: (el) => {
    const def = sheetDefs()[SheetUI.tab];
    const c = def.cols[+el.dataset.ci];
    const e = db().employees[el.dataset.emp];
    if (!e || c.type === 'ro') return;
    const raw = el.value.trim();
    let v;
    if (c.type === 'pct') {
      const n = U.num(raw.replace('%', ''));
      if (n == null) { toast('חלקיות משרה: יש להזין מספר (למשל 75 או 0.75)', 'err'); el.value = cellDisplay(e.scope, c); return; }
      v = n > 1.5 ? n / 100 : n;
    } else if (c.type === 'year') {
      const n = U.num(raw);
      if (raw && !(n > 1900 && n < 2100)) { toast('שנת לידה לא תקינה', 'err'); el.value = e.birthYear || ''; return; }
      v = n || null;
    } else if (c.type === 'enum') {
      const nv = raw ? ENUMS[c.enum].norm(raw) : '';
      if (nv === null) { toast(`ערך לא תקין. אפשרויות: ${ENUMS[c.enum].opts.join(' / ')}`, 'err'); el.value = getPath2(e, c.path) || ''; return; }
      v = nv;
    } else v = parseCellValue(raw, c.type);
    setEmpField(e.id, c.path, v);
    el.value = cellDisplay(v, c);
    const td = el.parentElement;
    td.className = [c.cls ? c.cls(db().employees[e.id], v) : '', c.type === 'check' && v === CHECK ? 'is-chk' : '', c.type === 'text' ? 'txt' : ''].filter(Boolean).join(' ');
  },
  cellkey: (el, ev) => {
    const r = +el.dataset.r, ci = +el.dataset.c;
    const def = sheetDefs()[SheetUI.tab];
    const c = def.cols[ci];
    const move = (dr) => { const n = document.getElementById(`c-${r + dr}-${ci}`); if (n) { ev.preventDefault(); n.focus(); n.select(); } };
    if (ev.key === 'Enter' || ev.key === 'ArrowDown') { if (ev.key === 'Enter') el.blur(); move(1); }
    else if (ev.key === 'ArrowUp') move(-1);
    else if (ev.key === ' ' && c.type === 'check' && !el.disabled) {
      ev.preventDefault();
      el.value = el.value === '✓' ? '' : '✓';
      ACT.cellchange(el);
    } else if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && (el.selectionStart === el.selectionEnd) && (el.value === '' || ev.ctrlKey)) {
      // RTL: ArrowLeft moves to the next column
      const dc = ev.key === 'ArrowLeft' ? 1 : -1;
      for (let k = ci + dc; k >= 0 && k < def.cols.length; k += dc) { const n = document.getElementById(`c-${r}-${k}`); if (n) { ev.preventDefault(); n.focus(); n.select(); break; } }
    } else if (ev.key === 'Escape') { const e = db().employees[el.dataset.emp]; el.value = cellDisplay(cellValue(e, c), c); el.blur(); }
  },
  quickexport: (el) => exportReports({ deptIds: [singleDept()], sheets: [el.dataset.k] }),
});
document.addEventListener('focusin', (e) => { if (e.target.matches && e.target.matches('input.cell')) e.target.select(); });
