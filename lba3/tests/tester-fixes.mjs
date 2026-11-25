// TESTER-FIXES (docs/lba-maturity/TESTER-FIXES.md; the desktop's INSTALL-69 and 68.1/68.3 on the 0.50.0 build). One suite for
// the fixes that have no suite of their own (P115 is tests/interact-pick.mjs F, P116 tests/overhead-remarks.mjs A13/A15, the
// depot's guard tests/depot.mjs + the fight probe in the doc). Automated runtime only (headless Chromium, SwiftShader).
//   A  the pause menu: no Benchmark buttons for players (not shown, not a stop for the arrows); with ?bench they are there
//   B  Quit Game (the desktop app, its bridge stood in by a test double): the title's buttons are never on the page under the
//      loading screen; one click the moment Quit Game is shown quits, once
//   C  the throw plates (the Core's pylons, base-15): on a plate, lined up by it, a Modern throw with the mouse pointing
//      elsewhere goes along the plate's line and converts its pylon (before: along the mouse); Classic the same; off the
//      plate the mouse aims as ever; the plate's hint names the arrow
//   D  the see-through silhouette: off while a talk's shot is up, back in play
// Pictures: captures/tester-fixes/ (SHOTS=0 none). SERVE=1: this checkout's files without an http.server.
import { launch, open, menu, checker, URL0 } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const OUT = fileURLToPath(new URL('../captures/tester-fixes/', import.meta.url));
const ORIGIN = new URL(URL0).origin;
const SHOTS = process.env.SHOTS !== '0';
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
let browser, page, context;
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { if (!SHOTS) return; try { await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 82, timeout: 240000 }); console.log('capture ' + n); } catch (e) { console.log('capture FAILED ' + n + ': ' + e.message.split('\n')[0]); } };
const save = (name) => { const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8')); for (const o of j.origins || []) o.origin = ORIGIN; return j; };

// ---------------------------------------------------------------- A. the pause menu's Benchmark buttons
({ browser, page } = await launch({ width: 1366, height: 768 }));
await open(page, '?nocine');
await menu(page, 'new');
const pauseLook = () => ev(() => {
  const G = game; P.settle(); G.pause(); G.step(0.1);
  const tools = [...document.querySelectorAll('#pause [data-act^="bench"]')];
  const out = { screen: G.screen, shown: tools.filter((b) => b.offsetParent !== null).map((b) => b.dataset.act), stops: G.menuButtons().map((b) => b.dataset.act), dev: document.body.classList.contains('dev') };
  G.act('resume'); return out;
});
let r = await pauseLook();
check('A1 the pause menu (no flag): no Benchmark button shown, none among the arrows\' stops; Resume … Save & Quit as before', r.screen === 'pause' && r.shown.length === 0 && !r.stops.some((a) => /^bench/.test(a)) && r.stops[0] === 'resume' && r.stops.includes('quit'), r);
await shot('a-pause-player');
await browser.close();
({ browser, page } = await launch({ width: 1366, height: 768 }));
await open(page, '?nocine&bench');
await menu(page, 'new');
r = await pauseLook();
check('A2 with ?bench: the three Benchmark buttons shown and reachable by the arrows (the tools unchanged)', r.dev && r.shown.length === 3 && ['bench', 'benchauto', 'benchfps'].every((a) => r.stops.includes(a)) && (await ev(() => typeof game.bench?.run === 'function' && typeof game.bench?.runPacing === 'function')), r);
await shot('a-pause-bench-flag');
await browser.close();

// ---------------------------------------------------------------- B. Quit Game, clicked the moment it is shown
({ browser, context, page } = await launch({ width: 1366, height: 768 }));
await context.addInitScript(() => { window.__quits = 0; window.desktop = { quit: () => { window.__quits++; }, fullscreen: () => {}, platform: 'win32', dev: false }; });
await page.goto(URL0 + '?nocine', { waitUntil: 'commit', timeout: 180000 });
const seen = { underLoading: 0, polls: 0 };
let clicked = null;
for (let i = 0; i < 6000 && !clicked; i++) {
  const s = await page.evaluate(() => {
    const L = document.querySelector('#loading'), loading = !!L && !L.classList.contains('hidden');
    const vis = [...document.querySelectorAll('#title .menu button')].filter((b) => b.offsetParent !== null).map((b) => b.dataset.act);
    const q = document.querySelector('[data-act="exitapp"]');
    return { loading, vis, quit: !!q && q.offsetParent !== null };
  }).catch(() => null);
  if (!s) { await page.waitForTimeout(50); continue; }
  seen.polls++;
  if (s.loading && s.vis.length) seen.underLoading++;
  if (s.quit) { await page.click('[data-act="exitapp"]', { timeout: 5000 }); clicked = s; break; }
  await page.waitForTimeout(40);
}
await page.waitForTimeout(300);
r = { ...seen, clicked, quits: await ev(() => window.__quits), screen: await ev(() => window.game?.screen) };
check('B1 the title\'s buttons are never on the page while the loading screen is up (they were: the desktop\'s player saw them and clicked too early)', seen.polls > 3 && seen.underLoading === 0, r);
check('B2 one click on Quit Game the moment it is shown quits, once (the desktop: "a second later one click works")', !!clicked && r.quits === 1 && r.screen === 'title', r);
await browser.close();

// ---------------------------------------------------------------- C. the throw plates (the Core, base-15)
async function bootCore() {
  ({ browser, page } = await launch({ width: 1366, height: 768, storageState: save('base-15') }));
  await open(page, '?nocine'); await menu(page, 'continue');
  await ev(() => {
    P.settle();
    window.TP = {
      plate: () => game.story.cur.plates()[0],
      target: (i) => game.room.ballTargets.find((x) => x.pylon === i),
      // stand on the plate, still: it centres him and turns him to its line (chapter3.js); the mouse (Modern) pointed at
      // the screen's top-left corner, far off the plate's line; then the ball key, as a player
      throwFrom(scheme, { mouse = true, plateOff = false } = {}) {
        const G = game, h = G.hero, I = G.input, p = TP.plate(), tg = TP.target(p.i);
        G.settings.controls = scheme; G.applySettings();
        const x = p.x + (plateOff ? 2.2 : 0), z = p.z;
        h.pos.set(x, G.physics.groundAt(x, z, h.pos.y + 2), z); h.angle = p.a + (plateOff ? 0.5 : 0.35); h.vel?.set?.(0, 0); h.hp = h.maxHp; h.invuln = 5;
        G.step(0.8);
        if (mouse) { const M = I.mouse; M.inside = true; M.x = 40; M.y = 40; M.lastMove = performance.now(); I.lastDevice = 'kbd'; }
        G.ball.state = 'idle';
        const aim = h.combat.aimDir(null), lined = Math.abs(Math.atan2(Math.sin(h.angle - p.a), Math.cos(h.angle - p.a)));
        const ma = G.mouseAim?.(), mouseA = ma ? Math.atan2(ma.x - h.pos.x, ma.z - h.pos.z) : null;
        P.tap('KeyF', 0.05);
        let launchA = null;
        for (let t = 0; t < 2.2; t += 1 / 30) { G.step(1 / 30); const b = G.ball; if (launchA == null && b.state === 'fly' && b.vel) launchA = Math.atan2(b.vel.x, b.vel.z); if (tg.done) break; }
        const d = (a) => (a == null ? null : +Math.abs(Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a))).toFixed(3));
        return { scheme, onPlate: !plateOff, lined: +lined.toFixed(3), aimSrc: aim.src, aimOff: d(Math.atan2(aim.x, aim.z)), mouseOff: d(mouseA), launchOff: d(launchA), converted: !!tg.done };
      },
    };
  });
}
await bootCore();
const before = await ev(() => { const keep = game.aimPlate; game.aimPlate = () => null; const o = TP.throwFrom('modern'); game.aimPlate = keep; return o; });
const off = await ev(() => TP.throwFrom('modern', { plateOff: true }));
const modern = await ev(() => TP.throwFrom('modern'));
await shot('c-core-plate-modern');
const hint = await ev(async () => (await import('./src/game/i18n.js')).t('c3_toast_fight'));
await browser.close();
await bootCore();
const classic = await ev(() => TP.throwFrom('classic', { mouse: false }));
await browser.close();
console.log('C before (Modern, the plate rule off):', JSON.stringify(before));
check('C1 Modern on the Core\'s first plate, the mouse pointing elsewhere: the throw goes along the plate\'s line (within 0.05 rad) and converts its pylon (before: along the mouse, no pylon)', modern.lined < 0.03 && modern.aimOff < 0.05 && modern.converted && !before.converted && before.aimSrc === 'mouse', { before, modern });
check('C2 Classic on the same plate (a fresh boot): along the plate\'s line, the pylon converted', classic.lined < 0.03 && classic.aimOff < 0.05 && classic.converted, classic);
check('C3 off the plate (2.2 m aside) the Modern mouse aims as ever', off.aimSrc === 'mouse' && !off.onPlate, off);
check('C4 the plate\'s hint says how: stand still, throw, the ball goes along its arrow', /still/.test(hint) && /arrow/.test(hint), hint);

// ---------------------------------------------------------------- D. the silhouette in a talk's shot
({ browser, page } = await launch({ width: 1366, height: 768 }));
await open(page, '?nocine');
await menu(page, 'new');
r = await ev(() => {
  const G = game, h = G.hero, sm = h.rig.silhouette?.material, z = G.npcs.find((n) => n.def.id === 'zoe' && n.present);
  P.settle(); G.step(0.2);
  const play0 = sm?.visible;
  // Zoé spoken to by the key, as a player: in front of her, facing her
  const a = z.angle, x = z.pos.x + Math.sin(a) * 1.3, zz = z.pos.z + Math.cos(a) * 1.3;
  h.pos.set(x, G.physics.groundAt(x, zz, z.pos.y + 1), zz); h.angle = Math.atan2(z.pos.x - x, z.pos.z - zz); h.onGround = true; G.step(0.4);
  P.tap('KeyW', 0.1); G.step(0.6);
  const talk = { state: G.state, sil: sm?.visible };
  return { has: !!sm, play0, talk };
});
await shot('d-talk-shot-no-silhouette');
const back = await ev(() => { P.settle(); game.step(0.3); return { state: game.state, sil: game.hero.rig.silhouette?.material.visible }; });
check('D1 the see-through silhouette is off while a talk\'s shot is up (Zoé spoken to by the key) and back on in play', r.has && r.play0 === true && r.talk.state === 'dialog' && r.talk.sil === false && back.state === 'play' && back.sil === true, { ...r, back });
await browser.close();
process.exit(done());
