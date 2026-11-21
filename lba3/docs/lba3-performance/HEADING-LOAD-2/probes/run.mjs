// HEADING-LOAD probe runner (ROTATE-STALL's; a result's __images { name: dataURL } are written as PNG to OUTDIR)
// ROTATE-STALL probe runner (PERF-BATTERY-2's, with WIDTH / HEIGHT for the window): boots the game at a preset (Q=low|medium|high), with the battery profile on or off
// (BATTERY=1|0), the benchmark's areas built, then evaluates a page script (argv[2]) and prints what it returns.
// PROFILE=1: a CPU profile (Chrome DevTools protocol) around the script; self time per function is printed (TOP=40).
//   GAME_URL=http://localhost:8187/ TMPDIR=/dev/shm Q=medium BATTERY=1 node run.mjs q_lamps.js
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const { browser, page } = await launch({ width: +(process.env.WIDTH || 1366), height: +(process.env.HEIGHT || 768) });
await page.addInitScript((q) => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); } catch {} }, process.env.Q || 'medium');
page.on('console', (m) => { if (/^(DBG|PROBE)/.test(m.text())) console.log(m.text()); });
// (DESKTOP_BATTERY=1: started on battery as the desktop app reports it, before the first shader is compiled)
if (process.env.DESKTOP_BATTERY) await page.addInitScript((b) => { window.desktop = { onBattery: b === '1', onPower() {} }; }, process.env.DESKTOP_BATTERY);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
if (!process.env.NOPREP) await ev(() => game.bench.prepareAreas());   // (NOPREP=1: the benchmark's areas left unbuilt, its preparation then part of the script)
// (the preset by hand: the stored settings' migration turns Quality Auto on, which picks High under webdriver)
await ev(([q, auto]) => {
  if (auto) { const A = game.autoQ, p = { high: 0, medium: 1 }[q] ?? 1; game.settings.qualityAuto = true; A.gov.setProfile(p, 'probe: Auto at this profile', { phase: 'hold', commitNow: true, t: 0 }); A.applyAll(); game.applySettings(); game.warmGraphics(); }
  else { game.settings.qualityAuto = false; game.settings.quality = q; game.applySettings(); }
}, [process.env.Q || 'medium', process.env.AUTO === '1']);   // (AUTO=1: Quality Auto held at that profile, as the laptop plays it: Auto keeps High's shadow cells)
await ev(async (b) => { if (b != null) game.setBattery(b === '1'); game.warmGraphics?.(); for (let i = 0; i < 200 && game.gfxHold; i++) await new Promise((r) => setTimeout(r, 50)); }, process.env.BATTERY ?? null);
for (const [k, v] of Object.entries(process.env)) if (k.startsWith('W_')) await ev(([k, v]) => { window[k.slice(2)] = v; }, [k, v]);
const code = fs.readFileSync(process.argv[2], 'utf8');
let cdp = null;
if (process.env.PROFILE) { cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
const r = await ev(code);
if (cdp) {
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dts = profile.timeDeltas; let tot = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byId.get(profile.samples[i]), cf = n.callFrame, dt = (dts[i] || 0) / 1000;
    const k = `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*\/(src|vendor)\//, '$1/')}:${cf.lineNumber + 1}`;
    self.set(k, (self.get(k) || 0) + dt); tot += dt;
  }
  // inclusive time per function (each sample's stack counted once per distinct function)
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const dt = (dts[i] || 0) / 1000, seen = new Set();
    for (let id = profile.samples[i]; id != null; id = parent.get(id)) { const cf = byId.get(id).callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*\/(src|vendor)\//, '$1/')}:${cf.lineNumber + 1}`; if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + dt); } }
  }
  const top = +(process.env.TOP || 40);
  console.log(`\nPROFILE total ${tot.toFixed(0)} ms sampled\n-- self --`);
  for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${v.toFixed(1).padStart(9)} ms ${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`);
  console.log('-- inclusive --');
  for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${v.toFixed(1).padStart(9)} ms ${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`);
}
if (r && r.__images) { const dir = process.env.OUTDIR || '.'; fs.mkdirSync(dir, { recursive: true }); for (const [k, v] of Object.entries(r.__images)) fs.writeFileSync(dir + '/' + k + '.png', Buffer.from(v.split(',')[1], 'base64')); delete r.__images; }
if (r && r.text) { console.log(r.text); delete r.text; if (process.env.JSONOUT) fs.writeFileSync(process.env.JSONOUT, JSON.stringify(r)); }
else console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await browser.close();
