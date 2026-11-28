// TITLE-LOAD probe runner: boots the game to its title screen as the laptop starts it — the desktop app on battery
// (window.desktop.onBattery before the first shader), Quality Auto's first start on battery (Medium; `?autoq` lets Auto
// run under webdriver) — waits for the title, freezes the game's clock, then evaluates a page script (argv[2]) and
// prints what it returns. A result's __images { name: dataURL } are written as PNG to OUTDIR; `text` is printed and the
// rest written to JSONOUT. W_<name>=v sets window.<name> before the script.
//   GAME_URL=http://localhost:8637/ TMPDIR=/dev/shm node run.mjs q_title.js
//   PLUGGED=1: started plugged in (Auto: High).  QUERY='&x': more URL switches.
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const E = process.env;
const { browser, page } = await launch({ width: +(E.WIDTH || 1366), height: +(E.HEIGHT || 768) });
page.on('console', (m) => { if (/^(DBG|PROBE)/.test(m.text())) console.log(m.text()); });
await page.addInitScript((b) => { window.desktop = { onBattery: b, onPower() {} }; }, !E.PLUGGED);
for (const [k, v] of Object.entries(E)) if (k.startsWith('W_')) await page.addInitScript(([k, v]) => { window[k.slice(2)] = v; }, [k, v]);
await open(page, '?autoq' + (E.QUERY || ''));
await page.waitForFunction(() => game.screen === 'title' && !game.preparing && !game.gfxHold, null, { timeout: 900000, polling: 500 });
const code = fs.readFileSync(process.argv[2], 'utf8');
const r = await page.evaluate(code);
if (r && r.__images) { const dir = E.OUTDIR || '.'; fs.mkdirSync(dir, { recursive: true }); for (const [k, v] of Object.entries(r.__images)) fs.writeFileSync(dir + '/' + k + '.png', Buffer.from(v.split(',')[1], 'base64')); delete r.__images; }
if (r && r.text) { console.log(r.text); delete r.text; if (E.JSONOUT) fs.writeFileSync(E.JSONOUT, JSON.stringify(r)); }
else console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
if (E.SHOT) await page.screenshot({ path: E.SHOT });
await browser.close();
