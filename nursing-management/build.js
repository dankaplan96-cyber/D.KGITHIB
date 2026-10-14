// Builds the single-file application: dist/מערכת_ניהול_סיעוד.html
// Usage: node build.js
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const jsFiles = fs.readdirSync(path.join(root, 'src/js')).filter((f) => f.endsWith('.js')).sort();
const app = jsFiles.map((f) => `// ── ${f} ──\n${read(`src/js/${f}`)}`).join('\n\n');
const template = JSON.parse(read('assets/report-template.json'));
const LS = new RegExp(String.fromCharCode(0x2028), 'g'), PS = new RegExp(String.fromCharCode(0x2029), 'g');
const templateJs = `const REPORT_TEMPLATE = ${JSON.stringify(template).replace(LS, '\\u2028').replace(PS, '\\u2029')};`;

let html = read('src/index.html');
const parts = { '/*__CSS__*/': read('src/app.css'), '/*__EXCELJS__*/': read('vendor/exceljs.min.js'), '/*__TEMPLATE__*/': templateJs, '/*__APP__*/': `(function(){\n${app}\n})();` };
for (const [k, v] of Object.entries(parts)) {
  if (!html.includes(k)) throw new Error(`placeholder ${k} missing`);
  html = html.split(k).join(k === '/*__CSS__*/' ? v : safe(v));
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
// --trial: TRIAL file — sample data + known users (listed on the login screen) + a users/passwords sheet
const TRIAL_USERS = [
  { username: 'admin', password: 'Nihul2026!', displayName: 'הנהלת הסיעוד', role: 'admin', what: 'מנהל/ת מערכת — הכל, כולל משתמשים והגדרות' },
  { username: 'admin2', password: 'Siud2026!', displayName: 'מנהל/ת נוסף/ת', role: 'admin', what: 'מנהל/ת מערכת נוסף/ת (גיבוי)' },
  { username: 'editor', password: 'Orech2026!', displayName: 'עריכה שוטפת', role: 'editor', what: 'עובדים, גיליונות, נכנסים/עוזבים, דוחות — בלי משתמשים והגדרות' },
  { username: 'viewer', password: 'Tzofe2026!', displayName: 'צפייה בלבד', role: 'viewer', what: 'צפייה והפקת דוחות, ללא עריכה' },
  { username: 'ward5', password: 'Machlaka2026!', displayName: "אחראית שיקום ה'", role: 'editor', dept: "שיקום ה'", what: "עריכה שוטפת — רק מחלקת שיקום ה'" },
];
if (process.argv.includes('--trial')) {
  const trialOut = path.join(root, 'dist', 'מערכת_ניהול_סיעוד_ניסיון.html');
  const users = TRIAL_USERS.map(({ what, ...u }) => u);
  fs.writeFileSync(trialOut, html.replace('<body>', `<body>\n<script>window.__NM_TRIAL_USERS__=${JSON.stringify(users)};</script>`).replace('<title>מערכת ניהול סיעוד</title>', '<title>מערכת ניהול סיעוד — ניסיון</title>'));
  console.log(`built TRIAL file ${path.relative(root, trialOut)}`);
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('משתמשים וסיסמאות', { views: [{ rightToLeft: true }] });
  ws.columns = [{ header: 'שם משתמש', width: 14 }, { header: 'סיסמה', width: 18 }, { header: 'שם לתצוגה', width: 22 }, { header: 'מה מותר', width: 60 }];
  TRIAL_USERS.forEach((u) => ws.addRow([u.username, u.password, u.displayName, u.what]));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  ws.eachRow((r) => { r.height = 22; r.alignment = { vertical: 'middle', readingOrder: 'rtl' }; });
  ws.addRow([]);
  ws.addRow(['שימו לב: משתמשים אלה קיימים רק בקובץ הניסיון. בכל פתיחה של קובץ הניסיון הסיסמאות חוזרות לרשימה זו והנעילות מתאפסות.']);
  wb.xlsx.writeFile(path.join(root, 'dist', 'משתמשים_וסיסמאות_ניסיון.xlsx')).then(() => { console.log('built users/passwords sheet'); process.exit(0); });
  return;
}
// --demo: separate DEMO file (no login screen, sample data, separate storage)
if (process.argv.includes('--demo')) {
  const demoOut = path.join(root, 'dist', 'מערכת_ניהול_סיעוד_הדגמה.html');
  fs.writeFileSync(demoOut, html.replace('<body>', '<body>\n<script>window.__NM_DEMO__=true;</script>').replace('<title>מערכת ניהול סיעוד</title>', '<title>מערכת ניהול סיעוד — הדגמה</title>'));
  console.log(`built DEMO file ${path.relative(root, demoOut)}`);
  process.exit(0);
}
// --test-admin <username> <password>: separate TEST file that creates a known admin account
const ti = process.argv.indexOf('--test-admin');
if (ti > 0) {
  const [username, password] = process.argv.slice(ti + 1, ti + 3);
  if (!username || !password) throw new Error('usage: node build.js --test-admin <username> <password>');
  const seed = `<script>window.__NM_SEED_ADMIN__=${JSON.stringify({ username, password, displayName: 'מנהל ניסיון' })};</script>`;
  const testOut = path.join(root, 'dist-test', 'מערכת_ניהול_סיעוד_ניסיון.html');
  fs.mkdirSync(path.dirname(testOut), { recursive: true });
  fs.writeFileSync(testOut, html.replace('<body>', `<body>\n${seed}`));
  console.log(`built TEST file ${path.relative(root, testOut)} with admin "${username}"`);
  process.exit(0);
}
const out = path.join(root, 'dist', 'מערכת_ניהול_סיעוד.html');
fs.writeFileSync(out, html);
console.log(`built ${path.relative(root, out)} — ${(html.length / 1024).toFixed(0)} KB, ${jsFiles.length} modules`);
