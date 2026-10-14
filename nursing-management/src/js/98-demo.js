'use strict';
// ════════════════════════════════════════════════════════════════
// Demo mode (node build.js --demo): opens without a login screen,
// with fictional sample data in a separate browser store.
// ════════════════════════════════════════════════════════════════

function demoData() {
  const db = emptyDB();
  db.settings.divisions = ['אגף גריאטריה', 'אגף שיקום'];
  const y = U.thisYear();
  db.settings.years = { safety: [y - 1, y], conversations: [y - 2, y - 1, y], evaluations: [y - 3, y - 2, y - 1, y] };
  const depts = [
    newDept("שיקום ה'", { division: 'אגף שיקום', mix: 'צעירים', beds: 30, headNurse: 'רחל לוי', deputy: 'דנה כהן', order: 0 }),
    newDept("גריאטריה ב'", { division: 'אגף גריאטריה', mix: 'סיעודי', beds: 36, headNurse: 'מיכל אברהם', deputy: 'יוסי מזרחי', order: 1 }),
  ];
  depts.forEach((d) => { db.depts[d.id] = d; });
  const first = ['רחל', 'דנה', 'מיכל', 'יוסי', 'נועה', 'שירה', 'אורית', 'דוד', 'טל', 'הילה', 'מרים', 'עדי', 'רונית', 'אליאור', 'סיון', 'גלית', 'נאוה', 'משה', 'ליאת', 'אנה', 'סאמר', 'רים', 'יעל', 'אבי'];
  const last = ['לוי', 'כהן', 'אברהם', 'מזרחי', 'פרץ', 'ביטון', 'דהן', 'אזולאי', 'פרידמן', 'שפירא', 'גולן', 'חדד', 'עמר', 'נגר', 'סלאמה', 'חורי', 'בן דוד', 'קליין'];
  const idFrom = (n) => { const b = String(20000000 + n * 7919).slice(0, 8); let s = 0; for (let i = 0; i < 8; i++) { let x = Number(b[i]) * ((i % 2) + 1); if (x > 9) x -= 9; s += x; } return b + ((10 - (s % 10)) % 10); };
  const iso = (yy, m, d) => `${yy}-${U.pad2(m)}-${U.pad2(d)}`;
  const roles = ['rn', 'rn', 'rn', 'rn', 'rn', 'rn', 'rn', 'lpn', 'lpn', 'student', 'aux', 'aux', 'aux'];
  let n = 0;
  depts.forEach((d, di) => {
    roles.forEach((role, i) => {
      n++;
      const r = (k) => (n * 31 + k * 17) % 100;
      const e = newEmployee({
        name: `${last[(n * 5) % last.length]} ${first[(n * 7) % first.length]}`, idNum: idFrom(n), deptId: d.id, role, order: i,
        gender: r(1) < 15 ? 'ז' : 'נ', regNum: role === 'rn' || role === 'lpn' ? String(230000 + n * 137) : '',
        scope: role === 'student' ? 0.38 : [1, 1, 1, 0.75, 0.66, 0.5][r(2) % 6], degree: role === 'rn' ? (r(3) < 25 ? 'M.A' : 'B.A') : '',
        advCourse: role === 'rn' && r(4) < 60 ? (di === 0 ? 'שיקום' : 'גריאטריה') : '', clinical: role === 'rn' && r(5) < 20 ? 'הדרכה קלינית' : '',
        birthYear: 1965 + (r(6) % 38), contract: r(7) < 30 ? 'ק' : r(7) < 38 ? 'כ"א' : 'ח', sector: r(8) < 25 ? 'ע' : 'י',
        startDate: iso(2008 + (r(9) % 17), 1 + (r(10) % 12), 1 + (r(11) % 27)),
        title: i === 0 ? 'ראש צוות' : '', status: i === 4 ? 'maternity' : 'active',
      });
      const done = (k) => r(k) < 70;
      if (done(12)) e.safety[y - 1] = { checker: 'אחראית הדרכה', date: iso(y - 1, 3 + (r(13) % 8), 5 + (r(14) % 20)), score: 80 + (r(15) % 21) };
      if (done(16) && r(16) < 45) e.safety[y] = { checker: 'אחראית הדרכה', date: iso(y, 2 + (r(17) % 6), 3 + (r(18) % 20)), score: 82 + (r(19) % 18) };
      e.conv[y - 1] = { h1: iso(y - 1, 2 + (r(20) % 4), 10), h2: done(21) ? iso(y - 1, 9 + (r(22) % 3), 12) : '' };
      if (done(23)) e.conv[y] = { h1: iso(y, 3 + (r(24) % 3), 15), h2: '' };
      e.evals[y - 2] = 7 + (r(25) % 4); e.evals[y - 1] = 7 + (r(26) % 4);
      if (ROLES[role].nurse) {
        e.trn = { cpr: r(27) < 50 ? 'ACLS ע.ב' : 'BLS', crane: CHECK, onboardDone: CHECK, [`proc${Math.min(y - 1, 2026)}`]: CHECK };
        if (done(28)) e.trn.core2024 = CHECK;
        if (r(29) < 40) e.trn.cGeriatric = iso(y - 2, 5, 1);
        if (r(30) < 50) e.trn.pCannula = CHECK;
        e.trn.pBlood = iso(y + (r(31) < 25 ? -1 : r(31) < 40 ? 0 : 1), 1 + (r(32) % 12), 15);
        if (role === 'rn' && r(33) < 55) e.shift = { active: true, course: '', appoint: iso(y - 2, 5, 9), evalDate: iso(y - 1, 11, 25), renew: iso(y - 1, 11, 25), validUntil: iso(y + (r(34) < 30 ? -1 : 0), 1 + (r(35) % 12), 20), performs: r(36) < 50 ? 'ערב ולילה' : 'בוקר' };
      }
      db.employees[e.id] = normalizeEmployee(e);
    });
    db.staffing[d.id] = { rows: { rn: { moh: 12, reqShifts: 42, approvedShifts: 38 }, lpn: { approvedShifts: 9 }, student: { approvedShifts: 6 }, aux: { approvedShifts: 23 } } };
  });
  const m = new Date().getMonth() + 1;
  [['in', 3, 'שגיא נחום', "שיקום ה'", 'אח', ''], ['in', 8, 'לינוי ברק', "גריאטריה ב'", 'אחות', ''], ['out', 5, 'אסתר גבאי', "גריאטריה ב'", 'אחות', 'התפטרות'], ['out', 12, 'ניר אלון', "שיקום ה'", 'כוח עזר', 'סיום חוזה']].forEach(([kind, day, name, dept, role, reason], i) => {
    const id = `mov_demo${i}`;
    db.movements[id] = { id, kind, date: iso(y, m, day), name, dept, role, reason, col1: '', col2: '' };
  });
  return normalizeDB(db);
}

async function startDemo() {
  let u = Object.values(db().users).find((x) => x.username === 'demo');
  if (!u) {
    const data = demoData();
    u = { id: 'usr_demo', username: 'demo', displayName: 'הנהלת הסיעוד (הדגמה)', role: 'admin', perms: ['*'], depts: [], cred: null, active: true, mustChange: false, createdAt: U.nowISO(), lastLogin: U.nowISO() };
    data.users[u.id] = u;
    Store.db = data;
    Store.user = u;
    Store.update(() => {}, ['הדגמה', 'נטענו נתוני הדגמה']);
  }
  startSession(db().users[u.id]);
}
ACT.demoreset = async () => {
  if (!(await confirmBox('איפוס נתוני ההדגמה', 'כל השינויים שנעשו בהדגמה יימחקו ויוחזרו נתוני הדוגמה.', { ok: 'איפוס' }))) return;
  const keep = db().users.usr_demo;
  const data = demoData();
  data.users[keep.id] = keep;
  Store.db = data;
  Store.update(() => {}, ['הדגמה', 'אופסו נתוני ההדגמה']);
  render();
  toast('נתוני ההדגמה אופסו', 'ok');
};
