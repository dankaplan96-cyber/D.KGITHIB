// P79 (REVIEW-TASKS-19-11 task 7, FULL-TEST): are "curious" and "concerned" told apart at dialogue distance? New game →
// the ball → out to the yard → walk up to Zoé → E (the talk opens: the game's own dialogue camera, as a player sees it).
// With the talk open, both faces are set to each expression in turn (Rig.setFace — the one thing set that a line's
// intention would set), eased in, and pictured: the whole frame, and the two heads cut from that same frame at the
// screen's own pixels (no zoom, no close camera). Also the same at the follow camera's distance after the talk.
//   OUT=captures/full-test/faces (default)
// Automated runtime only (SwiftShader): the pictures are for a person to judge; this script judges nothing.
import { launch, open, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const OUT = (process.env.OUT || 'captures/full-test/faces') + '/';
fs.mkdirSync(OUT, { recursive: true });
const { check, done } = checker({ info: 'always' });
const W = 1280, H = 720;
const { browser, page } = await launch({ width: W, height: H });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false;
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z);
  for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
  game.step(1.0); P.settle(); const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle(); });
check('out in the yard', await ev(() => !game.room), await ev(() => game.room?.id ?? 'out'));
// the screen box of a character's head (from its head bone and a head-sized sphere), padded
const box = (who) => ev((who) => {
  const a = who === 'hero' ? game.hero : P.npc(who), V = game.camera.position.constructor;
  const p = new V(); a.rig.j.head.getWorldPosition(p); const s = a.rig.root.scale.y || 1;
  const pts = [[0, 0.32, 0], [0, -0.22, 0], [0.25, 0.05, 0], [-0.25, 0.05, 0], [0, 0.05, 0.25], [0, 0.05, -0.25]].map(([x, y, z]) => new V(p.x + x * s, p.y + y * s, p.z + z * s).project(game.camera));
  const xs = pts.map((q) => (q.x * 0.5 + 0.5) * innerWidth), ys = pts.map((q) => (-q.y * 0.5 + 0.5) * innerHeight);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}, who);
const clip = (b) => { const pad = Math.max(8, b.w * 0.35); const x = Math.max(0, Math.floor(b.x - pad)), y = Math.max(0, Math.floor(b.y - pad)); return { x, y, width: Math.min(W - x, Math.ceil(b.w + 2 * pad)), height: Math.min(H - y, Math.ceil(b.h + 2 * pad)) }; };
const shots = async (tag) => {
  await ev(() => game.renderer.render());
  await page.screenshot({ path: `${OUT}${tag}-frame.jpg`, type: 'jpeg', quality: 90, timeout: 180000 });
  const bh = await box('hero'), bz = await box('zoe');
  await page.screenshot({ path: `${OUT}${tag}-twinsen-head.png`, clip: clip(bh), timeout: 180000 });
  await page.screenshot({ path: `${OUT}${tag}-zoe-head.png`, clip: clip(bz), timeout: 180000 });
  return { twinsenHeadPx: Math.round(bh.h), zoeHeadPx: Math.round(bz.h) };
};
const setBoth = (name) => ev((name) => { for (const a of [game.hero, P.npc('zoe')]) a.rig.setFace(name, 1, 30); game.step(0.6); return [game.hero.rig.faceName, P.npc("zoe").rig.faceName]; }, name);
// the talk: walk up until the Talk prompt is hers, face her, E (as char-form.mjs)
await ev(() => {
  const z = P.npc('zoe'), ready = () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; };
  P.go(z.pos.x, z.pos.z, { tol: 1.4, stopWhen: ready, maxT: 40 }); P.face(z.pos.x, z.pos.z);
  for (let k = 0; k < 3 && !ready(); k++) { P.go(z.pos.x, z.pos.z, { tol: 1.0 - k * 0.2, maxT: 20 }); P.face(z.pos.x, z.pos.z); }
  P.tap('KeyE', 0.1); game.step(1.0);
});
const st = await ev(() => game.state);
check('the talk with Zoé is open (the dialogue camera)', st === 'dialog', st);
const sizes = {};
for (const n of ['neutral', 'curious', 'concerned']) { await setBoth(n); sizes['dialog-' + n] = await shots(`dialog-${n}`); }
// after the talk: the follow camera's usual distance
await ev(() => { P.settle(); game.step(1.0); const z = P.npc('zoe'), h = game.hero.pos; P.go(h.x - (z.pos.x - h.x) * 0.6, h.z - (z.pos.z - h.z) * 0.6, { tol: 0.6, maxT: 20 }); P.face(z.pos.x, z.pos.z); game.step(1.5); });
for (const n of ['curious', 'concerned']) { await setBoth(n); sizes['play-' + n] = await shots(`play-${n}`); }
check('head sizes on screen recorded (px tall, 1280×720)', true, sizes);
fs.writeFileSync(OUT + 'sizes.json', JSON.stringify(sizes, null, 1));
await browser.close();
process.exitCode = done();
