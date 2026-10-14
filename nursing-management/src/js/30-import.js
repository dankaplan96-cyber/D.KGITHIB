'use strict';
// ════════════════════════════════════════════════════════════════
// Import of the nursing-administration workbook (the same format the
// reports are produced in). Reads every known sheet, merges the rows
// of each person across sheets (by ID number, otherwise by name), and
// builds a reviewable plan of changes against the database.
// Import never erases data: empty cells in the file are ignored.
// ════════════════════════════════════════════════════════════════

const XL = {
  isSlave(cell) { return cell.isMerged && cell.master && cell.master.address !== cell.address; },
  raw(cell) {
    if (!cell || XL.isSlave(cell)) return null;
    let v = cell.value;
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if (Array.isArray(v.richText)) v = v.richText.map((t) => t.text).join('');
      else if ('result' in v || 'formula' in v || 'sharedFormula' in v) v = v.result;
      else if ('text' in v) v = v.text;
      else if ('error' in v) v = null;
    }
    if (v && typeof v === 'object' && !(v instanceof Date)) return null;
    return v;
  },
  text(cell) { const v = XL.raw(cell); return v == null ? '' : v instanceof Date ? U.parseDate(v) : String(v).replace(/\s+/g, ' ').trim(); },
  isFormula(cell) { const v = cell && cell.value; return !!(v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v)); },
  // Check marks are stored as Wingdings glyphs in the original files
  mark(cell) {
    const v = XL.raw(cell);
    if (v == null || v === '') return '';
    const s = String(v).trim();
    const font = ((cell.font && cell.font.name) || '').toLowerCase();
    if (font === 'wingdings') { if (s === 'ü' || s === 'þ') return CHECK; if (s === 'û' || s === 'ý' || s === 'x') return '✗'; }
    if (font === 'wingdings 2') { if (s === 'P' || s === 'R') return CHECK; if (s === 'O' || s === 'Q' || s === 'T') return '✗'; }
    if (/^(ü|v|V|√|✓|✔|כן|בוצע)$/.test(s)) return CHECK;
    if (v instanceof Date || typeof v === 'number') return U.parseDate(v) || String(v);
    return U.parseDate(s) || U.clean(s);
  },
  rowTexts(ws, r, maxC) { const out = []; for (let c = 1; c <= maxC; c++) out[c] = XL.text(ws.getCell(r, c)); return out; },
};

// "דנה כהן           ראש צוות" / "מיכל לוי- חל"ד" → parts
function parseNameCell(raw) {
  let s = String(raw ?? '').replace(/ /g, ' ').trim();
  let status = '';
  const stRules = [[/[-–]?\s*חל["״]?ד\.?\s*$/, 'maternity'], [/[-–]\s*מחלה\s*$/, 'sick'], [/[-–]?\s*חל["״]?ת\.?\s*$/, 'unpaid']];
  for (const [re, st] of stRules) if (re.test(s)) { status = st; s = s.replace(re, '').trim(); break; }
  let title = '';
  const parts = s.split(/\s{3,}/);
  if (parts.length > 1) { s = parts[0].trim(); title = parts.slice(1).join(' ').trim(); }
  const tm = s.match(/\s+(ראש צוות|אחראי\/?ת? משמרת|אחראי\/?ת? מחלקה|סגנ(?:ית|ן) אחראי\/?ת?)$/);
  if (!title && tm) { title = tm[1]; s = s.slice(0, tm.index).trim(); }
  return { name: s.replace(/\s+/g, ' ').replace(/[-–]\s*$/, '').trim(), title, status };
}

function roleFromText(t) {
  const s = String(t || '').trim();
  if (!s) return '';
  if (/לסיעוד|סטודנט/.test(s)) return 'student';
  if (/עזר/.test(s)) return 'aux';
  if (s === 'ס' || /מוסמ/.test(s)) return 'rn';
  if (s === 'ע' || /מעש/.test(s)) return 'lpn';
  return '';
}
const genderFromText = (t) => (/^(מוסמך|מעשי)$/.test(String(t || '').trim()) ? 'ז' : /^(מוסמכת|מעשית)$/.test(String(t || '').trim()) ? 'נ' : '');
const dateOrText = (v) => { if (v == null || v === '') return ''; return U.parseDate(v) || U.clean(v); };

function findSheet(wb, test) {
  return wb.worksheets.find((ws) => test(ws.name.replace(/["״׳']/g, '').trim()));
}

function findHeaderRow(ws, pred, maxRow = 60, maxC = 40) {
  const last = Math.min(ws.rowCount, maxRow);
  for (let r = 1; r <= last; r++) {
    const t = XL.rowTexts(ws, r, maxC);
    if (pred(t)) return r;
  }
  return 0;
}
const colOf = (texts, ...needles) => {
  for (let c = 1; c < texts.length; c++) {
    const t = texts[c] || '';
    if (needles.some((n) => (n instanceof RegExp ? n.test(t) : t.includes(n)))) return c;
  }
  return 0;
};

class PeopleCollector {
  constructor() { this.list = []; }
  get({ idNum, name, start = '' }, sheet) {
    const id = U.normId(idNum);
    let p = id ? this.list.find((x) => x.idNum === id) : null;
    let confidence = p ? 1 : 0;
    if (!p && name) {
      let best = null, bestS = 0, second = 0;
      for (const x of this.list) {
        const s = Math.max(...[...x.names].map((n) => U.nameSimilarity(n, name)));
        if (s > bestS) { second = bestS; bestS = s; best = x; } else if (s > second) second = s;
      }
      const idClash = best && id && best.idNum && best.idNum !== id;
      // A matching start date makes a moderately similar spelling acceptable
      const sameStart = best && start && U.parseDate(start) && best.fields.startDate === U.parseDate(start);
      const need = idClash ? 0.9 : sameStart ? 0.7 : 0.8;
      // Same person typed with a different ID in another sheet: only accept a near-identical name
      if (best && bestS >= need && (bestS - second > 0.05 || sameStart)) {
        p = best; confidence = bestS;
        if (idClash) {
          p.idConflicts = p.idConflicts || [];
          p.idConflicts.push({ sheet, idNum: id });
          p.matchNotes.push(`בגיליון "${sheet}" רשום מספר ת.ז. שונה (${id}) — נשמר ${p.idNum}. מומלץ לבדוק`);
        }
      }
    }
    if (!p) {
      p = { key: U.uid('imp'), idNum: id, name: name || '', names: new Set(), fields: {}, sources: [], matchNotes: [] };
      this.list.push(p);
      confidence = 1;
    }
    if (id && !p.idNum) p.idNum = id;
    if (name) p.names.add(name);
    if (!p.sources.includes(sheet)) p.sources.push(sheet);
    if (confidence < 1) p.matchNotes.push(`בגיליון "${sheet}" זוהה לפי שם דומה: "${name}" (${Math.round(confidence * 100)}%)`);
    return p;
  }
}
const setF = (p, path, value) => {
  if (value === '' || value == null) return;
  const parts = path.split('.');
  let o = p.fields;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
  const k = parts[parts.length - 1];
  if (o[k] === undefined || o[k] === '' || o[k] == null) o[k] = value;
};

function parseWorkbook(wb) {
  const res = { customTraining: [], deptTitle: '', people: [], movements: [], staffing: null, deptInfo: {}, sheets: [], warnings: [] };
  const P = new PeopleCollector();
  const applyName = (p, parsed) => {
    if (parsed.title) setF(p, 'title', parsed.title);
    if (parsed.status) setF(p, 'status', parsed.status);
  };

  // ── תקן (master personnel sheet) ──
  const tk = findSheet(wb, (n) => n === 'תקן');
  if (tk) {
    res.sheets.push(tk.name);
    res.deptTitle = XL.text(tk.getCell(1, 1));
    let cols = null, sectionRole = '', pendingTitle = '';
    for (let r = 1; r <= tk.rowCount; r++) {
      const t = XL.rowTexts(tk, r, 20);
      const a = t[1] || '';
      if (a === 'שם העובד/ת' || (a.includes('שם') && colOf(t, 'ת.ז') && r < tk.rowCount)) {
        cols = { name: 1, id: colOf(t, 'ת.ז'), reg: colOf(t, 'רישום'), status: colOf(t, 'מעשי', 'מעמד'), scope: colOf(t, 'חלקיות'), degree: colOf(t, 'B.A', 'M.A'), adv: colOf(t, 'קורס על'), clin: colOf(t, 'הדרכה קלינית'), by: colOf(t, 'שנת לידה'), contract: colOf(t, 'חוזה'), sector: colOf(t, 'מגדר', 'מגזר'), start: colOf(t, 'התחלת'), notes: colOf(t, 'הערות'), width: t.reduce((m, x, i) => (x ? i : m), 0) };
        sectionRole = cols.reg ? '' : /סטודנט/.test(pendingTitle) ? 'student' : /עזר/.test(pendingTitle) ? 'aux' : '';
        continue;
      }
      if (/^סה["״]?כ/.test(a)) { cols = null; continue; }
      if (!cols) { if (a && !t.slice(2).some(Boolean)) pendingTitle = a; continue; }
      if (!a) continue;
      const idNum = U.normId(t[cols.id]);
      if (!idNum && !t[cols.status]) { pendingTitle = a; cols = null; continue; }
      const parsed = parseNameCell(a);
      const p = P.get({ idNum, name: parsed.name }, tk.name);
      p.name = parsed.name; // the staffing sheet is the authoritative spelling
      applyName(p, parsed);
      const role = roleFromText(t[cols.status]) || sectionRole;
      setF(p, 'role', role);
      if (cols.reg) setF(p, 'regNum', U.clean(t[cols.reg]));
      const sc = U.num(XL.raw(tk.getCell(r, cols.scope)));
      if (sc != null) setF(p, 'scope', sc > 1.5 ? sc / 100 : sc);
      if (cols.degree) setF(p, 'degree', /M\.?A/i.test(t[cols.degree]) ? 'M.A' : /B\.?A/i.test(t[cols.degree]) ? 'B.A' : '');
      if (cols.adv) setF(p, 'advCourse', U.clean(t[cols.adv]));
      if (cols.clin) setF(p, 'clinical', U.clean(t[cols.clin]));
      const by = U.num(t[cols.by]);
      if (by && by > 1900 && by < 2100) setF(p, 'birthYear', by);
      const ct = U.clean(t[cols.contract]);
      if (ct) setF(p, 'contract', /^ק/.test(ct) ? 'ק' : /כ["״]?א|כוח אדם|כח אדם/.test(ct) ? 'כ"א' : 'ח');
      const sec = U.clean(t[cols.sector]);
      if (sec) setF(p, 'sector', /^ע/.test(sec) ? 'ע' : 'י');
      setF(p, 'startDate', dateOrText(XL.raw(tk.getCell(r, cols.start))));
      const notes = [U.clean(t[cols.notes])];
      for (let c = cols.width + 1; c <= Math.min(cols.width + 4, 20); c++) if (t[c]) notes.push(t[c]);
      setF(p, 'notes', notes.filter(Boolean).join(' · '));
    }
  }

  // ── בטיחות הטיפול ──
  const sf = findSheet(wb, (n) => n.includes('בטיחות'));
  if (sf) {
    res.sheets.push(sf.name);
    if (!res.deptTitle) res.deptTitle = XL.text(sf.getCell(1, 1));
    let cols = null, years = [], sectionRole = '';
    for (let r = 1; r <= sf.rowCount; r++) {
      const t = XL.rowTexts(sf, r, 40);
      const a = t[1] || '';
      if (a.includes('שם העובד') && colOf(t, 'ת.ז')) {
        cols = { id: colOf(t, 'ת.ז'), status: colOf(t, 'מעשי', 'מעמד'), start: colOf(t, 'התחלת') };
        years = [];
        for (let c = 1; c <= 40; c++) { const y = U.num(t[c]); if (y && y > 2000 && y < 2100) years.push({ year: y, c }); }
        r++; // sub header (מי בודק / תאריך / ציון)
        continue;
      }
      if (!cols || !a) continue;
      if (!t[cols.id] && !t[cols.status] && !t[cols.start]) { if (/עזר/.test(a)) sectionRole = 'aux'; cols = null; continue; }
      const parsed = parseNameCell(a);
      const p = P.get({ idNum: t[cols.id], name: parsed.name }, sf.name);
      applyName(p, parsed);
      const role = roleFromText(t[cols.status]) || sectionRole;
      if (role) setF(p, 'roleHint', role);
      setF(p, 'startDate', dateOrText(XL.raw(sf.getCell(r, cols.start))));
      for (const { year, c } of years) {
        const checker = U.clean(t[c]), date = dateOrText(XL.raw(sf.getCell(r, c + 1))), score = U.clean(t[c + 2]);
        if (checker) setF(p, `safety.${year}.checker`, checker);
        if (date) setF(p, `safety.${year}.date`, date);
        if (score) setF(p, `safety.${year}.score`, score);
      }
    }
  }

  // ── אחראיות משמרת ──
  const sh = findSheet(wb, (n) => n.includes('אחראיות'));
  if (sh) {
    res.sheets.push(sh.name);
    const hr = findHeaderRow(sh, (t) => t.some((x) => x && x.includes('מינוי לתפקיד')));
    if (hr) {
      const t0 = XL.rowTexts(sh, hr, 20);
      const cols = { status: colOf(t0, 'מעמד'), start: colOf(t0, 'תחילת'), id: colOf(t0, 'ת.ז'), course: colOf(t0, 'קורס על'), appoint: colOf(t0, 'מינוי לתפקיד'), evalDate: colOf(t0, 'הערכת ניהול'), renew: colOf(t0, 'חידוש'), valid: colOf(t0, 'תוקף'), performs: colOf(t0, 'ביצוע') };
      for (let r = hr + 1; r <= sh.rowCount; r++) {
        const t = XL.rowTexts(sh, r, 20);
        if (!t[1]) continue;
        const parsed = parseNameCell(t[1]);
        const p = P.get({ idNum: t[cols.id], name: parsed.name }, sh.name);
        applyName(p, parsed);
        const g = genderFromText(t[cols.status]);
        if (g) setF(p, 'gender', g);
        const role = roleFromText(t[cols.status]);
        if (role) setF(p, 'roleHint', role);
        setF(p, 'startDate', dateOrText(XL.raw(sh.getCell(r, cols.start))));
        setF(p, 'shift.active', true);
        const course = U.clean(t[cols.course]);
        if (course) setF(p, 'shift.course', course);
        for (const [k, c] of [['appoint', cols.appoint], ['evalDate', cols.evalDate], ['renew', cols.renew], ['validUntil', cols.valid]]) {
          if (c) setF(p, `shift.${k}`, dateOrText(XL.raw(sh.getCell(r, c))));
        }
        if (cols.performs) setF(p, 'shift.performs', U.clean(t[cols.performs]));
      }
    }
  }

  // ── הערכות עובדים ──
  const ev = findSheet(wb, (n) => n.includes('הערכות'));
  if (ev) {
    res.sheets.push(ev.name);
    const hr = findHeaderRow(ev, (t) => (t[1] || '').startsWith('שם') && t.some((x) => /^20\d\d$/.test(x || '')));
    if (hr) {
      const t0 = XL.rowTexts(ev, hr, 40);
      const cols = { status: colOf(t0, 'מעמד'), emp: colOf(t0, 'כח אדם', 'כוח אדם'), start: colOf(t0, 'תחילת'), id: colOf(t0, 'ת.ז') };
      const years = [];
      for (let c = 1; c <= 40; c++) { const y = U.num(t0[c]); if (y && y > 2000 && y < 2100) years.push({ year: y, c }); }
      for (let r = hr + 1; r <= ev.rowCount; r++) {
        const a1 = ev.getCell(r, 1);
        const t = XL.rowTexts(ev, r, 40);
        if (!t[1]) continue;
        if (a1.isMerged && !t[cols.id] && !t[cols.status]) { const m = t[1].split(/[-–]\s*/); if (m[1]) res.deptInfo.mix = res.deptInfo.mix || m.slice(1).join('-').trim(); continue; }
        const parsed = parseNameCell(t[1]);
        const p = P.get({ idNum: t[cols.id], name: parsed.name }, ev.name);
        applyName(p, parsed);
        const g = genderFromText(t[cols.status]);
        if (g) setF(p, 'gender', g);
        const role = roleFromText(t[cols.status]);
        if (role) setF(p, 'roleHint', role);
        const em = U.clean(t[cols.emp]);
        if (em) setF(p, 'employer', /אדם/.test(em) ? 'כח אדם' : 'בי"ח');
        setF(p, 'startDate', dateOrText(XL.raw(ev.getCell(r, cols.start))));
        for (const { year, c } of years) {
          const v = XL.raw(ev.getCell(r, c));
          const s = typeof v === 'number' ? v : U.clean(v);
          if (s !== '' && s != null) setF(p, `evals.${year}`, s);
        }
      }
    }
  }

  // ── חת"ש ──
  const ch = findSheet(wb, (n) => n === 'חתש' || n.startsWith('חתש'));
  if (ch) {
    res.sheets.push(ch.name);
    const hr = findHeaderRow(ch, (t) => t.some((x) => x && x.includes('קורס החייאה')));
    if (hr) {
      const t0 = XL.rowTexts(ch, hr, 40);
      const cols = { status: colOf(t0, 'מעמד'), start: colOf(t0, 'תחילת'), id: colOf(t0, 'ת.ז'), adv: colOf(t0, 'קורס על') };
      const tcols = [];
      const groupRow = hr > 1 ? XL.rowTexts(ch, hr - 1, 60) : [];
      let curGroup = 'קורסים';
      for (let c = 1; c <= 60; c++) {
        if (groupRow[c]) curGroup = TRAINING_GROUPS.find((g) => groupRow[c].includes(g)) || curGroup;
        const h = (t0[c] || '').replace(/\s+/g, ' ').trim();
        if (!h || c <= Math.max(cols.status, cols.start, cols.id, cols.adv, 1)) continue;
        let def = TRAINING.find((d) => (d.match || [d.label]).some((m) => h.includes(m)) || h.replace(/\s/g, '').includes(d.label.replace(/\s/g, '')));
        // a column that is not one of the standard ones → added as an extra course/permission
        if (!def) { def = { key: customKey(h), label: h, group: curGroup, kind: /תוקף/.test(h) ? 'date' : 'check' }; res.customTraining.push(def); }
        if (!tcols.some((x) => x.def.key === def.key)) tcols.push({ c, def });
      }
      for (let r = hr + 1; r <= ch.rowCount; r++) {
        const t = XL.rowTexts(ch, r, 40);
        if (!t[1]) continue;
        if (!t[cols.id] && !t[cols.status] && !t[cols.start]) continue; // department title row
        const parsed = parseNameCell(t[1]);
        const p = P.get({ idNum: t[cols.id], name: parsed.name }, ch.name);
        applyName(p, parsed);
        const g = genderFromText(t[cols.status]);
        if (g) setF(p, 'gender', g);
        const role = roleFromText(t[cols.status]);
        if (role) setF(p, 'roleHint', role);
        setF(p, 'startDate', dateOrText(XL.raw(ch.getCell(r, cols.start))));
        if (cols.adv) setF(p, 'advCourse', U.clean(t[cols.adv]));
        for (const { c, def } of tcols) {
          const rv = XL.raw(ch.getCell(r, c));
          const v = def.kind === 'date' ? dateOrText(rv) : def.kind === 'text' ? (typeof rv === 'number' ? rv : U.clean(t[c])) : XL.mark(ch.getCell(r, c));
          if (v) setF(p, `trn.${def.key}`, v);
        }
      }
    }
  }

  // ── שיחות עובדים (no ID column → matched by name) ──
  const cv = findSheet(wb, (n) => n.includes('שיחות'));
  if (cv) {
    res.sheets.push(cv.name);
    const hr = findHeaderRow(cv, (t) => t.some((x) => /שיחת משוב/.test(x || '')));
    if (hr) {
      const t0 = XL.rowTexts(cv, hr, 40);
      const cols = { status: colOf(t0, 'מעשי', 'מעמד'), start: colOf(t0, 'התחלת') };
      const years = [];
      for (let c = 1; c <= 40; c++) { const m = (t0[c] || '').match(/(20\d\d)/); if (m && /משוב/.test(t0[c])) years.push({ year: +m[1], c }); }
      for (let r = hr + 1; r <= cv.rowCount; r++) {
        const t = XL.rowTexts(cv, r, 40);
        if (!t[1] || t.some((x) => /מחצית/.test(x || ''))) continue;
        const parsed = parseNameCell(t[1]);
        if (!t[cols.status] && !t[cols.start]) continue;
        const p = P.get({ idNum: '', name: parsed.name, start: XL.raw(cv.getCell(r, cols.start)) }, cv.name);
        applyName(p, parsed);
        const role = roleFromText(t[cols.status]);
        if (role) setF(p, 'roleHint', role);
        setF(p, 'startDate', dateOrText(XL.raw(cv.getCell(r, cols.start))));
        for (const { year, c } of years) {
          const h1 = dateOrText(XL.raw(cv.getCell(r, c))), h2 = dateOrText(XL.raw(cv.getCell(r, c + 1)));
          if (h1) setF(p, `conv.${year}.h1`, h1);
          if (h2) setF(p, `conv.${year}.h2`, h2);
        }
      }
    }
  }

  // ── תקינה (נכנסים / הפסקת עבודה) ──
  const mv = findSheet(wb, (n) => n.startsWith('תקינה'));
  if (mv) {
    res.sheets.push(mv.name);
    let kind = 'in', cols = null;
    for (let r = 1; r <= mv.rowCount; r++) {
      const t = XL.rowTexts(mv, r, 10);
      const a = t[1] || '';
      if (/נכנסים/.test(a) && !t[2]) { kind = 'in'; cols = null; continue; }
      if (/הפסקת עבודה|עוזבים/.test(a) && !t[2]) { kind = 'out'; cols = null; continue; }
      if (a === 'תאריך') { cols = { name: colOf(t, 'שם'), dept: colOf(t, 'מחלקה'), role: colOf(t, 'תפקיד', 'מעמד'), reason: colOf(t, 'הערות', 'סיבה'), c1: colOf(t, 'עמודה1'), c2: colOf(t, 'עמודה2') }; continue; }
      if (!cols || !t[cols.name]) continue;
      res.movements.push({ kind, date: dateOrText(XL.raw(mv.getCell(r, 1))), name: t[cols.name], dept: t[cols.dept] || '', role: t[cols.role] || '', reason: t[cols.reason] || '', col1: cols.c1 ? t[cols.c1] : '', col2: cols.c2 ? t[cols.c2] : '' });
    }
  }

  // ── תקן מקוצר ──
  const ss = findSheet(wb, (n) => n.includes('תקן מקוצר'));
  if (ss) {
    res.sheets.push(ss.name);
    const rows = {};
    const bVals = [];
    for (let r = 1; r <= ss.rowCount; r++) {
      const label = XL.text(ss.getCell(r, 3));
      const key = /מוסמכ/.test(label) ? 'rn' : /מעשי/.test(label) ? 'lpn' : /סטודנט/.test(label) ? 'student' : /עזר/.test(label) ? 'aux' : /סה["״]?כ/.test(label) ? 'total' : '';
      if (!key) continue;
      const b = XL.raw(ss.getCell(r, 2));
      if (b != null && b !== '') bVals.push(b);
      if (key === 'total') continue;
      const lit = (c) => { const cell = ss.getCell(r, c); return XL.isFormula(cell) ? null : U.num(XL.raw(cell)); };
      rows[key] = { moh: lit(4), reqShifts: lit(5), approvedShifts: lit(6) };
    }
    res.staffing = { rows };
    const numIdx = bVals.findIndex((v) => typeof v === 'number' || U.num(v) != null);
    const texts = bVals.map((v) => String(v).trim());
    if (numIdx >= 0) {
      res.deptInfo.beds = U.num(bVals[numIdx]);
      if (numIdx > 1) res.deptInfo.mix = res.deptInfo.mix || texts[1];
      res.deptInfo.headNurse = texts[numIdx + 1] || '';
      res.deptInfo.deputy = texts[numIdx + 2] || '';
    }
    const div = XL.text(ss.getCell(4, 1));
    if (div) { const m = div.match(/^(.*?)\s*מקדם/); if (m) res.deptInfo.division = m[1].trim(); }
  }

  // finalize people
  for (const p of P.list) {
    const f = p.fields;
    if (!f.role) f.role = f.roleHint || 'rn';
    delete f.roleHint;
    if (!p.name) p.name = [...p.names][0] || '';
    if (!p.idNum) res.warnings.push(`לעובד/ת "${p.name}" אין מספר ת.ז. בקובץ`);
  }
  res.people = P.list;
  if (!res.sheets.length) res.warnings.push('לא זוהו בקובץ גיליונות במבנה של קבצי הנהלת הסיעוד');
  res.deptTitle = (res.deptTitle || '').trim();
  return res;
}

// ── Plan: compare parsed file with the database ──────────────────
const FIELD_LABELS = {
  name: 'שם', title: 'תפקיד', idNum: 'ת.ז.', role: 'מעמד מקצועי', status: 'סטטוס', gender: 'מגדר', regNum: 'מס\' רישום', scope: 'חלקיות משרה',
  degree: 'תואר', advCourse: 'קורס על בסיסי', clinical: 'הדרכה קלינית / אחר', birthYear: 'שנת לידה', contract: 'חוזה', sector: 'מגזר', employer: 'עובד בי"ח / כ"א',
  startDate: 'התחלת עבודה', notes: 'הערות', deptId: 'מחלקה',
};
function fieldLabel(path) {
  const p = path.split('.');
  if (p[0] === 'safety') return `בטיחות הטיפול ${p[1]} · ${({ checker: 'מי בודק', date: 'תאריך', score: 'ציון' })[p[2]]}`;
  if (p[0] === 'conv') return `שיחת משוב ${p[1]} · מחצית ${p[2] === 'h1' ? 'א\'' : 'ב\''}`;
  if (p[0] === 'evals') return `הערכת עובד ${p[1]}`;
  if (p[0] === 'trn') return (TRAINING_BY_KEY[p[1]] || {}).label || p[1];
  if (p[0] === 'shift') return `אחראיות משמרת · ${({ active: 'פעיל', course: 'קורס', appoint: 'מינוי', evalDate: 'הערכת ניהול', renew: 'חידוש', validUntil: 'תוקף', performs: 'ביצוע' })[p[1]]}`;
  return FIELD_LABELS[path] || path;
}
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out); else out[path] = v;
  }
  return out;
}
const getPath = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, path, v) {
  const p = path.split('.');
  let x = o;
  for (let i = 0; i < p.length - 1; i++) { if (!x[p[i]] || typeof x[p[i]] !== 'object') x[p[i]] = {}; x = x[p[i]]; }
  x[p[p.length - 1]] = v;
}
const normCmp = (v) => (v == null ? '' : typeof v === 'number' ? String(U.round(v, 4)) : String(v).trim());

function planImport(db, parsed, deptId) {
  // extra course columns already known in the system (matched by name) keep their existing key
  const norm = (x) => String(x).replace(/\s/g, '');
  const keyMap = {};
  for (const t of parsed.customTraining || []) {
    const ex = (db.settings.customTraining || []).find((x) => norm(x.label) === norm(t.label));
    if (ex && ex.key !== t.key) keyMap[t.key] = ex.key;
  }
  if (Object.keys(keyMap).length) {
    for (const p of parsed.people) {
      const trn = p.fields.trn || {};
      for (const [from, to] of Object.entries(keyMap)) if (from in trn) { trn[to] = trn[from]; delete trn[from]; }
    }
    parsed.customTraining = parsed.customTraining.filter((t) => !keyMap[t.key]);
  }
  const items = [];
  const deptEmps = Object.values(db.employees).filter((e) => e.deptId === deptId);
  const usedIds = new Set();
  for (const p of parsed.people) {
    let match = null, how = '';
    if (p.idNum) { match = Object.values(db.employees).find((e) => e.idNum === p.idNum); if (match) how = 'id'; }
    if (!match) {
      let best = null, bestS = 0;
      for (const e of deptEmps) {
        if (usedIds.has(e.id) || (p.idNum && e.idNum && e.idNum !== p.idNum)) continue;
        const s = U.nameSimilarity(e.name, p.name);
        if (s > bestS) { bestS = s; best = e; }
      }
      if (best && bestS >= 0.85) { match = best; how = bestS === 1 ? 'name' : 'fuzzy'; }
    }
    if (match) usedIds.add(match.id);
    const flat = flatten({ ...p.fields, name: p.name, idNum: p.idNum });
    const changes = [];
    for (const [path, val] of Object.entries(flat)) {
      if (val === '' || val == null) continue;
      if (path === 'name' && match) continue; // keep the spelling already in the database
      let cur = match ? getPath(match, path) : undefined;
      if (match && path === 'employer' && !cur && val === employerOf(match)) continue; // derived value, nothing to store
      // the report's notes column combines the status note and the notes
      if (match && path === 'notes' && normCmp(val) === normCmp([match.statusNote, match.notes].filter(Boolean).join(' · '))) continue;
      if (normCmp(cur) !== normCmp(val)) changes.push({ path, label: fieldLabel(path), from: cur ?? '', to: val });
    }
    if (match && match.deptId !== deptId) changes.push({ path: 'deptId', label: 'מחלקה', from: deptName(db, match.deptId), to: deptName(db, deptId), value: deptId });
    const notes = p.matchNotes.slice();
    if (how === 'fuzzy') notes.push(`הותאם לעובד/ת קיים/ת "${match.name}" לפי שם דומה — יש לוודא`);
    items.push({
      key: p.key, person: p, empId: match ? match.id : null, how, action: !match ? 'new' : changes.length ? 'update' : 'same',
      changes, notes, selected: true, uncertain: how === 'fuzzy' || p.matchNotes.length > 0,
    });
  }
  const labels = Object.fromEntries([...trainingDefs(db), ...(parsed.customTraining || [])].map((t) => [`trn.${t.key}`, t.label]));
  items.forEach((it) => it.changes.forEach((c) => { if (labels[c.path]) c.label = labels[c.path]; }));
  const missing = deptEmps.filter((e) => e.status !== 'left' && !usedIds.has(e.id));
  // movements: skip those already in the database
  const known = new Set(Object.values(db.movements).map((m) => `${m.kind}|${m.date}|${U.normName(m.name)}`));
  const movements = parsed.movements.map((m) => ({ ...m, exists: known.has(`${m.kind}|${m.date}|${U.normName(m.name)}`) }));
  return { items, missing, movements, deptId, staffing: parsed.staffing, deptInfo: parsed.deptInfo, customTraining: parsed.customTraining || [] };
}

function applyImport(db, plan, user, { importMovements = true, importStaffing = true, markMissingLeft = [] } = {}) {
  for (const t of plan.customTraining || []) {
    if (!db.settings.customTraining.some((x) => x.key === t.key) && !TRAINING_BY_KEY[t.key]) db.settings.customTraining.push({ key: t.key, label: t.label, group: t.group, kind: t.kind });
  }
  let created = 0, updated = 0;
  const stamp = { updatedAt: U.nowISO(), updatedBy: user ? user.username : '' };
  let order = Math.max(0, ...Object.values(db.employees).filter((e) => e.deptId === plan.deptId).map((e) => e.order || 0)) + 1;
  for (const it of plan.items) {
    if (!it.selected || it.action === 'same') continue;
    let e = it.empId ? db.employees[it.empId] : null;
    if (!e) {
      e = newEmployee({ deptId: plan.deptId, name: it.person.name, idNum: it.person.idNum, order: order++ });
      db.employees[e.id] = e;
      created++;
    } else updated++;
    for (const ch of it.changes) {
      if (ch.path === 'deptId') { e.deptId = ch.value; continue; }
      setPath(e, ch.path, ch.to);
    }
    Object.assign(e, stamp);
    normalizeEmployee(e);
  }
  for (const id of markMissingLeft) {
    const e = db.employees[id];
    if (e) { e.status = 'left'; e.leftDate = e.leftDate || U.todayISO(); Object.assign(e, stamp); }
  }
  let movs = 0;
  if (importMovements) {
    for (const m of plan.movements) {
      if (m.exists) continue;
      const id = U.uid('mov');
      db.movements[id] = { id, kind: m.kind, date: m.date, name: m.name, dept: m.dept, role: m.role, reason: m.reason, col1: m.col1, col2: m.col2 };
      movs++;
    }
  }
  if (importStaffing && plan.staffing) {
    const cur = db.staffing[plan.deptId] || { rows: {} };
    for (const [k, row] of Object.entries(plan.staffing.rows || {})) {
      cur.rows[k] = cur.rows[k] || {};
      for (const [f, v] of Object.entries(row)) if (v != null) cur.rows[k][f] = v;
    }
    db.staffing[plan.deptId] = cur;
  }
  const d = db.depts[plan.deptId];
  if (d && plan.deptInfo) {
    for (const k of ['beds', 'mix', 'headNurse', 'deputy', 'division']) if (plan.deptInfo[k] && !d[k]) d[k] = plan.deptInfo[k];
    if (d.division && !db.settings.divisions.includes(d.division)) db.settings.divisions.push(d.division);
  }
  return { created, updated, movements: movs };
}
