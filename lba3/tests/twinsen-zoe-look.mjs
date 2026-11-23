// TWINSEN-ZOE-LOOK (the user, 22.11: "I want Twinsen and Zoé to look more like the original … keep the current one and
// we'll compare"; docs/lba-maturity/TWINSEN-ZOE-LOOK.md): the same pictures of Twinsen and Zoé for the current look and
// for a candidate, so they can be set side by side. Nothing here judges the look: a person does.
//   LOOK=current (default) | v2 | a list of v2's steps (e.g. medal,tunic)   →  the page is opened with ?look=<LOOK>
//   OUT=dir (default captures/twinsen-zoe-look/<LOOK>/)
// 1. lookdev.html (the game's own character page and material, outdoor light, frozen idle): front, ¾, side and back of
//    each at close range, and the head from the same four sides.
// 2. In the game (new game → the ball from the cupboard → the yard where Zoé waits, by input as tests/char-form.mjs):
//    the play camera as shipped (Follow, Far) standing by Zoé and walking away from the camera; the talk with Zoé
//    (E) under the talk camera, while she speaks and while he answers.
// Writes <OUT>/meta.json with each in-game picture's character boxes on screen (for the comparison sheets' crops).
// Checks: the models load as polygon models with their skeleton, eyes and mouth (the candidate must not lose any).
// SwiftShader, headless: Automated runtime only.
import { launch, open, checker, URL0 } from './lib/boot.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const LOOK = process.env.LOOK || 'current';
const CAP = process.env.OUT || fileURLToPath(new URL(`../captures/twinsen-zoe-look/${LOOK.replace(/,/g, '+')}/`, import.meta.url));
mkdirSync(CAP, { recursive: true });
const Q = LOOK === 'current' ? '' : `look=${LOOK}`;
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const meta = {};

// ---- 1. lookdev: close range, four sides, and the heads
const views = [['front', 0], ['34', 0.62], ['side', 1.57], ['back', 3.14]];
const ld = async (name, q) => {
  await page.goto(`${URL0}lookdev.html?${q}&light=outdoor&labels=0&props=0&anim=idle&t=0.5${Q ? '&' + Q : ''}`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.lookdev?.rigs?.length, null, { timeout: 300000 });
  await ev(() => window.lookdev.render());
  await page.screenshot({ path: CAP + name + '.jpg', type: 'jpeg', quality: 90, timeout: 180000 });
};
for (const c of ['twinsen', 'zoe']) {
  await ld(`ld-${c}-turn`, `c=${c}&views=${views.map((v) => v[1]).join(',')}&gap=0.95&dist=5.6&cy=1.25&ly=1.05&fov=30`);
  for (const [n, a] of views) await ld(`ld-${c}-head-${n}`, `c=${c}&yaw=0&focus=head&fd=1.6&fy=0.1&cyaw=${a}&cpitch=0.12&fov=30`);
}
const counts = await ev(() => window.lookdev.rigs.map((r) => { let t = 0, m = 0; r.root.traverse((o) => { if (o.isMesh) { m++; t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { tris: t, meshes: m }; }));
meta.lookdevCounts = counts;

// ---- 2. the game
await open(page, '?nocine' + (Q ? '&' + Q : ''));
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });
const info = await ev(() => {
  const H = game.hero.rig, bones = [];
  H.root.traverse((o) => { if (o.isBone) bones.push(o.name); });
  let skinned = 0, tris = 0;
  H.root.traverse((o) => { if (o.isSkinnedMesh) { skinned++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  return { skinned, tris, bones: bones.length, eyes: !!H.j?.eyes?.length, mouth: !!H.mouth, morphs: H.mesh?.morphTargetInfluences?.length || 0, settings: { camera: game.settings.camera, camDist: game.settings.camDist } };
});
check('Twinsen: the polygon model with its 19 bones, eyes, mouth and brow morphs', info.skinned > 0 && info.bones >= 19 && info.eyes && info.mouth && info.morphs === 3, info);
meta.hero = info;
await ev(() => {
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z);
  for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
  game.step(1.0); P.settle(); const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle();
});
const zoe = await ev(() => { const z = P.npc('zoe'); if (!z) return null; const r = z.rig; let s = 0; r.root.traverse((o) => { if (o.isSkinnedMesh) s++; }); return { skinned: s, eyes: !!r.j?.eyes?.length, mouth: !!r.mouth, morphs: r.mesh?.morphTargetInfluences?.length || 0 }; });
check('Zoé in the yard: the polygon model with eyes, mouth and brow morphs', !!zoe && zoe.skinned > 0 && zoe.eyes && zoe.mouth && zoe.morphs === 3, zoe);
meta.zoe = zoe;
// a picture with each character's box on screen (head top to feet, from the bones)
const shot = async (name) => {
  const boxes = await ev(() => {
    game.renderer.render();
    const cam = game.camera, W = innerWidth, Hh = innerHeight, out = {};
    for (const [k, a] of [['hero', game.hero], ['zoe', P.npc('zoe')]]) {
      if (!a?.rig) continue;
      const pts = [];
      const v = new cam.position.constructor();
      a.rig.root.updateMatrixWorld(true);
      a.rig.root.traverse((o) => { if (o.isBone) { o.getWorldPosition(v); pts.push(v.clone()); } });
      const top = a.rig.j.head.getWorldPosition(v.clone()); top.y += 0.35 * (a.rig.root.scale.y || 1); pts.push(top);
      const p2 = pts.map((p) => p.project(cam)).filter((p) => p.z < 1);
      if (!p2.length) continue;
      const xs = p2.map((p) => (p.x + 1) / 2 * W), ys = p2.map((p) => (1 - p.y) / 2 * Hh);
      out[k] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round);
    }
    return out;
  });
  meta[name] = boxes;
  await page.screenshot({ path: CAP + name + '.jpg', type: 'jpeg', quality: 90, timeout: 180000 });
};
// the play camera (Follow, Far): standing a few metres from Zoé, then walking away from the camera
await ev(() => { const z = P.npc('zoe'); const h = game.hero.pos; const dx = z.pos.x - h.x, dz = z.pos.z - h.z, d = Math.hypot(dx, dz); if (d > 3.2) P.go(h.x + dx * (1 - 3 / d), h.z + dz * (1 - 3 / d), { tol: 0.5, maxT: 60 }); P.face(z.pos.x, z.pos.z); P.settle(); game.step(2.0); });
await ev(() => { if (game.tutorial?._mk) game.tutorial._mk.group.visible = false; });
await shot('game-play-far-standing');
await ev(() => { const z = P.npc('zoe'); window.LK_A = Math.atan2(z.pos.x - game.hero.pos.x, z.pos.z - game.hero.pos.z); P.face(game.hero.pos.x + Math.sin(LK_A + 1.2) * 6, game.hero.pos.z + Math.cos(LK_A + 1.2) * 6); game.input.keys.add('ArrowUp'); game.step(1.2); });
await shot('game-play-far-walk');
await ev(() => { game.input.keys.delete('ArrowUp'); game.step(0.8); P.settle(); });
// the talk with Zoé (E by her, as a player does): the talk camera on her line, then on his
await ev(() => {
  const z = P.npc('zoe'), ready = () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; };
  P.go(z.pos.x, z.pos.z, { tol: 1.4, stopWhen: ready, maxT: 40 }); P.face(z.pos.x, z.pos.z);
  for (let k = 0; k < 3 && !ready(); k++) { P.go(z.pos.x, z.pos.z, { tol: 1.0 - k * 0.2, maxT: 20 }); P.face(z.pos.x, z.pos.z); }
  P.tap('KeyE', 0.1); game.step(1.6);
});
const st = await ev(() => ({ state: game.state, speaker: game.speaker === game.hero ? 'hero' : game.speaker?.def?.id }));
check('the talk with Zoé opens by E', st.state === 'dialog', st);
await shot('game-talk-1');
const st2 = await ev(() => { for (let i = 0; i < 6 && game.state === 'dialog'; i++) { P.tap('KeyE', 0.05); P.tap('KeyE', 0.05); game.step(1.4); if (game.speaker === game.hero) break; } return { state: game.state, speaker: game.speaker === game.hero ? 'hero' : game.speaker?.def?.id }; });
await shot('game-talk-2');
meta.talk = [st, st2];
writeFileSync(CAP + 'meta.json', JSON.stringify(meta, null, 1));
await browser.close();
done();
