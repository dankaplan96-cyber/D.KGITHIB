// #18 / #28: play-camera pictures of chapter 7's vent seal, the discs (the game as it is) beside the new stage
// (?ch7stage=new, "the mountain's pulse"). Staged through the story's flags to the telescope's turn, the drone shot down by
// the ball, then the same spot by the seal for both. Automated runtime only (SwiftShader, headless Chromium).
//   SERVE=1 node tools/ch7-stage-shots.mjs [outdir]     (default captures/ch7-stage), then python3 tools/ch7-stage-sheet.py
import { launch } from '../tests/lib/boot.mjs';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2] || new URL('../captures/ch7-stage/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const URL0 = process.env.GAME_URL || 'http://localhost:8123/';
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
// (the toasts and the tips panel hidden: they belong to the staging, not to the stage)
const shot = async (n) => { await page.addStyleTag({ content: '#toast, #tip, #tiparrow { display: none !important; }' }); await ev(() => game.renderer.render()); await page.screenshot({ path: OUT + n, timeout: 180000 }); console.log('wrote', n); };

for (const mode of ['old', 'new']) {
  if (mode === 'new') await ev(() => localStorage.clear());   // (a fresh New Game, no "replace the autosave?" question)
  await page.goto(URL0 + '?nocine' + (mode === 'new' ? '&ch7stage=new' : ''), { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  await ev(() => { game.testFreeze = true; });
  await page.click('[data-act="new"]', { timeout: 180000 });
  await ev(() => {
    const G = window.game; G.testFreeze = true;
    const talkAll = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
    const tp = (x, z, a = 0) => { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); };
    talkAll();
    Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 5, chapterKey: 'pass', c6_started: true, c6_bridge: true, c6_heat: true, c6_thawed: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true });
    G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); talkAll();
    Object.assign(G.flags, { rf_roof: true, c7_keeper: true, c7_ice: true, c7_lit: true, c7_sendell: true, ob_snow: true, ob_follow: true, ob_dir: true, c7_scope: true });
    G.story.applyFlags(); G.story.refreshCast(); G.updateObjective(); G.step(0.5); talkAll();
    const V = G.rooms.hamalayi.vent, h = G.hero, d = G.story.cur.heavy();
    tp(V.x + 8, V.z + 8); G.step(1); talkAll();
    for (let i = 0; i < 40 && d.alive; i++) { h.pos.set(d.pos.x - 3.5, G.physics.groundAt(d.pos.x - 3.5, d.pos.z), d.pos.z); h.angle = h.angleTo(d); h.hp = h.maxHp; G.ball.state = 'idle'; G.input.taps.add('KeyF'); G.step(1 / 60); G.step(1.0); if (G.state === 'dialog') talkAll(); }
    G.step(0.5); talkAll();
    // the same spot for both: on the descent's side of the seal, 5.5 m out, facing it
    const a = Math.atan2(16, -10) + 0.4;
    window.SPOT = () => { tp(V.x + Math.sin(a) * 5.5, V.z + Math.cos(a) * 5.5, a + Math.PI); G.step(1.2); };
    window.SPOT();
  });
  if (mode === 'old') { await shot('old-1-discs.png'); continue; }
  await shot('new-1-ring.png');
  // a kick: the snow jumping along the live groove (just after the third kick of a pulse)
  // (the same spot, then one beside the live groove: the kick seen from the seal's other side)
  const kick = (at) => ev((at) => { const G = game, L = G.rooms.hamalayi.line; let p = L.phase(); for (let i = 0; i < 400; i++) { G.step(0.05); const q = L.phase(); if (q < p) break; p = q; } for (let i = 0; i < 400 && L.phase() < at; i++) G.step(0.02); }, at);
  await kick(0.98);
  await shot('new-2-kick.png');
  await ev(() => { const G = game, R = G.rooms.hamalayi.ventRing, V = G.rooms.hamalayi.vent, h = G.hero, a = R.grooves[R.live].a - 0.75, x = V.x + Math.sin(a) * 6, z = V.z + Math.cos(a) * 6;
    h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a + Math.PI; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(1.2); });
  await kick(0.98);
  await shot('new-2b-kick-near.png');
  // two turns to the live groove, the next kick: the vent open
  await ev(() => {
    const G = game, R = G.rooms.hamalayi.ventRing, V = G.rooms.hamalayi.vent, h = G.hero;
    const talkAll = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
    const press = () => { const a = Math.atan2(16, -10) + 0.4; h.pos.set(V.x + Math.sin(a) * 3.9, G.physics.groundAt(V.x + Math.sin(a) * 3.9, V.z + Math.cos(a) * 3.9), V.z + Math.cos(a) * 3.9); h.angle = a + Math.PI; G.step(0.2); G.input.taps.add('KeyE'); G.step(1 / 60); talkAll(); for (let i = 0; i < 60 && (R.moving || h.actT > 0); i++) G.step(0.05); };
    press();   // (the first E: he looks at it)
    while (R.notch !== R.live) press();
    for (let i = 0; i < 600 && !G.flags.c7_vent; i++) { G.step(0.05); if (G.state === 'dialog') talkAll(); }
    talkAll(); window.SPOT(); G.step(2.0);
  });
  await shot('new-3-open.png');
}
await browser.close();
