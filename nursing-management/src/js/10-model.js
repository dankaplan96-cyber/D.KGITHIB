'use strict';
// ════════════════════════════════════════════════════════════════
// Data model — the single source of truth.
// All collections are objects keyed by id so that two computers
// editing different records (or different fields) merge cleanly.
// ════════════════════════════════════════════════════════════════

const SCHEMA_VERSION = 3;
const APP_VERSION = '3.0.0';

const ROLES = {
  rn: { label: 'אח/ות מוסמך/ת', plural: 'מוסמכים', short: 'ס', status: (g) => (g === 'ז' ? 'מוסמך' : 'מוסמכת'), nurse: true, color: 'blue' },
  lpn: { label: 'אח/ות מעשי/ת', plural: 'מעשיים', short: 'ע', status: (g) => (g === 'ז' ? 'מעשי' : 'מעשית'), nurse: true, color: 'teal' },
  student: { label: 'סטודנט/ית לסיעוד', plural: 'סטודנטים', short: 'ס. לסיעוד', status: () => 'ס. לסיעוד', nurse: false, color: 'violet' },
  aux: { label: 'כוח עזר', plural: 'כוחות עזר', short: 'כח עזר', status: () => 'כח עזר', nurse: false, color: 'amber' },
};
const ROLE_ORDER = ['rn', 'lpn', 'student', 'aux'];

const STATUSES = {
  active: { label: 'פעיל/ה', suffix: '' },
  maternity: { label: 'חופשת לידה', suffix: '- חל"ד' },
  sick: { label: 'מחלה ממושכת', suffix: '- מחלה' },
  unpaid: { label: 'חל"ת', suffix: '- חל"ת' },
  left: { label: 'סיים/ה עבודה', suffix: '' },
};

const CONTRACTS = { 'ח': 'חוזה אישי', 'ק': 'קיבוצי (קבוע)', 'כ"א': 'כוח אדם' };
const SECTORS = { 'י': 'יהודי/ה', 'ע': 'לא יהודי/ה' };
const DEGREES = ['', 'B.A', 'M.A'];
const ADV_COURSES = ['גריאטריה', 'שיקום', 'רפואה דחופה', 'גסטרו', 'פנימית', 'טיפול נמרץ', 'אונקולוגיה', 'סיעוד מורכב', 'פסיכיאטריה'];

// חת"ש — columns F..AE of the nursing-administration file, in order.
// kind: 'check' (✓ / date / text), 'text', 'date'
const TRAINING = [
  { key: 'cpr', label: 'קורס החייאה', group: 'קליטת עובד', kind: 'text' },
  { key: 'crane', label: 'הדרכת מנוף ומעברים', group: 'קליטת עובד', kind: 'check' },
  { key: 'crane18', label: 'הדרכת מנוף טופס 18ג', group: 'קליטת עובד', kind: 'check' },
  { key: 'core2023', label: 'חתימה על נוהלי ליבה 2023', group: 'קליטת עובד', kind: 'check' },
  { key: 'core2024', label: 'חתימה על נוהלי ליבה 2024', group: 'קליטת עובד', kind: 'check' },
  { key: 'proc2025', label: 'חתימה על נהלים 2025', group: 'קליטת עובד', kind: 'check' },
  { key: 'proc2026', label: 'חתימה על נהלים 2026', group: 'קליטת עובד', kind: 'check' },
  { key: 'emerg2018', label: 'הדרכת חירום 2018', group: 'קליטת עובד', kind: 'check' },
  { key: 'onboardDone', label: 'סיום קליטת עובד', group: 'קליטת עובד', kind: 'check' },
  { key: 'cPotential', label: 'קורס מיצוי פוטנציאל', group: 'קורסים', kind: 'check', match: ['מיצוי'] },
  { key: 'cVent', label: 'קורס חולה המונשם', group: 'קורסים', kind: 'check', match: ['מונשם'] },
  { key: 'cInfect', label: 'קורס מניעת זיהומים', group: 'קורסים', kind: 'check', match: ['קורס מניעת זיהומים'] },
  { key: 'cWounds', label: 'קורס טיפול בפצעים', group: 'קורסים', kind: 'check', match: ['פצעים'] },
  { key: 'cPain', label: 'קורס טיפול בכאב', group: 'קורסים', kind: 'check', match: ['בכאב'] },
  { key: 'cPalliative', label: 'קורס טיפול פליאטיבי', group: 'קורסים', kind: 'check', match: ['פליאטיבי'] },
  { key: 'cGeriatric', label: 'קורס החולה הגריאטרי', group: 'קורסים', kind: 'check', match: ['הגריאטרי'] },
  { key: 'cComplex', label: 'קורס טיפול בחולה סיעוד מורכב', group: 'קורסים', kind: 'check', match: ['סיעוד מורכב'] },
  { key: 'cPsych', label: 'קורס טיפול פסיכיאטריה', group: 'קורסים', kind: 'check', match: ['פסיכיאטר'] },
  { key: 'nursingActs', label: 'פעולות סיעוד', group: 'הרשאות', kind: 'check' },
  { key: 'elSafety', label: 'לומדה בטיחות הטיפול', group: 'הרשאות', kind: 'check', match: ['לומדה בטיחות'] },
  { key: 'elInfect', label: 'לומדה מניעת זיהומים', group: 'הרשאות', kind: 'check', match: ['לומדה מניעת'] },
  { key: 'pCannula', label: 'החדרת קנולה - מתן הרשאה', group: 'הרשאות', kind: 'check', match: ['קנולה'] },
  { key: 'pPG', label: 'החדרת PG - מתן הרשאה', group: 'הרשאות', kind: 'check', match: ['PG'] },
  { key: 'pCVC', label: 'טיפול בצנתר מרכזי - מתן הרשאה', group: 'הרשאות', kind: 'check', match: ['צנתר'] },
  { key: 'pOTC', label: 'מתן OTC - מתן הרשאה', group: 'הרשאות', kind: 'check', match: ['OTC'] },
  { key: 'pBlood', label: 'מתן דם - תוקף מתן הרשאה', group: 'הרשאות', kind: 'date', match: ['מתן דם'], expiry: true },
];
const TRAINING_BY_KEY = Object.fromEntries(TRAINING.map((t) => [t.key, t]));
const TRAINING_GROUPS = ['קליטת עובד', 'קורסים', 'הרשאות'];
// built-in columns of the file + courses/permissions added by the users
const trainingDefs = (db) => [...TRAINING, ...(((db && db.settings && db.settings.customTraining) || []).map((t) => ({ ...t, custom: true, expiry: t.kind === 'date' })))];
const customKey = (label) => { let h = 0; for (const ch of String(label)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return `x_${(h >>> 0).toString(36)}`; };
const CHECK = '✓';

const DEFAULT_SETTINGS = () => ({
  orgName: 'הנהלת הסיעוד',
  divisions: ['אגף גריאטריה'],
  years: { safety: [2024, 2025], conversations: [2024, 2025, 2026], evaluations: [2021, 2022, 2024, 2025, 2026, 2027] },
  staffing: { nurseFactor: 0.375, auxFactor: 0.305, auxBedFactor: 0.25, nurseGross: 4.5, otherGross: 5 },
  alerts: { shiftWarnDays: 60, bloodWarnDays: 60 },
  customTraining: [],
});

function emptyDB() {
  return {
    schema: SCHEMA_VERSION,
    createdAt: U.nowISO(),
    settings: DEFAULT_SETTINGS(),
    depts: {},
    employees: {},
    movements: {},
    staffing: {},
    docs: {},
    users: {},
    audit: {},
    legacy: null,
  };
}

function newDept(name, extra = {}) {
  return { id: U.uid('dept'), name: String(name || '').trim(), division: '', mix: '', beds: null, headNurse: '', deputy: '', order: 0, ...extra };
}

function newEmployee(extra = {}) {
  return {
    id: U.uid('emp'),
    name: '', title: '', idNum: '', deptId: '', role: 'rn', gender: 'נ', status: 'active', statusNote: '',
    regNum: '', scope: 1, degree: '', advCourse: '', clinical: '', birthYear: null, contract: 'ח', sector: 'י',
    employer: '', startDate: '', notes: '', leftDate: '', leftReason: '', order: 0,
    safety: {}, shift: { active: false, course: '', appoint: '', evalDate: '', renew: '', validUntil: '', performs: '' },
    conv: {}, evals: {}, trn: {},
    createdAt: U.nowISO(), updatedAt: U.nowISO(), updatedBy: '',
    ...extra,
  };
}

function normalizeEmployee(e) {
  const base = newEmployee();
  for (const k of Object.keys(base)) if (e[k] === undefined) e[k] = base[k];
  if (!ROLES[e.role]) e.role = 'rn';
  if (!STATUSES[e.status]) e.status = 'active';
  for (const k of ['safety', 'conv', 'evals', 'trn']) if (!e[k] || typeof e[k] !== 'object' || Array.isArray(e[k])) e[k] = {};
  if (!e.shift || typeof e.shift !== 'object') e.shift = base.shift;
  for (const k of Object.keys(base.shift)) if (e.shift[k] === undefined) e.shift[k] = base.shift[k];
  e.idNum = e.idNum ? U.normId(e.idNum) : '';
  return e;
}

function normalizeDB(db) {
  if (!db || typeof db !== 'object') db = emptyDB();
  const def = emptyDB();
  for (const k of Object.keys(def)) if (db[k] === undefined || db[k] === null) db[k] = def[k];
  const ds = DEFAULT_SETTINGS();
  db.settings = { ...ds, ...db.settings };
  db.settings.years = { ...ds.years, ...(db.settings.years || {}) };
  db.settings.staffing = { ...ds.staffing, ...(db.settings.staffing || {}) };
  db.settings.alerts = { ...ds.alerts, ...(db.settings.alerts || {}) };
  if (!Array.isArray(db.settings.divisions) || !db.settings.divisions.length) db.settings.divisions = ds.divisions;
  if (!Array.isArray(db.settings.customTraining)) db.settings.customTraining = [];
  Object.values(db.employees).forEach(normalizeEmployee);
  db.schema = SCHEMA_VERSION;
  return db;
}

// ── Queries ─────────────────────────────────────────────────────
const deptList = (db) => U.sortBy(Object.values(db.depts), (d) => d.order || 0, (d) => d.name);
const deptName = (db, id) => (db.depts[id] && db.depts[id].name) || '';
const findDeptByName = (db, name) => {
  const n = U.normName(name);
  return Object.values(db.depts).find((d) => U.normName(d.name) === n) || null;
};

function employeesOf(db, { deptId = null, deptIds = null, includeLeft = false, roles = null } = {}) {
  let list = Object.values(db.employees);
  if (deptId) list = list.filter((e) => e.deptId === deptId);
  if (deptIds) list = list.filter((e) => deptIds.includes(e.deptId));
  if (!includeLeft) list = list.filter((e) => e.status !== 'left');
  if (roles) list = list.filter((e) => roles.includes(e.role));
  return sortEmployees(list);
}
const sortEmployees = (list) => U.sortBy(list, (e) => ROLE_ORDER.indexOf(e.role), (e) => e.order || 0, (e) => e.name);

const empStatusLabel = (e) => ROLES[e.role].status(e.gender);
const empShort = (e) => ROLES[e.role].short;
// Name as it appears in the reports: name + status suffix (e.g. "- חל"ד")
const reportName = (e, withTitle = false) => {
  let s = e.name || '';
  if (withTitle && e.title) s += `           ${e.title}`;
  const suf = (STATUSES[e.status] || {}).suffix;
  if (suf) s += suf;
  return s;
};
const employerOf = (e) => e.employer || (e.contract === 'כ"א' ? 'כח אדם' : 'בי"ח');
const age = (e, year = U.thisYear()) => (e.birthYear ? year - e.birthYear : null);

// Truthy training value (✓, date or free text other than "לא")
const hasValue = (v) => v != null && String(v).trim() !== '' && !/^(לא|x|✗|-+|_+)$/i.test(String(v).trim());

// ── Compliance / alerts ─────────────────────────────────────────
function currentHalf(d = new Date()) { return d.getMonth() < 6 ? 'h1' : 'h2'; }

function employeeIssues(db, e, today = new Date()) {
  const out = [];
  if (e.status === 'left') return out;
  const y = today.getFullYear();
  const A = db.settings.alerts;
  const working = e.status === 'active';
  const add = (sev, area, text, due = '', tab = '') => out.push({ sev, area, text, due, tab, empId: e.id });

  if (!e.idNum) add('warn', 'פרטים', 'חסר מספר ת.ז.', '', 'details');
  else if (!U.validIsraeliId(e.idNum)) add('info', 'פרטים', 'מספר ת.ז. אינו תקין (ספרת ביקורת)', '', 'details');
  if (!e.startDate) add('info', 'פרטים', 'חסר תאריך תחילת עבודה', '', 'details');

  if (e.shift && e.shift.active && e.shift.validUntil) {
    const d = U.daysUntil(e.shift.validUntil);
    if (d != null && d < 0) add('crit', 'אחראיות משמרת', `מינוי אחראי/ת משמרת פג תוקף (${U.fmtDate(e.shift.validUntil)})`, e.shift.validUntil, 'shift');
    else if (d != null && d <= A.shiftWarnDays) add('warn', 'אחראיות משמרת', `מינוי אחראי/ת משמרת יפוג בעוד ${d} ימים`, e.shift.validUntil, 'shift');
  }
  for (const t of trainingDefs(db).filter((x) => x.expiry)) {
    const val = e.trn && e.trn[t.key];
    if (!ROLES[e.role].nurse || !val) continue;
    const iso = U.parseDate(val);
    const d = iso ? U.daysUntil(iso) : null;
    const nm = t.key === 'pBlood' ? 'הרשאת מתן דם' : t.label;
    if (d != null && d < 0) add('crit', 'הרשאות', `${nm} — פג תוקף (${U.fmtDate(iso)})`, iso, 'training');
    else if (d != null && d <= A.bloodWarnDays) add('warn', 'הרשאות', `${nm} — יפוג בעוד ${d} ימים`, iso, 'training');
  }
  if (working) {
    const sy = db.settings.years.safety;
    if (sy.includes(y)) {
      const s = (e.safety || {})[y] || {};
      if (!hasValue(s.date) && !hasValue(s.score)) add('warn', 'בטיחות הטיפול', `לא בוצעה בדיקת בטיחות הטיפול ${y}`, '', 'safety');
    }
    if (db.settings.years.conversations.includes(y)) {
      const c = (e.conv || {})[y] || {};
      const half = currentHalf(today);
      if (half === 'h2' && !hasValue(c.h1)) add('warn', 'שיחות משוב', `חסרה שיחת משוב מחצית א' ${y}`, '', 'conv');
      if (half === 'h2' && today.getMonth() >= 10 && !hasValue(c.h2)) add('info', 'שיחות משוב', `טרם בוצעה שיחת משוב מחצית ב' ${y}`, '', 'conv');
    }
    if (db.settings.years.evaluations.includes(y) && today.getMonth() >= 9) {
      if (!hasValue((e.evals || {})[y])) add('info', 'הערכות', `טרם בוצעה הערכת עובד ${y}`, '', 'evals');
    }
  }
  return out;
}

// Per-department completion figures for the dashboard
function deptStats(db, deptIds, today = new Date()) {
  const y = today.getFullYear();
  const emps = employeesOf(db, { deptIds });
  const active = emps.filter((e) => e.status === 'active');
  const byRole = Object.fromEntries(ROLE_ORDER.map((r) => [r, emps.filter((e) => e.role === r)]));
  const fte = (list) => U.round(list.reduce((a, e) => a + (Number(e.scope) || 0), 0), 2);
  const safetyDone = active.filter((e) => { const s = (e.safety || {})[y] || {}; return hasValue(s.date) || hasValue(s.score); }).length;
  const half = currentHalf(today);
  const convDone = active.filter((e) => hasValue(((e.conv || {})[y] || {})[half])).length;
  const evalDone = active.filter((e) => hasValue((e.evals || {})[y])).length;
  const shiftList = emps.filter((e) => e.shift && e.shift.active);
  const shiftValid = shiftList.filter((e) => { const d = U.daysUntil(e.shift.validUntil); return d != null && d >= 0; }).length;
  const issues = emps.flatMap((e) => employeeIssues(db, e, today));
  return {
    total: emps.length, active: active.length, byRole, fte, safetyDone, convDone, evalDone, half,
    shiftCount: shiftList.length, shiftValid, issues,
    absent: emps.filter((e) => e.status !== 'active').length,
  };
}

// תקן מקוצר — per-department staffing model
const STAFF_ROWS = [
  { key: 'rn', label: 'א. מוסמכות', roles: ['rn'], grossKey: 'nurseGross' },
  { key: 'lpn', label: 'א. מעשיות', roles: ['lpn'], grossKey: 'nurseGross' },
  { key: 'student', label: 'סטודנטים', roles: ['student'], grossKey: 'otherGross' },
  { key: 'aux', label: 'כוחות עזר', roles: ['aux'], grossKey: 'otherGross' },
];
function staffingOf(db, deptId) {
  const s = db.staffing[deptId] || {};
  const rows = {};
  for (const r of STAFF_ROWS) rows[r.key] = { moh: null, reqShifts: null, approvedShifts: null, actualOverride: null, ...((s.rows || {})[r.key] || {}) };
  return { rows };
}
function staffingComputed(db, deptId) {
  const st = staffingOf(db, deptId);
  const f = db.settings.staffing;
  const dept = db.depts[deptId] || {};
  const emps = employeesOf(db, { deptId });
  const out = {};
  for (const r of STAFF_ROWS) {
    const row = st.rows[r.key];
    const actualAuto = U.round(emps.filter((e) => r.roles.includes(e.role)).reduce((a, e) => a + (Number(e.scope) || 0), 0), 2);
    let moh = row.moh, req = row.reqShifts;
    if (r.key === 'aux' && moh == null && dept.beds) moh = U.round(dept.beds * f.auxBedFactor, 2);
    if (r.key === 'aux' && req == null && moh != null) req = U.round((moh / 1.12) * (40 / 8), 2);
    const gross = f[r.grossKey];
    const approvedFte = row.approvedShifts != null ? U.round(row.approvedShifts / gross, 2) : null;
    const actual = row.actualOverride != null ? row.actualOverride : actualAuto;
    out[r.key] = {
      ...row, moh, reqShifts: req, actualAuto, actual, gross, approvedFte,
      ratio: row.approvedShifts != null && req ? row.approvedShifts / req : null,
      gap: approvedFte != null ? U.round(actual - approvedFte, 2) : null,
    };
  }
  const sum = (keys, k) => { const v = keys.map((x) => out[x][k]).filter((x) => x != null); return v.length ? U.round(v.reduce((a, b) => a + b, 0), 2) : null; };
  const mk = (keys) => {
    const o = {};
    for (const k of ['moh', 'reqShifts', 'approvedShifts', 'approvedFte', 'actual']) o[k] = sum(keys, k);
    o.ratio = o.approvedShifts != null && o.reqShifts ? o.approvedShifts / o.reqShifts : null;
    o.gap = o.approvedFte != null && o.actual != null ? U.round(o.actual - o.approvedFte, 2) : null;
    return o;
  };
  out.nurses = mk(['rn', 'lpn', 'student']);
  out.total = mk(['rn', 'lpn', 'student', 'aux']);
  return out;
}

// ── Audit ───────────────────────────────────────────────────────
const AUDIT_MAX = 4000;
function addAudit(db, user, action, detail = '', ref = '') {
  const id = U.uid('aud');
  db.audit[id] = { id, at: U.nowISO(), user: user ? user.username : 'system', userName: user ? user.displayName : 'מערכת', action, detail: String(detail).slice(0, 500), ref };
  const keys = Object.keys(db.audit);
  if (keys.length > AUDIT_MAX) {
    U.sortBy(keys.map((k) => db.audit[k]), (a) => a.at).slice(0, keys.length - AUDIT_MAX).forEach((a) => delete db.audit[a.id]);
  }
}

// ── Migration from the previous single-file version (schema ≤ 2) ──
function migrateLegacyState(old) {
  const db = emptyDB();
  if (!old || typeof old !== 'object') return db;
  const deptByName = {};
  const ensureDept = (name, division) => {
    name = String(name || '').trim();
    if (!name) return '';
    const key = U.normName(name);
    if (!deptByName[key]) {
      const d = newDept(name, { division: division || '' });
      d.order = Object.keys(deptByName).length;
      db.depts[d.id] = d;
      deptByName[key] = d;
    }
    return deptByName[key].id;
  };
  if (Array.isArray(old.divisions) && old.divisions.length) db.settings.divisions = old.divisions.slice();
  const divMap = old.departmentDivisions || {};
  (old.departments || []).forEach((d) => ensureDept(d, divMap[d]));
  const stDepts = (old.staffing && old.staffing.departments) || {};
  Object.entries(stDepts).forEach(([name, s]) => {
    const id = ensureDept(name, s && s.division);
    if (s && s.beds) db.depts[id].beds = Number(s.beds) || null;
  });
  const mw = old.managementWorkbook || {};
  if (mw.years) {
    for (const k of ['safety', 'conversations', 'evaluations']) if (Array.isArray(mw.years[k]) && mw.years[k].length) db.settings.years[k] = mw.years[k].map(Number);
  }
  const roleOf = (t) => (t === 'אחות מעשית' ? 'lpn' : t === 'כוח עזר' ? 'aux' : t === 'סטודנט לסיעוד' ? 'student' : 'rn');
  const keyMap = {
    cpr_course_done: 'cpr', crane_training_done: 'crane', crane_form18_done: 'crane18', core_procedures_2023: 'core2023', core_procedures_2024: 'core2024',
    procedures_2025: 'proc2025', procedures_2026: 'proc2026', emergency_training_2018: 'emerg2018', onboarding_completed: 'onboardDone',
    course_potential: 'cPotential', course_ventilated: 'cVent', course_infection: 'cInfect', course_wounds: 'cWounds', course_pain: 'cPain',
    course_palliative: 'cPalliative', course_geriatric: 'cGeriatric', course_complex_nursing: 'cComplex', course_psychiatry: 'cPsych',
    nursing_actions: 'nursingActs', safety_elearning: 'elSafety', infection_elearning: 'elInfect', cannula_permission: 'pCannula',
    pg_permission: 'pPG', central_catheter_permission: 'pCVC', otc_permission: 'pOTC', blood_permission_expiry: 'pBlood',
  };
  const dv = (v) => U.parseDate(v) || (v == null ? '' : String(v));
  (old.employees || []).forEach((o, i) => {
    if (!o) return;
    const e = newEmployee({
      id: o.id ? `emp_${String(o.id).replace(/[^\w-]/g, '')}` : U.uid('emp'),
      name: `${o.lastName || ''} ${o.firstName || ''}`.trim() || o.name || '',
      idNum: U.normId(o.idNum), deptId: ensureDept(o.dept, o.division), role: roleOf(o.type),
      status: o.isActive === false || o.endDate ? 'left' : o.isMaternity ? 'maternity' : 'active',
      regNum: o.regNum || '', scope: o.scope ? Number(o.scope) / (Number(o.scope) > 1.5 ? 100 : 1) : 1,
      degree: o.degree === 'תואר שני' ? 'M.A' : o.degree === 'תואר ראשון' ? 'B.A' : (o.degree || ''),
      advCourse: o.advCourse || '', clinical: o.clinicalInstruction ? (typeof o.clinicalInstruction === 'string' ? o.clinicalInstruction : 'הדרכה קלינית') : '',
      birthYear: o.birthDate ? Number(String(o.birthDate).slice(0, 4)) || null : null,
      contract: o.contract === 'כח אדם' ? 'כ"א' : o.isPermanent || o.contract === 'קבוע' ? 'ק' : 'ח',
      sector: o.religion && o.religion !== 'יהודי' ? 'ע' : 'י', gender: o.gender === 'זכר' || o.gender === 'ז' ? 'ז' : 'נ',
      startDate: dv(o.startDate), notes: o.notes || '', leftDate: dv(o.endDate), leftReason: o.endReason || '', order: i,
      title: o.role && /ראש צוות|אחראי/.test(o.role) ? o.role : '',
    });
    Object.entries(o.careSafety || {}).forEach(([y, s]) => { if (s) e.safety[y] = { checker: s.checker || '', date: dv(s.date), score: s.score || '' }; });
    Object.entries(o.conversations || {}).forEach(([y, c]) => { if (c) e.conv[y] = { h1: dv(c.h1), h2: dv(c.h2) }; });
    (o.evalHistory || []).forEach((x) => { if (x && x.year) e.evals[x.year] = x.value ?? x.score ?? ''; });
    Object.entries(o.instrRec || {}).forEach(([k, v]) => {
      const nk = keyMap[k];
      if (nk && v !== '' && v != null && v !== false) e.trn[nk] = v === true ? CHECK : dv(v);
    });
    if (o.isShiftResp || o.shiftApproval || o.shiftValidUntil) {
      e.shift = { active: !!(o.isShiftResp || o.shiftApproval), course: o.shiftCourse || '', appoint: dv(o.shiftApproval), evalDate: dv(o.shiftManagementEvaluation), renew: dv(o.shiftRenewal), validUntil: dv(o.shiftValidUntil), performs: o.shiftNotes || '' };
    }
    db.employees[e.id] = e;
  });
  const mv = mw.movements || {};
  for (const [kind, list] of [['in', mv.incoming], ['out', mv.outgoing]]) {
    (list || []).forEach((m) => {
      if (!m) return;
      const id = U.uid('mov');
      db.movements[id] = { id, kind, date: dv(m.date), name: m.name || '', dept: m.dept || '', role: m.role || m.status || '', reason: m.reason || m.notes || '', col1: m.col1 || '', col2: m.col2 || '' };
    });
  }
  // Users keep their password hashes (same PBKDF2 format) so nobody has to reset.
  const permMap = {
    dashboard_view: ['dashboard_view'], employees_view: ['employees_view'], employees_edit: ['employees_edit'],
    management_view: ['sheets_view'], management_edit: ['sheets_edit'], staffing_view: ['staffing_view'], staffing_edit: ['staffing_edit'],
    documents_view: ['documents_view'], documents_edit: ['documents_edit'], reports_view: ['reports_export'], settings_edit: ['settings_edit'], users_manage: ['users_manage'],
  };
  ((old.security && old.security.users) || []).forEach((u) => {
    if (!u || !u.username) return;
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    const role = u.role === 'manager' || perms.includes('*') ? 'admin' : u.role === 'teamlead' ? 'editor' : u.role === 'viewer' ? 'viewer' : 'custom';
    const id = u.id || U.uid('usr');
    db.users[id] = {
      id, username: String(u.username).toLowerCase(), displayName: u.fullName || u.displayName || u.username, role,
      perms: role === 'admin' ? ['*'] : role === 'custom' ? [...new Set(perms.flatMap((p) => permMap[p] || []))] : ROLE_TEMPLATES[role].perms.slice(),
      depts: [], cred: u.hash && u.salt ? { hash: u.hash, salt: u.salt, algo: u.hashAlgo || 'pbkdf2' } : (u.cred || null),
      active: u.active !== false, mustChange: !!u.mustChangePassword || (!(u.hash && u.salt) && !u.cred), createdAt: u.createdAt || U.nowISO(), lastLogin: u.lastLogin || '',
    };
  });
  db.legacy = { importedAt: U.nowISO(), tasks: old.tasks || [], meetings: old.meetings || [], alertRules: old.alertRules || [] };
  return db;
}

// ── Permissions ─────────────────────────────────────────────────
const PERMISSIONS = [
  { key: 'dashboard', label: 'לוח בקרה', levels: ['view'] },
  { key: 'employees', label: 'עובדים וכרטיס עובד', levels: ['view', 'edit'] },
  { key: 'sheets', label: 'גיליונות הנהלת הסיעוד', levels: ['view', 'edit'] },
  { key: 'movements', label: 'תנועות כוח אדם (נכנסים/עוזבים)', levels: ['view', 'edit'] },
  { key: 'staffing', label: 'תקן מקוצר', levels: ['view', 'edit'] },
  { key: 'documents', label: 'מסמכי עובדים', levels: ['view', 'edit'] },
  { key: 'reports', label: 'הפקת דוחות Excel והדפסה', levels: ['export'] },
  { key: 'import', label: 'ייבוא נתונים מקבצים', levels: ['run'] },
  { key: 'settings', label: 'הגדרות מערכת ומחלקות', levels: ['edit'] },
  { key: 'backups', label: 'גיבויים ושחזור', levels: ['manage'] },
  { key: 'users', label: 'ניהול משתמשים והרשאות', levels: ['manage'] },
];
const LEVEL_LABEL = { view: 'צפייה', edit: 'עריכה', export: 'הפקה', run: 'הרצה', manage: 'ניהול' };
const ROLE_TEMPLATES = {
  admin: { label: 'מנהל/ת מערכת (הנהלת הסיעוד)', perms: ['*'] },
  editor: { label: 'עריכה שוטפת', perms: ['dashboard_view', 'employees_view', 'employees_edit', 'sheets_view', 'sheets_edit', 'movements_view', 'movements_edit', 'staffing_view', 'documents_view', 'documents_edit', 'reports_export'] },
  viewer: { label: 'צפייה בלבד', perms: ['dashboard_view', 'employees_view', 'sheets_view', 'movements_view', 'staffing_view', 'documents_view', 'reports_export'] },
  custom: { label: 'מותאם אישית', perms: [] },
};
function userCan(user, perm) {
  if (!user || !user.active) return false;
  const p = user.perms || [];
  if (p.includes('*') || p.includes(perm)) return true;
  if (perm.endsWith('_view')) {
    const base = perm.slice(0, -5);
    return p.includes(`${base}_edit`);
  }
  return false;
}
// Department scope: empty list = all departments
const userDeptIds = (db, user) => {
  const all = deptList(db).map((d) => d.id);
  if (!user || !user.depts || !user.depts.length || (user.perms || []).includes('*')) return all;
  return all.filter((id) => user.depts.includes(id));
};
