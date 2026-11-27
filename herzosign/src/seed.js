'use strict';
// אתחול נתונים: מחלקות, תבניות, משתמש מנהל מערכת ומשתמשי הדגמה.
const fs = require('node:fs');
const { hashPassword } = require('./auth');
const { templates } = require('./templates-seed');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Herzog2026';

const DEPARTMENTS = [
  'גריאטריה א׳', 'גריאטריה ב׳', 'סיעודי מורכב', 'שיקום', 'פסיכוגריאטריה',
  'משאבי אנוש', 'הדרכה וחינוך', 'הנהלת הסיעוד',
];

const DEMO_USERS = [
  { employee_no: '1000', full_name: 'מנהל/ת מערכת', role: 'admin', job_title: 'מערכות מידע', dept: 'הנהלת הסיעוד' },
  { employee_no: '2001', full_name: 'רחל לוי', role: 'manager', job_title: 'אחות אחראית', dept: 'גריאטריה א׳' },
  { employee_no: '2002', full_name: 'יוסי מזרחי', role: 'manager', job_title: 'אח אחראי', dept: 'שיקום' },
  { employee_no: '3001', full_name: 'מיכל כהן', role: 'hr', job_title: 'רכזת משאבי אנוש', dept: 'משאבי אנוש' },
  { employee_no: '4001', full_name: 'דנה אברהם', role: 'education', job_title: 'אחות אחראית הדרכה', dept: 'הדרכה וחינוך' },
  { employee_no: '5001', full_name: 'נועה פרץ', role: 'employee', job_title: 'אחות', dept: 'גריאטריה א׳' },
  { employee_no: '5002', full_name: 'אמיר חדד', role: 'employee', job_title: 'סטודנט/ית', dept: 'גריאטריה א׳' },
  { employee_no: '5003', full_name: 'סבטלנה איבנוב', role: 'employee', job_title: 'כוח עזר', dept: 'גריאטריה א׳' },
  { employee_no: '5004', full_name: 'מוחמד עודה', role: 'employee', job_title: 'אח', dept: 'שיקום' },
];

function upsertTemplates(db) {
  const find = db.prepare('SELECT id FROM templates WHERE code = ?');
  const ins = db.prepare(`INSERT INTO templates (code, title, category, description, document_text, fields, workflow, audience)
                          VALUES (?,?,?,?,?,?,?,?)`);
  for (const t of templates) {
    if (find.get(t.code)) continue;
    ins.run(t.code, t.title, t.category, t.description || null, t.document_text || null,
      JSON.stringify(t.fields), JSON.stringify(t.workflow), t.audience || null);
  }
}

function seed(db, { demo = process.env.SEED_DEMO !== '0' } = {}) {
  const hasUsers = db.prepare('SELECT COUNT(*) c FROM users').get().c > 0;
  upsertTemplates(db);
  if (hasUsers) return;

  const insDept = db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)');
  for (const d of DEPARTMENTS) insDept.run(d);
  const deptId = (name) => db.prepare('SELECT id FROM departments WHERE name = ?').get(name)?.id ?? null;

  const insUser = db.prepare(`INSERT INTO users (employee_no, full_name, password_hash, role, job_title, department_id, must_change_password)
                              VALUES (?,?,?,?,?,?,?)`);
  const users = demo ? DEMO_USERS : [DEMO_USERS[0]];
  const pwHash = hashPassword(process.env.ADMIN_PASSWORD && !demo ? process.env.ADMIN_PASSWORD : DEMO_PASSWORD);
  for (const u of users) {
    insUser.run(u.employee_no, u.full_name, pwHash, u.role, u.job_title, deptId(u.dept), demo ? 0 : 1);
  }
  // שיוך מנהלי מחלקות
  const setMgr = db.prepare('UPDATE departments SET manager_id = (SELECT id FROM users WHERE employee_no = ?) WHERE name = ?');
  if (demo) {
    setMgr.run('2001', 'גריאטריה א׳');
    setMgr.run('2002', 'שיקום');
    setMgr.run('3001', 'משאבי אנוש');
    setMgr.run('4001', 'הדרכה וחינוך');
  }
  setMgr.run('1000', 'הנהלת הסיעוד');
}

module.exports = { seed, DEMO_PASSWORD };

if (require.main === module) {
  const { open, DB_PATH } = require('./db');
  if (process.argv.includes('--reset')) {
    for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
    console.log('Database removed:', DB_PATH);
  }
  const db = open();
  seed(db);
  console.log('Seed complete.');
}
