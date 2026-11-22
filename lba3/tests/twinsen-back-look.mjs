// TWINSEN-ZOE-LOOK, the back view (the user, 22.11: "the problem is mostly when we look at Twinsen from behind in the follow
// camera … the hair is a bit too pixelated, but I'm not sure"; docs/lba-maturity/TWINSEN-ZOE-LOOK.md): Twinsen from
// behind under the Follow camera as a player sees him, indoors (his house) and outdoors (the yard, a street), at Far
// (the default) and Medium; standing, and a strip of frames walking away. For a person to compare; nothing judged here.
//   LOOK=current (default) | v2 | a list of v2's steps   →  ?look=<LOOK>
//   OUT=dir (default captures/twinsen-zoe-look/back-<LOOK>/)   DIAG=1 also: the same still with the sun's shadows off
// Each picture: a crop round him (PNG, the game's own pixels), plus <OUT>/meta.json (graphics config, boxes).
// The only things set that a player cannot do: the walk to a street is a teleport, and the time is stepped (game.step).
// SwiftShader, headless: Automated runtime only.
import { launch, open, checker } from './lib/boot.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const LOOK = process.env.LOOK || 'current';
const CAP = process.env.OUT || fileURLToPath(new URL(`../captures/twinsen-zoe-look/back-${LOOK.replace(/,/g, '+')}/`, import.meta.url));
mkdirSync(CAP, { recursive: true });
const Q = LOOK === 'current' ? '' : `look=${LOOK}`;
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const meta = { look: LOOK, shots: {} };

await open(page, '?nocine' + (Q ? '&' + Q : ''));
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });
meta.config = await ev(() => ({ ...game.graphicsConfig(), quality: game.settings.quality, camera: game.settings.camera, camDist: game.settings.camDist }));
check('the Follow camera at Far (the shipped default)', meta.config.camera === 'follow' && meta.config.camDist === 'far', meta.config);

// his head and body on screen: [x0, y0, x1, y1] of the bones (and the hair's top)
const boxOf = () => ev(() => {
  game.renderer.render();
  const cam = game.camera, W = innerWidth, H = innerHeight, R = game.hero.rig, v = new cam.position.constructor(), pts = [];
  R.root.updateMatrixWorld(true);
  R.root.traverse((o) => { if (o.isBone) { o.getWorldPosition(v); pts.push(v.clone()); } });
  const hd = R.j.head.getWorldPosition(v.clone());
  const top = hd.clone(); top.y += 0.4; pts.push(top);
  const pr = (p) => { const q = p.clone().project(cam); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H]; };
  const s = pts.map(pr), xs = s.map((p) => p[0]), ys = s.map((p) => p[1]);
  return { body: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round), head: pr(hd.clone().setY(hd.y + 0.12)).map(Math.round), dist: +cam.position.distanceTo(hd).toFixed(2) };
});
const clip = (b, pad = 0.25, min = 100) => {
  const [x0, y0, x1, y1] = b.body, w = Math.max(min, (x1 - x0) * (1 + 2 * pad)), h = Math.max(min, (y1 - y0) * (1 + 2 * pad)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const x = Math.max(0, Math.min(1280 - w, cx - w / 2)), y = Math.max(0, Math.min(720 - h, cy - h / 2));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(Math.min(w, 1280)), height: Math.round(Math.min(h, 720)) };
};
const shot = async (name, full = false) => {
  const b = await boxOf(), c = clip(b);
  meta.shots[name] = { ...b, clip: c };
  await page.screenshot({ path: CAP + name + '.png', clip: c, timeout: 180000 });
  if (full) await page.screenshot({ path: CAP + name + '-full.jpg', type: 'jpeg', quality: 90, timeout: 180000 });
};
// he walks away from the camera (the view's forward on the ground), the frames as he goes; then he stops and the camera settles
const series = async (tag) => {
  await ev(() => {
    const c = game.camera.position, h = game.hero.pos, dx = h.x - c.x, dz = h.z - c.z, d = Math.hypot(dx, dz) || 1;
    P.face(h.x + dx / d * 6, h.z + dz / d * 6); game.step(1.5);
    if (game.tutorial?._mk) game.tutorial._mk.group.visible = false;
    game.input.keys.add('ArrowUp'); game.step(0.9);
  });
  for (let i = 0; i < 6; i++) { await shot(`${tag}-walk-${i}`); await ev(() => game.step(0.1)); }
  await ev(() => { game.input.keys.delete('ArrowUp'); game.step(2.5); });
  await shot(`${tag}-still`, true);
  if (process.env.DIAG) {
    await ev(() => { game.env.sun.castShadow = false; game.step(0.05); });
    await shot(`${tag}-still-noshadow`);
    await ev(() => { game.env.sun.castShadow = true; game.step(0.05); });
  }
};
const setDist = (d) => ev((d) => { game.settings.camDist = d; game.camRig.setFollowDistance(d); game.step(2.0); }, d);

// indoors: his house (step back from the cupboard toward the room's middle first)
await ev(() => { const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z); for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(1.0); P.settle(); });
await series('house-far');
await setDist('medium'); await series('house-medium'); await setDist('far');
// outdoors: the yard
await ev(() => { P.settle(); const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle(); });
check('out in the yard', await ev(() => !game.room), await ev(() => game.room?.id ?? 'out'));
await series('yard-far');
await setDist('medium'); await series('yard-medium'); await setDist('far');
// a street: next to a neighbour in the street 15–45 m off (teleport), facing along it
const street = await ev(() => {
  const h = game.hero.pos, list = (game.npcs || []).filter((n) => n.rig && n.present !== false && !n.def?.id?.startsWith('zoe')).map((n) => ({ n, d: Math.hypot(n.pos.x - h.x, n.pos.z - h.z) })).filter((o) => o.d > 15 && o.d < 45).sort((a, b) => a.d - b.d);
  const t = list[0]?.n; if (!t) return null;
  const x = t.pos.x + 3, z = t.pos.z + 3;
  game.hero.pos.set(x, game.physics.groundAt(x, z, 60), z); game.hero.vy = 0; P.settle(); game.step(2.5);
  return { who: t.def?.id, at: [+x.toFixed(1), +z.toFixed(1)] };
});
meta.street = street;
check('a street spot near a neighbour', !!street, street);
if (street) { await series('street-far'); await setDist('medium'); await series('street-medium'); }
writeFileSync(CAP + 'meta.json', JSON.stringify(meta, null, 1));
await browser.close();
done();
