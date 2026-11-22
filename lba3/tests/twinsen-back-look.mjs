// TWINSEN-ZOE-LOOK, the back view (the user, 22.11: "the problem is mostly when we look at Twinsen from behind in the follow
// camera … the hair is a bit too pixelated, but I'm not sure"; docs/lba-maturity/TWINSEN-ZOE-LOOK.md): Twinsen from
// behind under the Follow camera as a player sees him, indoors (his house) and outdoors (the yard, a street), at Far
// (the default) and Medium; standing, and a strip of frames walking away. For a person to compare; nothing judged here.
//   LOOK=current (default) | v2 | a list of v2's steps   →  ?look=<LOOK>
//   OUT=dir (default captures/twinsen-zoe-look/back-<LOOK>/)   DIAG=1 also: the same still with the sun's shadows off
//   HAIR-EDGE (P106, the user may play at a lowered resolution on the Intel computer): each picture also at other render
//   settings, `scale:aa` with aa msaa (the preset's MSAA) or off (Edges: Fast, the game's path without MSAA):
//   STILLS=1:msaa,0.8:msaa,…  (the still; default only 1:msaa)   WALKS=1:msaa,0.7:off,…  (the walk frames; default 1:msaa)
//   ONLY=yard-far,street-medium  only those places and distances
//   NOSIL=1  the hero's see-through silhouette hidden (a diagnostic)
//   a picture at 1:msaa keeps its name; any other is <name>@<scale><aa>.png (e.g. yard-far-still@0.7off.png)
// Each picture: a crop round him (PNG, the game's own pixels), plus <OUT>/meta.json (graphics config, boxes).
// The only things set that a player cannot do: the walk to a street is a teleport, the time is stepped (game.step), and
// the render scale is held where it is set (the automatic resolution and Quality Auto's governor stand still).
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
const cfgs = (s) => (s || '1:msaa').split(',').map((c) => c.split(':')).map(([sc, aa]) => [+sc, aa === 'off' ? 'off' : 'msaa']);
const STILLS = cfgs(process.env.STILLS), WALKS = cfgs(process.env.WALKS);
// the render scale (the automatic resolution's factor, held) and the edges (MSAA, or none: Edges: Fast) for the next picture
const setCfg = ([sc, aa]) => ev(([sc, aa]) => { const R = game.renderer; R.adapt = () => {}; if (game.autoQ) game.autoQ.frame = () => {}; /* (held: SwiftShader's slow frames would lower it) */ if ((R.aa === 'fxaa') !== (aa === 'off')) R.setAA(aa === 'off' ? 'fxaa' : 'msaa'); R.setDyn(sc); return { scale: R.effScale(), knobs: !!R.knobs, samples: R._want ? R._want.ms : R.composer.renderTarget1.samples }; }, [sc, aa]);
const cfgName = (name, [sc, aa]) => (sc === 1 && aa === 'msaa' ? name : `${name}@${sc}${aa}`);

await open(page, '?nocine' + (Q ? '&' + Q : ''));
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });
// (a diagnostic: NOSIL=1 hides the hero's see-through silhouette, to tell its pixels from the model's)
if (process.env.NOSIL) await ev(() => { const s = game.hero.rig.silhouette; if (s) s.visible = false; });
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
const shot = async (name0, full = false, list = [[1, 'msaa']]) => {
  for (const cf of list) {
    const name = cfgName(name0, cf), r = await setCfg(cf);
    const b = await boxOf(), c = clip(b);
    meta.shots[name] = { ...b, clip: c, render: r };
    await page.screenshot({ path: CAP + name + '.png', clip: c, timeout: 180000 });
    if (full && name === name0) await page.screenshot({ path: CAP + name + '-full.jpg', type: 'jpeg', quality: 90, timeout: 180000 });
  }
  await setCfg([1, 'msaa']);
};
// he walks away from the camera (the view's forward on the ground), the frames as he goes; then he stops and the camera settles
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;   // (only these of the six: e.g. yard-far,street-far)
const series = async (tag) => {
  if (ONLY && !ONLY.includes(tag)) return;
  await ev(() => {
    const c = game.camera.position, h = game.hero.pos, dx = h.x - c.x, dz = h.z - c.z, d = Math.hypot(dx, dz) || 1;
    P.face(h.x + dx / d * 6, h.z + dz / d * 6); game.step(1.5);
    if (game.tutorial?._mk) game.tutorial._mk.group.visible = false;
    game.input.keys.add('ArrowUp'); game.step(0.9);
  });
  for (let i = 0; i < 6; i++) { await shot(`${tag}-walk-${i}`, false, WALKS); await ev(() => game.step(0.1)); }
  await ev(() => { game.input.keys.delete('ArrowUp'); game.step(2.5); });
  await shot(`${tag}-still`, true, STILLS);
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
// a street: next to a neighbour in the street 15–60 m off (teleport), facing along it
// (HAIR-EDGE: the first spot such that a tree crown or an eave hides his head at the start or the end of the walk,
//  where the silhouette would draw him instead, is passed over for the next: up to 6 neighbours × 4 sides)
const seen = () => ev(async () => {
  const T = await import('./vendor/three/build/three.module.min.js');
  game.renderer.render();
  const cam = game.camera, hd = game.hero.rig.j.head.getWorldPosition(new T.Vector3()); hd.y += 0.1;
  const dir = hd.clone().sub(cam.position), dist = dir.length(); dir.normalize();
  const rc = new T.Raycaster(cam.position.clone(), dir, 0.1, dist - 0.35); rc.camera = cam;
  const hero = new Set(); game.hero.rig.root.traverse((o) => hero.add(o));
  let vis = true;
  try { vis = !rc.intersectObjects(game.scene.children, true).some((h) => !hero.has(h.object) && h.object.visible !== false && !h.object.isSprite && !h.object.isLine && !h.object.isPoints); } catch { /* unknown: taken */ }
  return vis;
});
const toSpot = (o) => ev(({ x, z }) => { game.hero.pos.set(x, game.physics.groundAt(x, z, 60), z); game.hero.vy = 0; P.settle(); game.step(2.5); }, o);
const cands = await ev(() => {
  const h = game.hero.pos, list = (game.npcs || []).filter((n) => n.rig && n.present !== false && !n.def?.id?.startsWith('zoe')).map((n) => ({ n, d: Math.hypot(n.pos.x - h.x, n.pos.z - h.z) })).filter((o) => o.d > 15 && o.d < 60).sort((a, b) => a.d - b.d);
  return list.slice(0, 6).flatMap(({ n }) => [[3, 3], [-3, 3], [3, -3], [-3, -3]].map(([a, b]) => ({ who: n.def?.id, x: n.pos.x + a, z: n.pos.z + b })));
});
let street = null;
for (const c of cands) {
  await toSpot(c);
  if (!(await seen())) continue;
  await ev(() => { const c = game.camera.position, h = game.hero.pos, dx = h.x - c.x, dz = h.z - c.z, d = Math.hypot(dx, dz) || 1; P.face(h.x + dx / d * 6, h.z + dz / d * 6); game.step(1.5); game.input.keys.add('ArrowUp'); game.step(1.5); });
  const end = await seen();
  await ev(() => { game.input.keys.delete('ArrowUp'); game.step(0.5); });
  if (!end) continue;
  await toSpot(c);
  street = { who: c.who, at: [+c.x.toFixed(1), +c.z.toFixed(1)] };
  break;
}
meta.street = street;
check('a street spot near a neighbour', !!street, street);
if (street) { await series('street-far'); await setDist('medium'); await series('street-medium'); }
writeFileSync(CAP + 'meta.json', JSON.stringify(meta, null, 1));
await browser.close();
done();
