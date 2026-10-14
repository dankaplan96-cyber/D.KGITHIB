// Unit / integration tests for the core modules (no browser needed).
// Usage: npm test
const assert = require('assert');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { load } = require('./harness');
const A = load();
const T = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/report-template.json'), 'utf8'));
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e.message); } };

// synthetic department (fictional people; valid check digits)
function idWithCheck(base8) {
  let sum = 0;
  for (let i = 0; i < 8; i++) { let n = Number(base8[i]) * ((i % 2) + 1); if (n > 9) n -= 9; sum += n; }
  return base8 + ((10 - (sum % 10)) % 10);
}
function sampleDB() {
  const db = A.emptyDB();
  const d = A.newDept("פנימית ב'", { mix: 'קשישים', beds: 32, headNurse: 'רחל לוי', deputy: 'משה כהן', division: 'אגף גריאטריה' });
  db.depts[d.id] = d;
  const people = [
    ['לוי רחל', 'rn', { title: 'ראש צוות', degree: 'M.A', advCourse: 'גריאטריה', scope: 1, birthYear: 1980, contract: 'ק', gender: 'נ', shift: { active: true, course: 'ל. גריאטריה', appoint: '2024-05-09', evalDate: '2024-11-25', renew: '2024-11-25', validUntil: '2027-11-25', performs: 'ערב ולילה' } }],
    ['כהן משה', 'rn', { degree: 'B.A', advCourse: 'שיקום', scope: 0.75, birthYear: 1990, gender: 'ז', status: 'maternity' }],
    ['אברהם נועה', 'rn', { degree: 'B.A', scope: 0.5, birthYear: 1995, sector: 'ע', contract: 'כ"א' }],
    ['דוד יעל', 'lpn', { scope: 1, birthYear: 1970 }],
    ['שמעון טל', 'student', { scope: 0.38, birthYear: 2003, notes: 'שנה ג' }],
    ['יוסף אורי', 'aux', { scope: 1, birthYear: 1985, contract: 'ק' }],
    ['מרקוביץ דנה', 'aux', { scope: 0.66, birthYear: 1992, statusNote: 'חזרה 10.11.25' }],
  ];
  people.forEach(([name, role, extra], i) => {
    const e = A.newEmployee({ name, role, deptId: d.id, idNum: idWithCheck(String(10000000 + i * 1234567).slice(0, 8)), startDate: `20${10 + i}-0${(i % 9) + 1}-1${i}`, regNum: role === 'rn' || role === 'lpn' ? String(200000 + i) : '', order: i, ...extra });
    e.safety = { 2024: { checker: 'אירנה', date: '2024-10-30', score: 90 + i } };
    e.conv = { 2025: { h1: '2025-03-01', h2: 'אוגוסט' } };
    e.evals = { 2025: 10 - (i % 3) };
    e.trn = { cpr: 'ACLS ע.ב', crane: A.CHECK, core2024: A.CHECK, cPotential: '2024-03-28', pBlood: '2026-05-05' };
    db.employees[e.id] = A.normalizeDB({ ...A.emptyDB(), employees: { [e.id]: e } }).employees[e.id];
  });
  const mid = 'mov_1';
  db.movements[mid] = { id: mid, kind: 'in', date: '2026-01-12', name: 'עובד חדש', dept: "שיקום ב'", role: 'אח', reason: 'חמלה', col1: '', col2: '' };
  db.movements.mov_2 = { id: 'mov_2', kind: 'out', date: '2026-01-04', name: 'עובדת יוצאת', dept: "פסיכ' גברים", role: 'אחות', reason: 'התפטרות', col1: '', col2: '' };
  db.staffing[d.id] = { rows: { rn: { moh: 12, reqShifts: 40, approvedShifts: 38 }, lpn: { approvedShifts: 9 }, aux: { approvedShifts: 23 } } };
  return { db: A.normalizeDB(db), deptId: d.id };
}

(async () => {
  await t('israeli ID check digit', () => { assert(A.U.validIsraeliId('000000018')); assert(!A.U.validIsraeliId('000000017')); });
  await t('date parsing (Excel styles)', () => {
    assert.equal(A.U.parseDate('6.11.23'), '2023-11-06');
    assert.equal(A.U.parseDate('25.2.2024'), '2024-02-25');
    assert.equal(A.U.parseDate('23/05/2006'), '2006-05-23');
    assert.equal(A.U.parseDate('אוגוסט'), null);
    assert.equal(A.U.parseDate('31.2.24'), null);
    assert.equal(A.U.fmtDate('2023-11-06'), '06.11.23');
  });
  await t('name cell parsing (title / status suffix)', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(A.parseNameCell('דנה כהן           ראש צוות'))), { name: 'דנה כהן', title: 'ראש צוות', status: '' });
    assert.equal(A.parseNameCell('מיכל לוי- חל"ד').status, 'maternity');
    assert.equal(A.parseNameCell('רונית אברהם- מחלה').status, 'sick');
  });
  await t('fuzzy name similarity is order-insensitive', () => {
    assert.equal(A.U.nameSimilarity('נועה בת שבע לוי', 'לוי נועה בת שבע'), 1);
    assert(A.U.nameSimilarity('רותי גולדמן', 'רותה גולדמן') > 0.8);
    assert(A.U.nameSimilarity('יוסי מזרחי', 'נועה אברהם') < 0.5);
  });

  const { db, deptId } = sampleDB();
  let file;
  await t('export builds all 8 sheets in template order', async () => {
    const wb = A.buildReportWorkbook(ExcelJS, T, db, deptId, { year: 2026 });
    assert.deepEqual(wb.worksheets.map((w) => w.name), ['בטיחות הטיפול', 'אחראיות משמרת', 'שיחות עובדים', 'הערכות עובדים', 'חת"ש', 'תקן', 'תקינה ', 'תקן מקוצר']);
    assert(wb.worksheets.every((w) => w.views[0].rightToLeft));
    file = await wb.xlsx.writeBuffer();
  });
  await t('export: staffing sheet formulas and totals', async () => {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(file);
    const ws = wb.getWorksheet('תקן');
    assert.equal(ws.getCell('A1').value, "פנימית ב'");
    const v = (a) => ws.getCell(a).value;
    // 3 RN + 1 LPN rows (3..6), totals start at row 7
    assert.equal(v('D3'), 'ס'); assert.equal(v('D6'), 'ע');
    assert.match(v('A3'), /^לוי רחל\s+ראש צוות$/);
    assert.match(v('A4'), /חל"ד$/);
    assert.deepEqual(v('D8'), { formula: 'COUNTIF(D3:D6,"ס")', result: 3 });
    assert.deepEqual(v('E8'), { formula: 'SUM(E3:E5)', result: 2.25 });
    assert.deepEqual(v('D13'), { formula: 'D10+D8', result: 4 });
    assert.equal(v('J3').formula, '2026-I3');
    assert.equal(ws.getCell('B3').value, db.employees[Object.keys(db.employees)[0]].idNum);
  });
  await t('export: check marks use the Wingdings glyph like the original', async () => {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(file);
    const ws = wb.getWorksheet('חת"ש');
    assert.equal(ws.getCell('G4').value, 'ü');
    assert.equal(ws.getCell('G4').font.name, 'Wingdings');
    assert.equal(ws.getCell('F4').value, 'ACLS ע.ב');
  });
  await t('export: movements and short staffing', async () => {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(file);
    const mv = wb.getWorksheet('תקינה ');
    assert.equal(mv.getCell('A1').value, 'נכנסים'); assert.equal(mv.getCell('B4').value, 'עובד חדש'); assert.equal(mv.getCell('A4').value, '12.01.26');
    const ss = wb.getWorksheet('תקן מקוצר');
    assert.equal(ss.getCell('C5').value, 'א. מוסמכות'); assert.equal(ss.getCell('F5').value, 38);
    assert.equal(ss.getCell('I5').value, 2.25); // actual FTE computed from employees
    assert.equal(ss.getCell('D9').value.formula, 'B8*0.25');
    assert.equal(ss.getCell('B8').value, 32);
  });
  await t('round trip: export → import gives back the same data', async () => {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(file);
    const parsed = A.parseWorkbook(wb);
    assert.equal(parsed.people.length, 7);
    assert.equal(parsed.warnings.length, 0, parsed.warnings.join());
    const plan = A.planImport(db, parsed, deptId);
    const changed = plan.items.filter((i) => i.action !== 'same');
    assert.equal(changed.length, 0, JSON.stringify(changed.map((i) => [i.person.name, i.changes])));
    assert.equal(plan.movements.filter((m) => !m.exists).length, 0);
  });
  await t('import into empty database, then re-import is a no-op', async () => {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(file);
    const parsed = A.parseWorkbook(wb);
    const db2 = A.emptyDB(); const d = A.newDept(parsed.deptTitle); db2.depts[d.id] = d;
    const r = A.applyImport(db2, A.planImport(db2, parsed, d.id), null);
    assert.equal(r.created, 7); assert.equal(r.movements, 2);
    const again = A.planImport(db2, parsed, d.id);
    assert.equal(again.items.filter((i) => i.action !== 'same').length, 0);
    const e = Object.values(db2.employees).find((x) => x.name === 'לוי רחל');
    assert.equal(e.title, 'ראש צוות'); assert.equal(e.shift.validUntil, '2027-11-25'); assert.equal(e.trn.crane, A.CHECK);
    assert.equal(Object.values(db2.employees).find((x) => x.name === 'כהן משה').status, 'maternity');
    assert.equal(db2.depts[d.id].beds, 32); assert.equal(db2.depts[d.id].mix, 'קשישים');
  });
  await t('import never erases data with empty cells', async () => {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(file);
    wb.getWorksheet('תקן').getCell('N3').value = null;
    const db3 = JSON.parse(JSON.stringify(db));
    const e = Object.values(db3.employees).find((x) => x.name === 'לוי רחל'); e.notes = 'הערה קיימת';
    const plan = A.planImport(db3, A.parseWorkbook(wb), deptId);
    assert(!plan.items.some((i) => i.changes.some((c) => c.path === 'notes')));
  });

  await t('extra courses: exported as extra columns, imported back without duplicates', async () => {
    const db4 = JSON.parse(JSON.stringify(db));
    db4.settings.customTraining = [{ key: 'x_test1', label: 'חתימה על נהלים 2027', group: 'קליטת עובד', kind: 'check' }];
    const e = Object.values(db4.employees).find((x) => x.name === 'לוי רחל'); e.trn.x_test1 = A.CHECK;
    const wb = A.buildReportWorkbook(ExcelJS, T, A.normalizeDB(db4), deptId, { sheets: ['training'] });
    const ws = wb.getWorksheet('חת"ש');
    assert.equal(ws.getCell('AF2').value, 'חתימה על נהלים 2027'); assert.equal(ws.getCell('AF4').value, 'ü');
    const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.load(await wb.xlsx.writeBuffer());
    const parsed = A.parseWorkbook(wb2);
    const plan = A.planImport(A.normalizeDB(db4), parsed, deptId);
    assert.equal(plan.customTraining.length, 0);
    assert.equal(plan.items.filter((i) => i.changes.some((c) => c.path.startsWith('trn.'))).length, 0);
    const empty = A.emptyDB(); const d = A.newDept('x'); empty.depts[d.id] = d;
    A.applyImport(empty, A.planImport(empty, A.parseWorkbook(wb2), d.id), null);
    assert.equal(empty.settings.customTraining.length, 1);
    const k = empty.settings.customTraining[0].key;
    assert.equal(Object.values(empty.employees).find((x) => x.name === 'לוי רחל').trn[k], A.CHECK);
  });
  await t('three-way merge: different records and fields merge cleanly', () => {
    const base = JSON.parse(JSON.stringify(db));
    const ids = Object.keys(base.employees);
    const local = JSON.parse(JSON.stringify(base)), remote = JSON.parse(JSON.stringify(base));
    local.employees[ids[0]].notes = 'L'; remote.employees[ids[1]].notes = 'R';
    remote.employees[ids[0]].scope = 0.5; // same record, different field
    local.users.u1 = { id: 'u1', username: 'x' };
    delete remote.movements.mov_2;
    const { merged, conflicts } = A.mergeDB(base, local, remote);
    assert.equal(conflicts.length, 0);
    assert.equal(merged.employees[ids[0]].notes, 'L'); assert.equal(merged.employees[ids[0]].scope, 0.5);
    assert.equal(merged.employees[ids[1]].notes, 'R'); assert(merged.users.u1); assert(!merged.movements.mov_2);
  });
  await t('three-way merge: same field → conflict reported, local wins; delete vs edit keeps record', () => {
    const base = JSON.parse(JSON.stringify(db));
    const id = Object.keys(base.employees)[2];
    const local = JSON.parse(JSON.stringify(base)), remote = JSON.parse(JSON.stringify(base));
    local.employees[id].notes = 'L'; remote.employees[id].notes = 'R';
    const r1 = A.mergeDB(base, local, remote);
    assert.equal(r1.conflicts.length, 1); assert.equal(r1.merged.employees[id].notes, 'L');
    const l2 = JSON.parse(JSON.stringify(base)), r2 = JSON.parse(JSON.stringify(base));
    delete l2.employees[id]; r2.employees[id].notes = 'edited';
    assert.equal(A.mergeDB(base, l2, r2).merged.employees[id].notes, 'edited');
  });

  await t('passwords: PBKDF2 hash verify, wrong password rejected, no plaintext', async () => {
    const c = await A.hashPassword('Secret123');
    assert.equal(c.algo, 'pbkdf2'); assert.equal(c.hash.length, 64);
    assert(await A.verifyPassword('Secret123', c)); assert(!(await A.verifyPassword('secret123', c)));
  });
  await t('permissions: view implied by edit, department scope', () => {
    const u = { active: true, perms: ['employees_edit'] };
    assert(A.userCan(u, 'employees_view')); assert(!A.userCan(u, 'users_manage'));
    assert(A.userCan({ active: true, perms: ['*'] }, 'users_manage'));
    assert(!A.userCan({ active: false, perms: ['*'] }, 'employees_view'));
  });
  await t('migration from previous version keeps employees, users (with hashes) and movements', () => {
    const old = {
      departments: ["שיקום ה'"], departmentDivisions: { "שיקום ה'": 'אגף גריאטריה' },
      employees: [{ id: 'e1', firstName: 'רחל', lastName: 'לוי', idNum: '12345678', dept: "שיקום ה'", type: 'אח/ות מוסמכ/ת', scope: 75, degree: 'תואר שני', isPermanent: true, religion: 'יהודי', startDate: '2020-01-07', careSafety: { 2025: { checker: 'א', date: '30.10.24', score: '90' } }, conversations: { 2025: { h1: '01.03.25', h2: 'אוגוסט' } }, evalHistory: [{ year: 2025, value: 9 }], instrRec: { crane_training_done: true, blood_permission_expiry: '2026-05-05' }, isShiftResp: true, shiftValidUntil: '2026-11-25' }],
      managementWorkbook: { movements: { incoming: [{ date: '12.01.26', name: 'חדש', dept: 'x', role: 'אח' }], outgoing: [] } },
      security: { users: [{ id: 'u1', username: 'Admin', fullName: 'הנהלה', role: 'manager', permissions: ['*'], hash: 'ab', salt: 'cd', hashAlgo: 'pbkdf2' }] },
      tasks: [{ id: 't1' }],
    };
    const m = A.migrateLegacyState(old);
    const e = Object.values(m.employees)[0];
    assert.equal(e.name, 'לוי רחל'); assert.equal(e.idNum, '012345678'); assert.equal(e.scope, 0.75); assert.equal(e.degree, 'M.A'); assert.equal(e.contract, 'ק');
    assert.equal(e.safety[2025].date, '2024-10-30'); assert.equal(e.conv[2025].h2, 'אוגוסט'); assert.equal(e.trn.crane, A.CHECK); assert.equal(e.shift.validUntil, '2026-11-25');
    const u = Object.values(m.users)[0];
    assert.equal(u.username, 'admin'); assert.deepEqual(u.perms, ['*']); assert.equal(u.cred.hash, 'ab'); assert.equal(u.mustChange, false);
    assert.equal(Object.keys(m.movements).length, 1); assert.equal(m.legacy.tasks.length, 1);
  });
  await t('template asset contains no personal data', () => {
    const s = JSON.stringify(T);
    assert(!/(?<![$\-\w])\d{7,9}(?![\w\]])/.test(s));
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
