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
