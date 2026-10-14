'use strict';
// ════════════════════════════════════════════════════════════════
// Report export — fills the nursing-administration template workbook.
// The template is the original file with the personal data removed;
// every header, font, fill, border, merge, column width and formula
// pattern is taken from it, so the produced file looks exactly like
// the file the nursing administration already works with.
// ════════════════════════════════════════════════════════════════

const REPORT_SHEETS = [
  { key: 'safety', name: 'בטיחות הטיפול' },
  { key: 'shift', name: 'אחראיות משמרת' },
  { key: 'conv', name: 'שיחות עובדים' },
  { key: 'evals', name: 'הערכות עובדים' },
  { key: 'training', name: 'חת"ש' },
  { key: 'takan', name: 'תקן' },
  { key: 'movements', name: 'תקינה ' },
  { key: 'short', name: 'תקן מקוצר' },
];

const colLetter = (c) => { let s = ''; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
const addr = (r, c) => `${colLetter(c)}${r}`;
const isDateFmt = (f) => !!f && !/^(General|@|0|0\.0+|0%|0\.0+%)$/i.test(f) && /[dmy]/i.test(f.replace(/\[[^\]]*\]/g, ''));

const parseAddr = (a) => {
  const m = a.match(/^([A-Z]+)(\d+)$/);
  let c = 0;
  for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
  return [Number(m[2]), c];
};

// One sheet of the template: the original formatting of every cell is
// available through st(row, col) / tv(row, col) while the new sheet is
// written from row 1.
class TemplateSheet {
  constructor(wb, spec, styles) {
    this.spec = spec;
    this.maxCol = spec.maxCol;
    const ws = wb.addWorksheet(spec.name, {
      views: [{ rightToLeft: spec.rtl, showGridLines: true }],
      properties: { defaultRowHeight: spec.defaultRowHeight || 14.25 },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: spec.margins },
    });
    this.ws = ws;
    for (const [k, w] of Object.entries(spec.cols || {})) ws.getColumn(k).width = w;
    this.heights = {};
    for (const [r, h] of Object.entries(spec.rows || {})) this.heights[r] = h;
    this.snap = {};
    for (const [a, cell] of Object.entries(spec.cells)) {
      const [r, c] = parseAddr(a);
      (this.snap[r] = this.snap[r] || {})[c] = { style: styles[cell.s], value: cell.v === undefined ? null : cell.v };
    }
  }
  st(r, c) { const s = this.snap[r] && this.snap[r][c]; return s ? JSON.parse(JSON.stringify(s.style)) : {}; }
  tv(r, c) { const s = this.snap[r] && this.snap[r][c]; return s ? s.value : null; }
  put(r, c, value, style) {
    const cell = this.ws.getCell(r, c);
    cell.style = style || {};
    cell.value = this.coerce(value, cell.style);
    return cell;
  }
  coerce(v, style) {
    if (v == null || v === '') return null;
    if (typeof v === 'object' && !(v instanceof Date)) return v; // formula / rich text
    if (typeof v === 'string' && U.ISO_RE.test(v)) return isDateFmt(style.numFmt) ? U.isoToDate(v) : U.fmtDate(v);
    return v;
  }
  copyRow(src, dst, { from = 1, to = this.maxCol, values = true, colMap = null } = {}) {
    for (let c = from; c <= to; c++) {
      const sc = colMap ? colMap(c) : c;
      this.put(dst, c, values ? this.tv(src, sc) : null, this.st(src, sc));
    }
    this.height(dst, this.heights[src]);
  }
  height(r, h) { if (h) this.ws.getRow(r).height = h; }
  merge(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return;
    // keep each cell's own borders (the original files rely on them)
    if (this.ws.mergeCellsWithoutStyle) this.ws.mergeCellsWithoutStyle(r1, c1, r2, c2); else this.ws.mergeCells(r1, c1, r2, c2);
  }
}

const F = (formula, result) => ({ formula, result: result === undefined || result === null || Number.isNaN(result) ? undefined : result });
const countIf = (vals, x) => vals.filter((v) => v === x).length;
const sumOf = (vals) => U.round(vals.reduce((a, v) => a + (Number(v) || 0), 0), 4);
const nameLen = (s) => String(s || '').length;

// template: the parsed assets/report-template.json
function buildReportWorkbook(ExcelJS, template, db, deptId, opts = {}) {
  const wb = new ExcelJS.Workbook();
  const want = opts.sheets || REPORT_SHEETS.map((s) => s.key);
  const dept = db.depts[deptId] || { id: deptId, name: '', mix: '' };
  const year = opts.year || U.thisYear();
  const all = employeesOf(db, { deptId });
  const nurses = all.filter((e) => ROLES[e.role].nurse);
  const others = all.filter((e) => !ROLES[e.role].nurse);
  const ctx = { db, dept, year, all, nurses, others, opts };
  for (const def of REPORT_SHEETS) {
    if (!want.includes(def.key)) continue;
    const spec = template.sheets.find((s) => s.name === def.name);
    if (!spec) continue;
    BUILDERS[def.key](new TemplateSheet(wb, spec, template.styles), ctx);
  }
  wb.creator = opts.author || 'מערכת ניהול סיעוד';
  wb.lastModifiedBy = opts.author || '';
  wb.created = new Date(); wb.modified = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };
  return wb;
}

const BUILDERS = {
  // ── בטיחות הטיפול ────────────────────────────────────────────
  safety(T, { db, dept, nurses, others }) {
    const years = db.settings.years.safety.slice().sort();
    const last = 4 + 3 * years.length;
    const ws = T.ws;
    const src = (c) => (c <= 4 ? c : (c - 5) % 3 + (c < 8 ? 5 : 8));
    for (let i = 0; i < years.length; i++) if (!ws.getColumn(5 + 3 * i).width) ws.getColumn(5 + 3 * i).width = ws.getColumn(src(5 + 3 * i)).width;
    let r = 1;
    const section = (titleRow, h1, h2, title, list, statusOf) => {
      if (title !== null) {
        for (let c = 1; c <= last; c++) T.put(r, c, c === 1 ? title : null, T.st(titleRow, Math.min(src(c), 10)));
        T.merge(r, 1, r, last); T.height(r, T.heights[titleRow]); r++;
      }
      for (let c = 1; c <= last; c++) T.put(r, c, c <= 4 ? T.tv(h1, c) : null, T.st(h1, src(c)));
      years.forEach((y, i) => { T.ws.getCell(r, 5 + 3 * i).value = y; T.merge(r, 5 + 3 * i, r, 7 + 3 * i); });
      T.height(r, T.heights[h1]); r++;
      for (let c = 1; c <= last; c++) T.put(r, c, T.tv(h2, src(c)), T.st(h2, src(c)));
      T.height(r, T.heights[h2]); r++;
      for (const e of list) {
        const name = reportName(e, true);
        const vals = [name, e.idNum, statusOf(e), e.startDate];
        years.forEach((y) => { const s = (e.safety || {})[y] || {}; vals.push(s.checker || '', s.date || '', U.num(s.score) ?? (s.score || '')); });
        vals.forEach((v, i) => T.put(r, i + 1, v, T.st(7, src(i + 1))));
        if (e.status !== 'active') T.ws.getCell(r, 1).font = { ...T.ws.getCell(r, 1).font, bold: true };
        T.height(r, nameLen(name) > 13 ? 37.5 : 18.75);
        r++;
      }
    };
    section(1, 2, 3, dept.name, nurses, empShort);
    section(24, 25, 26, `כוחות עזר - ${dept.name}`, others, () => 'כח עזר');
  },

  // ── אחראיות משמרת ───────────────────────────────────────────
  shift(T, { dept, nurses }) {
    for (const r of [1, 2, 3]) T.copyRow(r, r);
    T.ws.getCell(1, 1).value = dept.name;
    T.merge(1, 1, 1, 10); T.merge(2, 2, 2, 5); T.merge(2, 6, 2, 10);
    let r = 4;
    for (const e of nurses.filter((x) => x.shift && x.shift.active)) {
      const s = e.shift;
      const vals = [reportName(e), empStatusLabel(e), e.startDate, e.idNum, s.course || e.advCourse, s.appoint, s.evalDate, s.renew, s.validUntil, s.performs];
      vals.forEach((v, i) => T.put(r, i + 1, v, T.st(10, i + 1)));
      const d = U.daysUntil(s.validUntil);
      if (d != null && d < 60) T.ws.getCell(r, 9).font = { ...T.st(4, 9).font };
      T.height(r, nameLen(vals[0]) > 11 ? 32.25 : 16.5);
      r++;
    }
  },

  // ── שיחות עובדים ────────────────────────────────────────────
  conv(T, { db, dept, all }) {
    const years = db.settings.years.conversations.slice().sort();
    const last = 3 + 2 * years.length;
    const ws = T.ws;
    const src = (c) => (c <= 3 ? c : 4 + ((c - 4) % 2));
    for (let i = 0; i < years.length; i++) for (const k of [0, 1]) { const col = ws.getColumn(4 + 2 * i + k); if (!col.width) col.width = ws.getColumn(src(4 + k)).width || 10.5; }
    for (let c = 1; c <= last; c++) T.put(1, c, c <= 3 ? T.tv(1, c) : null, T.st(1, src(c)));
    years.forEach((y, i) => { T.ws.getCell(1, 4 + 2 * i).value = `שיחת משוב ${y}`; T.merge(1, 4 + 2 * i, 1, 5 + 2 * i); });
    T.height(1, T.heights[1]);
    for (let c = 1; c <= last; c++) T.put(2, c, c === 1 ? dept.name : c <= 3 ? null : T.tv(2, src(c)), T.st(2, src(c)));
    T.merge(2, 1, 2, 3); T.height(2, T.heights[2]);
    let r = 3;
    for (const e of all) {
      const name = reportName(e);
      const vals = [name, ROLES[e.role].nurse ? empShort(e) : 'כח עזר', e.startDate];
      years.forEach((y) => { const c = (e.conv || {})[y] || {}; vals.push(c.h1 || '', c.h2 || ''); });
      vals.forEach((v, i) => T.put(r, i + 1, v, T.st(i === 0 ? 7 : 8, src(i + 1))));
      T.height(r, nameLen(name) > 12 ? 37.5 : 18.75);
      r++;
    }
  },

  // ── הערכות עובדים ───────────────────────────────────────────
  evals(T, { db, dept, all }) {
    const years = db.settings.years.evaluations.slice().sort();
    const last = 5 + years.length;
    const ws = T.ws;
    const src = (c) => (c <= 5 ? c : 6);
    for (let i = 0; i < years.length; i++) { const col = ws.getColumn(6 + i); if (!col.width) col.width = 9; }
    for (let c = 1; c <= last; c++) T.put(1, c, c <= 5 ? T.tv(1, c) : years[c - 6], T.st(1, src(c)));
    T.height(1, T.heights[1]);
    for (let c = 1; c <= last; c++) T.put(2, c, c === 1 ? (dept.mix ? `${dept.name}- ${dept.mix}` : dept.name) : null, T.st(2, Math.min(c, 11)));
    T.merge(2, 1, 2, last); T.height(2, T.heights[2]);
    let r = 3;
    for (const e of all) {
      const name = reportName(e);
      const vals = [name, empStatusLabel(e), employerOf(e), e.startDate, e.idNum, ...years.map((y) => (e.evals || {})[y] ?? '')];
      vals.forEach((v, i) => T.put(r, i + 1, v, T.st(3, src(i + 1))));
      T.height(r, nameLen(name) > 11 ? 32.25 : 16.5);
      r++;
    }
  },

  // ── חת"ש ────────────────────────────────────────────────────
  training(T, { db, dept, nurses }) {
    const defs = trainingDefs(db);
    for (const r of [1, 2, 3]) T.copyRow(r, r);
    // extra courses/permissions added in the system → extra columns after AE
    const extra = defs.slice(TRAINING.length);
    extra.forEach((t, i) => {
      const c = 32 + i;
      T.ws.getColumn(c).width = 13;
      T.put(1, c, i === 0 ? 'נוספים' : null, T.st(1, i === 0 ? 24 : 25));
      T.put(2, c, t.label, T.st(2, 26));
      T.put(3, c, null, T.st(3, 30));
    });
    if (extra.length > 1) T.merge(1, 32, 1, 31 + extra.length);
    T.ws.getCell(3, 1).value = ` ${dept.name}`;
    T.merge(1, 2, 1, 14); T.merge(1, 15, 1, 23); T.merge(1, 24, 1, 31); T.merge(3, 1, 3, 6);
    const textStyle = T.st(5, 5), checkStyle = T.st(5, 7);
    let r = 4;
    for (const e of nurses) {
      const name = reportName(e);
      [name, empStatusLabel(e), e.startDate, e.idNum, e.advCourse].forEach((v, i) => T.put(r, i + 1, v, T.st(5, i + 1)));
      defs.forEach((t, i) => {
        const c = 6 + i;
        const v = (e.trn || {})[t.key];
        if (t.key === 'cpr') T.put(r, c, v, T.st(5, 6));
        else if (t.key === 'pBlood') T.put(r, c, v, T.st(5, 31));
        else if (v === CHECK) T.put(r, c, 'ü', checkStyle);
        else if (v === '✗') T.put(r, c, 'û', checkStyle);
        else T.put(r, c, v, textStyle);
      });
      T.height(r, nameLen(name) > 12 ? 48 : 32.25);
      r++;
    }
  },

  // ── תקן ────────────────────────────────────────────────────
  takan(T, { db, dept, year, nurses, others }) {
    T.copyRow(1, 1); T.ws.getCell(1, 1).value = dept.name;
    T.copyRow(2, 2);
    let r = 3;
    const ageF = (col, rr, by) => F(`${year}-${col}${rr}`, by ? year - by : undefined);
    // nurses
    const rn = nurses.filter((e) => e.role === 'rn'), lpn = nurses.filter((e) => e.role === 'lpn');
    const nurseRows = [...rn, ...lpn];
    const nStart = r;
    const nVals = [];
    for (const e of nurseRows) {
      const name = reportName(e, true);
      const row = [name, e.idNum, e.regNum ? (U.num(e.regNum) ?? e.regNum) : '', empShort(e), Number(e.scope) || 0, e.degree, e.advCourse, e.clinical, e.birthYear || '', ageF('I', r, e.birthYear), e.contract, e.sector, e.startDate, [e.statusNote, e.notes].filter(Boolean).join(' · ')];
      row.forEach((v, i) => T.put(r, i + 1, v, T.st(6, i + 1)));
      T.height(r, nameLen(name) > 16 ? 41.25 : 24.95);
      nVals.push(row); r++;
    }
    if (!nurseRows.length) { for (let c = 1; c <= 14; c++) T.put(r, c, null, T.st(6, c)); T.height(r, 24.95); r++; }
    const nEnd = r - 1;
    const rnEnd = nStart + rn.length - 1, lpnStart = nStart + rn.length;
    const col = (i) => nVals.map((v) => v[i]);
    const rng = (c, a, b) => (b >= a ? `${c}${a}:${c}${b}` : `${c}${a}:${c}${a}`);
    // totals block (template rows 19–25)
    const t0 = r;
    for (let k = 0; k < 7; k++) T.copyRow(19 + k, t0 + k);
    const vD = col(3), vE = col(4), vF = col(5), vG = col(6), vH = col(7), vK = col(10), vL = col(11);
    const put = (rr, c, f) => { T.ws.getCell(rr, c).value = f; };
    put(t0 + 1, 4, F(`COUNTIF(${rng('D', nStart, nEnd)},"ס")`, countIf(vD, 'ס')));
    put(t0 + 1, 5, F(`SUM(${rng('E', nStart, rnEnd)})`, sumOf(vE.slice(0, rn.length))));
    put(t0 + 1, 6, F(`COUNTIF(${rng('F', nStart, nEnd)},"M.A")`, countIf(vF, 'M.A')));
    put(t0 + 1, 7, F(`COUNTIF(G${nStart}:H${nEnd},"גריאטריה")`, countIf([...vG, ...vH], 'גריאטריה')));
    put(t0 + 1, 8, F(`COUNTIF(${rng('H', nStart, nEnd)},"הדרכה קלינית")`, countIf(vH, 'הדרכה קלינית')));
    put(t0 + 1, 11, F(`COUNTIF(${rng('K', nStart, nEnd)},"ק")`, countIf(vK, 'ק')));
    put(t0 + 1, 12, F(`COUNTIF(${rng('L', nStart, nEnd)},"י")`, countIf(vL, 'י')));
    put(t0 + 3, 4, F(`COUNTIF(${rng('D', nStart, nEnd)},"ע")`, countIf(vD, 'ע')));
    put(t0 + 3, 5, F(`SUM(${rng('E', lpnStart, nEnd)})`, sumOf(vE.slice(rn.length))));
    put(t0 + 3, 6, F(`COUNTIF(${rng('F', nStart, nEnd)},"B.A")`, countIf(vF, 'B.A')));
    put(t0 + 3, 7, F(`COUNTIF(${rng('G', nStart, nEnd)},"שיקום")`, countIf(vG, 'שיקום')));
    put(t0 + 3, 8, F(`COUNTIF(${rng('G', nStart, nEnd)},"רפואה דחופה")`, countIf(vG, 'רפואה דחופה')));
    put(t0 + 3, 11, F(`COUNTIF(${rng('K', nStart, nEnd)},"ח")`, countIf(vK, 'ח')));
    put(t0 + 3, 12, F(`COUNTIF(${rng('L', nStart, nEnd)},"ע")`, countIf(vL, 'ע')));
    put(t0 + 5, 7, F(`COUNTIF(${rng('G', nStart, nEnd)},"גסטרו")`, countIf(vG, 'גסטרו')));
    put(t0 + 5, 11, F(`COUNTIF(${rng('K', nStart, nEnd)},"כ""א")`, countIf(vK, 'כ"א')));
    put(t0 + 6, 4, F(`D${t0 + 3}+D${t0 + 1}`, countIf(vD, 'ס') + countIf(vD, 'ע')));
    put(t0 + 6, 5, F(`E${t0 + 3}+E${t0 + 1}`, sumOf(vE)));
    T.merge(t0, 1, t0 + 5, 3); T.merge(t0 + 6, 1, t0 + 6, 3);
    r = t0 + 7;
    // students / auxiliary blocks
    const block = (title, list, statusText, totalLabel, tTitle, tHeader, tTotals, isAux) => {
      for (let c = 1; c <= 14; c++) T.put(r, c, c === 1 ? title : null, T.st(tTitle, c));
      T.merge(r, 1, r, 2); T.height(r, T.heights[tTitle]); r++;
      T.copyRow(tHeader, r); r++;
      const s = r, vals = [];
      for (const e of list) {
        const row = [reportName(e), e.idNum, statusText, Number(e.scope) || 0, e.birthYear || '', ageF('E', r, e.birthYear), e.contract, e.sector, e.startDate, [e.statusNote, e.notes].filter(Boolean).join(' · ')];
        row.forEach((v, i) => T.put(r, i + 1, v, T.st(40, i + 1)));
        T.height(r, 24.95);
        vals.push(row); r++;
      }
      if (!list.length) { for (let c = 1; c <= 10; c++) T.put(r, c, null, T.st(40, c)); T.height(r, 24.95); r++; }
      const en = r - 1, t = r;
      for (let k = 0; k < 4; k++) T.copyRow(tTotals + k, t + k);
      const cv = (i) => vals.map((v) => v[i]);
      T.ws.getCell(t, 1).value = totalLabel;
      put(t, 3, F(`COUNTIF(${rng('C', s, en)},"${statusText}")`, list.length));
      put(t, 4, F(`SUM(${rng('D', s, en)})`, sumOf(cv(3))));
      put(t + 1, 7, F(`COUNTIF(${rng('G', s, en)},"ק")`, countIf(cv(6), 'ק')));
      put(t + 1, 8, F(`COUNTIF(${rng('H', s, en)},"י")`, countIf(cv(7), 'י')));
      put(t + 3, 7, F(`COUNTIF(${rng('G', s, en)},"ח")`, countIf(cv(6), 'ח')));
      put(t + 3, 8, F(`COUNTIF(${rng('H', s, en)},"ע")`, countIf(cv(7), 'ע')));
      if (isAux) put(t + 1, 6, F(`COUNTIF(${rng('G', s, en)},"כ""א")`, countIf(cv(6), 'כ"א')));
      T.merge(t, 1, t + 3, 2);
      r = t + 4;
    };
    block(`${dept.name} - סטודנטים`, others.filter((e) => e.role === 'student'), 'ס. לסיעוד', 'סה"כ סטודנטים', 26, 27, 32, false);
    block(`${dept.name} - כוחות עזר`, others.filter((e) => e.role === 'aux'), 'כח עזר', 'סה"כ כוחות עזר', 36, 37, 45, true);
  },

  // ── תקינה (נכנסים / הפסקת עבודה) ────────────────────────────
  movements(T, { db, opts }) {
    const from = opts.movFrom || '', to = opts.movTo || '';
    const inRange = (m) => { const d = U.parseDate(m.date) || ''; return (!from || (d && d >= from)) && (!to || (d && d <= to)); };
    const list = U.sortBy(Object.values(db.movements).filter(inRange), (m) => U.parseDate(m.date) || '', (m) => m.name);
    let r = 1;
    const block = (title, rowsList, isOut) => {
      for (let c = 1; c <= 7; c++) T.put(r, c, c === 1 ? title : null, T.st(isOut ? 9 : 1, c));
      T.merge(r, 1, r, isOut ? 6 : 5); T.height(r, T.heights[isOut ? 9 : 1]); r++;
      r++; // spacer row, as in the original
      T.copyRow(isOut ? 11 : 3, r); r++;
      for (const m of rowsList) {
        [U.parseDate(m.date) || m.date, m.name, m.dept, m.role, m.reason, m.col1, m.col2].forEach((v, i) => T.put(r, i + 1, v, T.st(5, i + 1)));
        r++;
      }
      if (!rowsList.length) { for (let c = 1; c <= 7; c++) T.put(r, c, null, T.st(5, c)); r++; }
    };
    block('נכנסים', list.filter((m) => m.kind === 'in'), false);
    r += 2;
    block('הפסקת עבודה', list.filter((m) => m.kind === 'out'), true);
  },

  // ── תקן מקוצר ───────────────────────────────────────────────
  short(T, { db, dept }) {
    const f = db.settings.staffing;
    const S = staffingComputed(db, dept.id);
    T.copyRow(3, 3);
    for (let c = 1; c <= 10; c++) T.put(4, c, c === 1 ? `${dept.division || db.settings.divisions[0] || ''} מקדם תקינה לפי אחות ${f.nurseFactor} כ"ע ${f.auxFactor}` : null, T.st(4, c));
    T.height(4, T.heights[4]);
    const layout = [
      { r: 5, key: 'rn', tpl: 5, b: dept.name },
      { r: 6, key: 'lpn', tpl: 6, b: dept.mix || '' },
      { r: 7, key: 'student', tpl: 6, b: '' },
      { r: 8, key: 'nurses', tpl: 7, b: dept.beds ?? '' },
      { r: 9, key: 'aux', tpl: 8, b: dept.headNurse || '' },
      { r: 10, key: 'total', tpl: 9, b: dept.deputy || '' },
    ];
    const label = { rn: 'א. מוסמכות', lpn: 'א. מעשיות', student: 'סטודנטים', nurses: 'סה"כ אחיות', aux: 'כוחות עזר', total: 'סה"כ' };
    for (const L of layout) {
      for (let c = 1; c <= 10; c++) T.put(L.r, c, null, T.st(L.tpl, c));
      T.height(L.r, T.heights[L.tpl] || 20.25);
      const x = S[L.key], rr = L.r;
      const cell = (c, v) => { const cl = T.ws.getCell(rr, c); cl.value = T.coerce(v, cl.style); };
      cell(2, L.b); cell(3, label[L.key]);
      if (['rn', 'lpn', 'student'].includes(L.key)) {
        cell(4, x.moh); cell(5, x.reqShifts); cell(6, x.approvedShifts);
        cell(8, F(`F${rr}/${x.gross}`, x.approvedShifts != null ? U.round(x.approvedShifts / x.gross, 4) : 0));
        cell(9, x.actual);
        cell(10, F(`I${rr}-H${rr}`, U.round((x.actual || 0) - (x.approvedFte || 0), 4)));
      } else if (L.key === 'aux') {
        const st = staffingOf(db, dept.id).rows.aux;
        cell(4, st.moh == null && dept.beds ? F(`B8*${f.auxBedFactor}`, x.moh) : x.moh);
        cell(5, st.reqShifts == null && x.moh != null ? F('D9/1.12*(40/8)', x.reqShifts) : x.reqShifts);
        cell(6, x.approvedShifts);
        cell(7, F('IFERROR(F9/E9,"")', x.ratio ?? ''));
        cell(8, F(`F9/${x.gross}`, x.approvedFte ?? 0));
        cell(9, x.actual);
        cell(10, F('I9-H9', U.round((x.actual || 0) - (x.approvedFte || 0), 4)));
      } else {
        const [a, b] = L.key === 'nurses' ? [5, 7] : [8, 9];
        const sum = (c, v) => cell(c, F(L.key === 'nurses' ? `SUM(${colLetter(c)}${a}:${colLetter(c)}${b})` : `SUM(${colLetter(c)}8:${colLetter(c)}9)`, v ?? 0));
        sum(4, x.moh); sum(5, x.reqShifts); sum(6, x.approvedShifts);
        cell(7, F(`IFERROR(F${rr}/E${rr},"")`, x.ratio ?? ''));
        sum(8, x.approvedFte); sum(9, x.actual);
        cell(10, F(`I${rr}-H${rr}`, U.round((x.actual || 0) - (x.approvedFte || 0), 4)));
      }
    }
  },
};
