// ORDER 76 on this machine's Intel UHD 630 (the user's minimum target; the order names the laptop's UHD 620): the
// desktop app's Chromium (the bench Electron without the high-performance preference, force_low_power_gpu), a fresh
// profile, Quality Auto, Frame Rate as found then Unlimited if it was 30 (FPS60-AUTO §3, §7). Ten minutes of play with
// keys: Citadel's square and harbour, the chapter 2 depot fight, Zeelich. Every 30 s: the frame rate and the share of
// slow frames over the window (rAF intervals), Auto's profile; a picture whenever Auto reaches a new lowest rung; the
// pause menu between places (a commit point). At the end game.autoQ.report() and its log.
// usage: node fps76.mjs <OUT>
import { _electron as electron } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const ROOT = 'C:/Users/danka/dev/D.KGITHIB/lba3', PROFILE = OUT + '/profile-' + Date.now();
const logf = `${OUT}/fps76.log`; fs.writeFileSync(logf, '');
const log = (...a) => { const s = a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(logf, s + '\n'); };
const app = await electron.launch({ executablePath: 'C:/Users/danka/dev/lba3-bench/electron-uhd/electron.exe', args: ['--user-data-dir=' + PROFILE, 'C:/Users/danka/dev/lba3-bench/desktop-uhd'], timeout: 120000 });
let page = await app.firstWindow();
const ready = () => page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 400000 });
await ready();
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setFullScreen(false); w.setContentSize(1366, 768); w.center(); w.focus(); });
const ev = (f, a) => page.evaluate(f, a); const wait = (ms) => page.waitForTimeout(ms);
const key = async (k, ms = 80) => { await page.keyboard.down(k); await wait(ms); await page.keyboard.up(k); };
const held = new Set(); const hold = async (ks) => { for (const k of [...held]) if (!ks.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of ks) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
const settle = async () => { for (let i = 0; i < 60; i++) { if ((await ev(() => game.state)) === 'play') return; await key('KeyE'); await wait(350); } };
const gpu = await ev(() => { const g = game.renderer.renderer.getContext(); const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; });
log('GPU', gpu); log('found on arrival', await ev(() => ({ fps: game.settings.fps, quality: game.settings.quality, qualityAuto: game.settings.qualityAuto, version: game.version })));
const load = async (save) => {
  const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/campaign', save + '.save.json'), 'utf8'));
  await ev((items) => { for (const { name, value } of items) if (!/settings/i.test(name)) localStorage.setItem(name, value); }, st.origins[0].localStorage);
  await page.reload(); await ready(); await wait(800);
  await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 }); await wait(2000); await settle();
  await ev(() => { const G = game; if (G.settings.fps === '30') G.settings.fps = 'unlimited'; G.settings.qualityAuto = true; G.settings.controls = 'modern'; G.applySettings(); });
};
await load('base-03');
log('settings in play', await ev(() => ({ fps: game.settings.fps, quality: game.settings.quality, qualityAuto: game.settings.qualityAuto })));
// the frame meter: rAF intervals since the last read (installed again after each load: a load reloads the page)
const meter = () => ev(() => { if (window.FM) return; const M = window.FM = { iv: [], last: performance.now() }; const f = (t) => { M.iv.push(t - M.last); M.last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
await meter();
const RUNG = ['high', 'medium', 'medium-lean', 'low', 'low75', 'low65'];
const rungOf = (lbl) => { const p = String(lbl).toLowerCase().replace(/\s|%/g, ''); return Math.max(...RUNG.map((x, i) => (p === x ? i : -1))); };
let lowest = -1, n = 0;
const sample = async (where) => {
  const s = await ev(() => { const M = window.FM, iv = M.iv.splice(0); const sum = iv.reduce((a, b) => a + b, 0); const slow = iv.filter((d) => d > 20).length; const A = game.autoQ;
    const st = A?.state?.() || {}; return { fps: +(iv.length / (sum / 1000)).toFixed(1), slowPct: +(100 * slow / Math.max(1, iv.length)).toFixed(1), profile: st.label || st.profile || game.settings.quality, res: game.renderer?.resScale ?? null, st: Object.fromEntries(Object.entries(st).filter(([k, v]) => typeof v !== 'object').slice(0, 10)) }; });
  log(`[${where}]`, s);
  const p = String(s.profile).toLowerCase().replace(/\s|%/g, ''); const r = rungOf(s.profile);
  if (r > lowest) { lowest = r; await page.screenshot({ path: `${OUT}/rung-${String(n++).padStart(2, '0')}-${p}-${where}.jpg`, type: 'jpeg', quality: 88 }); }
};
const roam = async (ms, where) => { const t0 = Date.now(); let k = 0; while (Date.now() - t0 < ms) { const seq = [['KeyW', 2600], ['KeyD', 500], ['KeyW', 2200], ['KeyA', 700], ['KeyS', 1200], ['KeyW', 1800]][k++ % 6]; await hold([seq[0]]); await wait(seq[1]); await hold([]);
  if ((Date.now() - t0) % 30000 < 9000 && k % 3 === 0) await sample(where); await settle(); } await hold([]); };
const place = (x, z, a = 0) => ev(({ x, z, a }) => { const G = game, h = G.hero; if (G.room) G.exitRoom({ x, z, a }, true, true); h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; G.camRig.snap?.(); }, { x, z, a });
const pause = async () => { await key('Escape'); await wait(1500); await key('Escape'); await wait(800); };
// 1. Citadel's square (2.5 min)
await place(-42, -2, 0.6); await wait(2000); await sample('square-start'); await roam(150000, 'square');
await pause(); await sample('after-pause');
// 2. the harbour (2 min)
await place(-107, 37, -1.2); await wait(2000); await roam(120000, 'harbour'); await pause();
// 3. the chapter 2 depot fight (2.5 min): the watch turned on him, the ball thrown at what comes
await ev(() => { const G = game, Y = G.world.depot.yard, h = G.hero; const x = (Y.x0 + Y.x1) / 2, z = Y.z0 + 3; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.PI; G.camRig.snap?.();
  const W = [G.story.cur, ...(G.story.chapters || [])].map((c) => c?.watch).find((w) => w?.goHostile); W?.goHostile(); });
{ const t0 = Date.now(); while (Date.now() - t0 < 150000) { await ev(() => { game.hero.hp = Math.max(game.hero.hp, 5); }); await key('KeyL', 50); await key('KeyF', 70); await hold([['KeyA', 'KeyD'][Math.floor(Date.now() / 3000) % 2]]); await wait(700); await hold([]); if ((Date.now() - t0) % 30000 < 1000) await sample('depot'); await settle(); } }
await sample('depot-end'); await pause();
// 4. Zeelich (3 min)
await load('base-05'); await meter(); await wait(2000); await sample('zeelich-start'); await roam(180000, 'zeelich'); await sample('zeelich-end');
log('autoQ.report()', await ev(() => { try { return game.autoQ.report(); } catch (e) { return String(e); } }));
log('autoQ.log', await ev(() => (game.autoQ?.log || []).slice(-40)));
log('final settings', await ev(() => ({ fps: game.settings.fps, quality: game.settings.quality, qualityAuto: game.settings.qualityAuto })));
await app.close(); process.exit(0);
