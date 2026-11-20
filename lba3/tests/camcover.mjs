// CAM-COVER (release audit v75, F-8): a tree's crown or a stall's awning must not hide Twinsen while the play camera
// reads him as in view. At the audit's spots (Follow, Medium, Classic: the user's settings), placed and left standing
// 1.5 s, and at seeded spots round Citadel's trees and the stalls' awnings, the truth is the drawn scene: a ray from the
// camera to his head (1.5 m) and to his chest (1.0 m) against every opaque mesh drawn (a crown's leaves, an awning's
// cloth, a wall; not people, not see-through glass, not grass). Per spot:
//   - he is in view: the ray to his head, his chest or one of his shoulders reaches him (the camera's own rule, camera.js
//     _sees, is head or chest; the shoulders, 0.22 m either side, so that a post in front of his middle is not "hidden")
//   - and the camera's own sight test (camRig._sees, the one its arm and swing ask) does not read him as seen while the scene hides him: the
//     fault this guards (a spot it reads as hidden is drawn with his outline, and fails the first check anyway)
// The spots: Citadel by the hopscotch (chapter 2), after a Continue from the third valve on the cliff plateau (a save
// loads him facing north, a = 0), the Hamalayi at Lhar's door (chapter 6), Zeelich by Oku's stall (chapter 3), Desert
// Island by the trader's stall (chapter 4); 16 seeded spots by Citadel's round and fruit trees (there, right under a
// crown's edge, where no view from above can see him, the camera reading him as hidden and his outline drawn passes).
// ISO (logged): placements (camwalk.js CW.place, as a load or a door puts him); the regions entered by enterRoom.
// SHOTS=<dir>: a picture of each audit spot. GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker();
const SHOTS = process.env.SHOTS || '';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: fileURLToPath(new URL('./lib/camwalk.js', import.meta.url)) });
const setup = await ev(() => CW.setup());
check('the user\'s settings: Follow, Medium, Classic controls', setup.cam === 'follow' && setup.dist === 'medium' && setup.controls === 'classic', setup);
console.log('ISO  Twinsen placed at each spot (camwalk.js CW.place); Zeelich, Desert Island and the Hamalayi entered by enterRoom');
await ev(async () => {
  const THREE = await import('three');
  const G = game;
  const ray = new THREE.Raycaster(); ray.camera = G.camera;
  const inRig = (o, root) => { for (let a = o; a; a = a.parent) if (a === root) return true; return false; };
  const people = () => [G.hero.rig.root, ...G.npcs.map((n) => n.rig?.root).filter(Boolean)];
  const shown = (o) => { for (let a = o; a; a = a.parent) if (a.visible === false) return false; return true; };
  const opaque = (m) => m && m.visible !== false && m.colorWrite !== false && !(m.transparent && (m.opacity ?? 1) < 0.98) && !m.userData?.noCover;
  // the first opaque drawn surface between the camera and his point at height hy, or null
  window.__cover = (hy, side = 0) => {
    const h = G.hero, cam = G.camera; cam.updateMatrixWorld(); G.scene.updateMatrixWorld(true);
    const sx = h.pos.x - cam.position.x, sz = h.pos.z - cam.position.z, sl = Math.hypot(sx, sz) || 1;   // (side: across the view, m)
    const p = new THREE.Vector3(h.pos.x - (sz / sl) * side, h.pos.y + hy, h.pos.z + (sx / sl) * side), dir = p.clone().sub(cam.position), L = dir.length(); dir.normalize();
    ray.set(cam.position, dir); ray.near = Math.max(cam.near, 0.05); ray.far = L - 0.25;
    const P = people();
    const hits = ray.intersectObjects(G.scene.children, true);
    for (const r of hits) {
      const o = r.object;
      if (!o.isMesh || o.isSkinnedMesh || o.isSprite || o.isPoints || o.isLine || !shown(o) || P.some((q) => inRig(o, q))) continue;
      if (/grass|flower|tulip|sky|cloud|water|sea|shadow/i.test(o.name || '')) continue;
      if (![o.material].flat().some(opaque)) continue;
      // (beside it, the nearest tree whose crown the camera counts: its trunk, core and how far the hit is from it)
      const q = r.point, t = G.physics.near(q.x, q.z).filter((c) => c.sight).map((c) => [c, Math.hypot(c.x - q.x, c.z - q.z)]).sort((a, b) => a[1] - b[1])[0];
      const tw = t ? ` (crown at ${t[0].x.toFixed(1)},${t[0].z.toFixed(1)} r ${t[0].sight.r.toFixed(2)} y ${t[0].sight.y0.toFixed(1)}-${t[0].sight.y1.toFixed(1)}, ${t[1].toFixed(2)} off)` : '';
      return (o.name || o.parent?.name || o.type) + '@' + r.point.toArray().map((u) => u.toFixed(1)).join(',') + tw;
    }
    const s = p.clone().project(cam);
    return Math.abs(s.x) <= 1 && Math.abs(s.y) <= 1 && s.z < 1 ? null : 'off screen';
  };
  window.__look = (s) => {
    CW.place(s); CW.start(); CW.step(1.5); const st = CW.stop(); G.renderer.render();
    // (his head, his chest, and his shoulders either side: a post or a pole in front of his middle hides only a strip of him)
    const head = window.__cover(1.5), chest = window.__cover(1.0), left = window.__cover(1.25, -0.22), right = window.__cover(1.25, 0.22), c = G.camera.position;
    return { at: [G.hero.pos.x, G.hero.pos.y, G.hero.pos.z].map((u) => +u.toFixed(2)), cam: [c.x, c.y, c.z].map((u) => +u.toFixed(1)), head, chest, left, right, inView: !head || !chest || !left || !right, camSees: G.camRig._sees(G.camera.position, G.hero.pos), hidden: CW.hidden(G.hero.pos), sil: !!G.hero.rig.silhouette && G.hero.rig.silhouette.visible !== false, unseen: st.unseen, minArm: st.minArm };
  };
});

const SPOTS = [
  { name: 'Citadel by the hopscotch (chapter 2)', x: -48.34, z: 38.69, a: 2.79, ch: 'project' },
  { name: 'Citadel, the cliff plateau after a Continue from the third valve (a = 0)', x: -56.15, z: -36.67, a: 0, ch: 'project' },
  { name: 'the Hamalayi at Lhar\'s door (chapter 6)', room: 'hamalayi', x: 4273.66, z: 23.2, y: 12.1, a: 0.96 },
  { name: 'Zeelich by Oku\'s stall (chapter 3)', room: 'zeelich', x: 2372.48, z: 9.77, y: 6, a: 4.99 },
  { name: 'Desert Island by the trader\'s stall (chapter 4)', room: 'desert', x: 3348.69, z: -4.47, y: 5, a: 4.22 },
];
let k = 0;
for (const s of SPOTS) {
  const r = await ev((s) => window.__look(s), s);
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `cover-${String(++k).padStart(2, '0')}.png`), timeout: 180000 }); }
  console.log('SPOT', s.name, JSON.stringify(r));
  check(`${s.name}: in view (head, chest or a shoulder: no drawn crown, awning or wall on every line)`, r.inView, r);
  check(`${s.name}: the camera's own sight test does not read him as seen while the scene hides him`, !(r.camSees && !r.inView), r);
}

// seeded spots: beside Citadel's round and fruit trees, facing away from the trunk (the camera behind him, the crown
// between them)
const more = await ev(() => {
  let s = 975 >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const G = game, P = G.physics, out = [];
  if (G.room) G.exitRoom({ x: -40, z: 4, a: 0 }, true, true);
  const trees = G.world.trees.filter((t) => !t.gone && (t.kind === 'round' || t.kind === 'fruit') && Math.abs(t.x) < 160 && Math.abs(t.z) < 160);
  for (let n = 0; n < 400 && out.length < 16; n++) {
    const t = trees[Math.floor(rnd() * trees.length)], b = rnd() * Math.PI * 2, d = 1.0 + rnd() * 1.6 * t.s;
    const x = t.x + Math.sin(b) * d, z = t.z + Math.cos(b) * d, g = P.groundAt(x, z, t.h + 2);
    if (!Number.isFinite(g) || Math.abs(g - t.h) > 1.0 || g < 0.3 || P.blockedAt(x, z, g + 0.3, 0.45)) continue;
    out.push({ name: `beside a ${t.kind} tree at (${t.x.toFixed(1)}, ${t.h.toFixed(1)}, ${t.z.toFixed(1)}) ×${t.s.toFixed(2)}`, x: +x.toFixed(2), z: +z.toFixed(2), y: +g.toFixed(2), a: +b.toFixed(2) });   // (facing away from the trunk: the camera behind him looks over the crown)
  }
  return out;
});
let hid = [], under = 0;
for (const s of more) {
  const r = await ev((s) => window.__look(s), s);
  if (!r.inView) under++;
  if (!r.inView && (r.camSees || !r.sil)) hid.push({ s: s.name, at: [s.x, s.z, s.a], ...r });
}
// (right under a crown's edge no view from above sees him — the leaves are over his head —: there the camera must know
//  it, and his outline shows, as LBA2's does; what it must never do is read him as seen while the crown hides him)
console.log(`seeded spots: ${more.length}, ${under} with no view from the camera's arm that sees him (under the crown's edge)`);
check(`${more.length} seeded spots beside Citadel's round and fruit trees, the crown between the camera and him: in view, or (right under the crown's edge) read as hidden by the camera with his outline drawn — never read as seen while the crown hides him`, more.length >= 12 && hid.length === 0, { n: more.length, under, bad: hid });

process.exit(done(errs) ? 1 : 0);
