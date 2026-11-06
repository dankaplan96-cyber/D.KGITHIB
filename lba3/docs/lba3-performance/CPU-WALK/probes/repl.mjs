// CPU-WALK: one booted game page kept open for many probe scripts (a boot is minutes on this loaded SwiftShader
// machine). Boots as run.mjs does (desktop on battery, Auto, `?autoq&nocine` + QUERY), then evaluates every file
// dropped into INBOX (default /dev/shm/cw/q) as a page script, writing its result to <name>.out next to it and
// deleting the script. `quit.js` ends it.
//   GAME_URL=http://localhost:8731/ TMPDIR=/dev/shm node repl.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const E = process.env, INBOX = E.INBOX || '/dev/shm/cw/q';
fs.mkdirSync(INBOX, { recursive: true });
const { browser, page } = await launch({ width: +(E.WIDTH || 1366), height: +(E.HEIGHT || 768) });
page.on('console', (m) => { if (/^(DBG|PROBE|WALKCHECK)/.test(m.text())) console.log(m.text()); });
page.on('pageerror', (e) => console.log('PAGEERROR ' + e.message));
await page.addInitScript((b) => { window.desktop = { onBattery: b, onPower() {} }; }, !E.PLUGGED);
const t0 = Date.now();
await open(page, '?autoq' + (E.QUERY ?? '&nocine'));
await page.waitForFunction(() => game.screen === 'title' && !game.preparing && !game.gfxHold, null, { timeout: 1800000, polling: 500 });
console.log(`PROBE title after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
fs.writeFileSync(INBOX + '/READY', String(Date.now()));
for (;;) {
  const f = fs.readdirSync(INBOX).filter((x) => x.endsWith('.js')).sort()[0];
  if (!f) { await new Promise((r) => setTimeout(r, 500)); continue; }
  const code = fs.readFileSync(INBOX + '/' + f, 'utf8'); fs.unlinkSync(INBOX + '/' + f);
  if (f === 'quit.js') break;
  const ts = Date.now();
  let out;
  try { const r = await page.evaluate(code); out = r && r.text ? r.text + '\n' + JSON.stringify({ ...r, text: undefined }) : typeof r === 'string' ? r : JSON.stringify(r, null, 1); }
  catch (e) { out = 'ERROR ' + e.message; }
  fs.writeFileSync(INBOX + '/' + f.replace(/\.js$/, '.out'), out + `\n(${((Date.now() - ts) / 1000).toFixed(1)} s)\n`);
  console.log(`PROBE done ${f} in ${((Date.now() - ts) / 1000).toFixed(1)} s`);
}
await browser.close();
