// CAVE-LOOK (P69, the user in Tralu's cave: "inside, everything is weird and not right"): pictures of the cave from the
// play camera at fixed spots (Twinsen placed, the room's own camera), and the room's cost: its meshes, their triangles,
// and one frame's draw calls and triangles (main and shadow pass) at each spot. A diagnostic; docs/lba-maturity/CAVE-LOOK.md.
//   SHOTS=dir (default captures/cave-look) PREFIX=before|after QUALITY=medium node tests/cave-look.mjs
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const SHOTS = process.env.SHOTS ?? 'captures/cave-look', PREFIX = process.env.PREFIX ?? 'after', QUALITY = process.env.QUALITY ?? 'medium';
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const CAMWALK = fileURLToPath(new URL('./lib/camwalk.js', import.meta.url));
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: CAMWALK });
await ev((q) => { CW.setup(); game.settings.quality = q; game.applySettings(); }, QUALITY);
// in by the plateau's door, as a player comes in
const inn = await ev(() => {
  // (on the landing before the door, tests/cave-stair.mjs's frame: lx along the face, lz out of it)
  const o = { x: -80.7, z: -82.0, ry: Math.PI }, c = Math.cos(o.ry), s = Math.sin(o.ry), lx = 2.4, lz = 0.85;
  CW.place({ x: o.x + c * lx + s * lz, z: o.z - s * lx + c * lz, a: Math.PI / 2 });
  const d = game.story.doors().find((q) => q.room === 'tralucave'); const r = P.through(d.x, d.z); P.settle(); return { r, room: game.room?.id };
});
check('in the cave by its door', inn.room === 'tralucave', inn);
// the room's static cost
const cost = await ev(() => {
  const g = game.room.group; let meshes = 0, tris = 0, lights = 0; const byMat = new Map();
  g.traverse((o) => {
    if (o.isLight) lights++;
    if (!o.isMesh || !o.geometry) return;
    meshes++; const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
    tris += n; const k = (o.material.name || o.material.type) + (o.material.map ? '+map' : '') + (o.material.vertexColors ? '+vc' : '');
    byMat.set(k, (byMat.get(k) || 0) + n);
  });
  return { meshes, tris: Math.round(tris), lights, colliders: game.room.colliders.length, top: [...byMat].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => k + ':' + Math.round(n)) };
});
console.log('ROOM', JSON.stringify(cost));
// spots: [name, x, z, heading] in the room's frame (x + 8400)
const SPOTS = [
  ['arrive', null, null, null],
  ['floor-mid', -4.0, 2.0, Math.PI * 0.75],
  ['terrace', -7.5, -5.0, Math.PI],
  ['pool', 6.0, 9.0, Math.PI],
  ['stair-foot', -2.6, 2.4, Math.PI],
  ['guardhouse-door', 3.5, 0.6, Math.PI],
  ['front-left', -10.5, 8.5, Math.PI * 0.75],
];
for (const [name, x, z, a] of SPOTS) {
  const r = await ev(({ x, z, a }) => {
    const h = game.hero, R = game.room;
    if (x != null) { const px = R.center.x + x, pz = R.center.z + z; h.pos.set(px, game.physics.groundAt(px, pz, 3), pz); h.angle = a; h.resetMotion(); h.vy = 0; h.onGround = true; }
    game.camRig.snap?.();
    for (let i = 0; i < 60; i++) game.frame(1 / 60, false);
    const RR = game.renderer.renderer, c = { main: 0, shadow: 0, tmain: 0, tshadow: 0 }, orig = RR.renderBufferDirect.bind(RR);
    RR.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => {
      const p = scene ? 'main' : 'shadow'; c[p]++;
      const n = grp ? grp.count : geo.index ? Math.min(geo.index.count, geo.drawRange.count) : Math.min(geo.attributes.position.count, geo.drawRange.count);
      c['t' + p] += Math.round((n / 3) * (obj.isInstancedMesh ? obj.count : 1));
      return orig(cam, scene, geo, mat, obj, grp);
    };
    game.perf?.beginFrame?.(); game.frame(1 / 60, true);
    RR.renderBufferDirect = orig;
    return { at: [+(h.pos.x - R.center.x).toFixed(2), +h.pos.y.toFixed(2), +(h.pos.z - R.center.z).toFixed(2)], ...c, programs: RR.info.programs.length };
  }, { x, z, a });
  console.log('SPOT', name, JSON.stringify(r));
  fs.mkdirSync(SHOTS, { recursive: true });
  await ev(() => game.renderer.render());
  await page.screenshot({ path: `${SHOTS}/${PREFIX}-${name}.jpg`, type: 'jpeg', quality: 85 });
}
done();
await browser.close();
