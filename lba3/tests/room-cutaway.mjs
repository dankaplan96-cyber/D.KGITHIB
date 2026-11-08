// ROOM-CUTAWAY (original-mechanics, wave 3: LBA's interior view): inside, the walls and roofs between the room camera
// and Twinsen are cut away so he and the room read, and that state is restored reliably.
//   - LBA2's cut-away rooms (interiors.js RoomBuilder shell: two far walls standing, the near ones low rims; no ceiling)
//     and LBA1's lids (lba1room.js: the asylum's ceilings and beams cut while he is under them or they stand on his
//     sight line): from the room camera, at every 0.6 m of floor he can stand on, two rays (chest, head) to him; a spot
//     is hidden when both meet the room's own geometry first. Each room sampled: at most 1% of its spots hidden;
//   - a new visit starts from the room's own state: an asylum lid cut over him, he leaves and comes back in elsewhere:
//     on the first frame that lid stands again (no lid left cut from last time); the colliders are the same whether a
//     lid is cut or not (a cut never removes a wall he walks against);
//   - the only fade outdoors on Zeelich, the council house's porch, faded while he stood under it, is solid again on
//     the first frame of his next arrival elsewhere on the street.
// ROOMS=a,b or ALL=1 (every interior room, ~110; slow) instead of the sample; SHOTS=dir: a picture from the room camera
// at three spots of each sampled room (where he comes in, the middle, the corner nearest the camera).
// ISO (logged): he is put on each spot (a survey of geometry, not a walk); the chapter by its flags.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker();
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SAMPLE = ['house', 'cellar', 'office', 'projoffice', 'workshop', 'tavern', 'tavcellar', 'pharmacy', 'nbrhouse', 'nellhouse', 'baggage', 'terminal',
  'zterminal', 'zh_pelleck', 'zh_bakery', 'otrbar', 'otrhotel', 'celtemple', 'ih_otringal_6_m24', 'ih_otringal_m4_m60', 'ih_knartas_33_m14', 'ih_mosquibee_m15_28',
  'ih_platform_30_27', 'ih_orchard_4_28', 'ih_kesh_house1', 'ih_post_cabin1', 'asylum', 'upper', 'council', 'lighttop', 'c3gallery', 'sewer'];

await open(page, '?nocine'); await menu(page, 'new');
iso('chapter 5 by its flags');
await ev(async () => {
  P.settle(); const G = game, ci = G.story.chapters.findIndex((c) => c.key === 'steam');
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: ci, chapterKey: 'steam' }); G.hero.hasBall = true; G.story.refreshCast?.(); P.settle();
  const T = (window.T3 = await import(location.origin + '/vendor/three/build/three.module.min.js'));
  // the room's own meshes in the way from `from` to `to` (every layer: a piece drawn in a draw batch keeps its original
  // out of layer 0; the batches themselves, sprites, hidden pieces and clear glass are not walls)
  const rc = new T.Raycaster(); rc.layers.enableAll();
  window.blocked = (R, from, to) => {
    rc.camera = G.camera;
    const d = to.clone().sub(from), L = d.length(); rc.set(from, d.normalize()); rc.near = 0; rc.far = L - 0.35;
    for (const x of rc.intersectObject(R.group, true)) {
      const o = x.object; if (!o.isMesh || o.isSprite || o.userData.drawBatch || o.isSkinnedMesh) continue;
      let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) { vis = false; break; }
      if (!vis) continue;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if ((m?.transparent && m.opacity < 0.6) || m?.colorWrite === false) continue;
      return true;
    }
    return false;
  };
});
const all = await ev(() => [...game.regions.of.keys()].filter((id) => { const c = game.regions.centreOf(id); return c && !c.outdoor; }));
const rooms = process.env.ROOMS ? process.env.ROOMS.split(',') : process.env.ALL ? all : SAMPLE.filter((r) => all.includes(r));
const res = [];
for (const id of rooms) {
  const r = await ev((id) => {
    const G = game, T = window.T3, PH = G.physics, h = G.hero, cam = G.camera;
    const R = G.regions.ensure(id, 'cutaway');
    G.enterRoom(id, null, true, true); G.step(0.1);
    const bounds = R.bounds?.length ? R.bounds : [{ x0: R.center.x - 6, x1: R.center.x + 6, z0: R.center.z - 6, z1: R.center.z + 6 }];
    const y0 = PH.groundAt(R.spawn?.x ?? R.center.x, R.spawn?.z ?? R.center.z);
    let spots = 0, hidden = 0; const where = [];
    for (const b of bounds) for (let x = b.x0 + 0.4; x < b.x1 - 0.3; x += 0.6) for (let z = b.z0 + 0.4; z < b.z1 - 0.3; z += 0.6) {
      const gy = PH.groundAt(x, z, y0 + 6);
      if (!Number.isFinite(gy) || gy < y0 - 1.5 || PH.blockedAt(x, z, gy + 0.3, 0.35)) continue;   // (not down a hole: the tavern cellar's drops him into the sewer)
      h.pos.set(x, gy, z); h.vy = 0; h.onGround = true;
      G.camRig.snap(); G.camRig.update(1 / 60, h.pos, h.angle, false, null); R.updateLids?.(h, 1); cam.updateMatrixWorld();
      spots++;
      if ([0.95, 1.5].every((hy) => window.blocked(R, cam.position.clone(), new T.Vector3(x, gy + hy, z)))) { hidden++; if (where.length < 4) where.push([+(x - R.center.x).toFixed(1), +(z - R.center.z).toFixed(1)]); }
    }
    const b0 = bounds[0];
    return { id, spots, hidden, frac: spots ? +(hidden / spots).toFixed(3) : 0, where, shots: [R.spawn ? { x: R.spawn.x, z: R.spawn.z } : null, { x: (b0.x0 + b0.x1) / 2, z: (b0.z0 + b0.z1) / 2 }, { x: b0.x1 - 0.7, z: b0.z1 - 0.7 }].filter(Boolean) };
  }, id).catch((e) => ({ id, err: e.message.slice(0, 200) }));
  console.log('ROOM ' + JSON.stringify({ id: r.id, spots: r.spots, hidden: r.hidden, frac: r.frac, where: r.where, err: r.err }));
  res.push(r);
  if (SHOTS && !r.err) for (const [i, s] of r.shots.entries()) {
    const ok = await ev((s) => { const G = game, h = G.hero, PH = G.physics; const y = PH.groundAt(s.x, s.z, h.pos.y + 3); if (PH.blockedAt(s.x, s.z, y + 0.3, 0.3)) return false; h.pos.set(s.x, y, s.z); G.camRig.snap(); G.room.resetCut?.(); for (let k = 0; k < 4; k++) G.frame(1 / 60, false); G.renderer.render(); return true; }, s);
    if (ok) await page.screenshot({ path: path.join(SHOTS, `${id}-${i}.jpg`), type: 'jpeg', quality: 70 });
  }
}
check('inside, the room camera sees him: at most 1% of each room\'s floor spots hide him (two rays, chest and head)', res.every((r) => !r.err && r.frac <= 0.01), res.filter((r) => r.err || r.frac > 0.01).map((r) => ({ id: r.id, frac: r.frac, where: r.where, err: r.err })));

// ---- LBA1's lids: cut over him, restored on the next visit, colliders untouched
iso('he is put under one of the asylum\'s lids, then the door out and in again by the game\'s own scene changes');
const lid = await ev(() => {
  const G = game, R = G.regions.ensure('asylum', 'cutaway'), PH = G.physics, h = G.hero;
  if (!R.lids?.length) return { err: 'no lids' };
  G.enterRoom('asylum', null, true, true); G.step(0.2);
  const cols = () => R.colliders.filter((c) => c.enabled).length;
  const c0 = cols();
  // a box lid with floor under it he can stand on
  let L = null, spot = null;
  for (const l of R.lids.filter((q) => !q.over)) {
    const [x0, y0, z0, x1, , z1] = l.box;
    for (const [fx, fz] of [[0.5, 0.5], [0.3, 0.3], [0.7, 0.7], [0.3, 0.7], [0.7, 0.3]]) {
      const p = R.cell(x0 + (x1 - x0) * fx, y0, z0 + (z1 - z0) * fz), g = PH.groundAt(p.x, p.z, p.y + 1.5);
      if (Math.abs(g - p.y) < 1.2 && !PH.blockedAt(p.x, p.z, g + 0.3, 0.35)) { L = l; spot = { x: p.x, z: p.z }; break; }
    }
    if (L) break;
  }
  if (!L) return { err: 'no lid with a floor' };
  const meshes = R.lidMeshes.filter((m) => m.lids.includes(L.i)).map((m) => m.mesh);
  h.pos.set(spot.x, PH.groundAt(spot.x, spot.z, h.pos.y + 3), spot.z); G.camRig.snap(); G.doorCool = 9;
  for (let i = 0; i < 40; i++) G.frame(1 / 60, false);
  const cut = { f: +L.f.toFixed(2), shown: meshes.filter((m) => m.visible).length, n: meshes.length, cols: cols() };
  // out (Citadel), and back in by its door: he lands at the asylum's own spot, away from that lid
  G.exitRoom({ x: G.world.well.x + 5, z: G.world.well.z + 5 }, true, true); G.step(0.5);
  G.enterRoom('asylum', null, true, true); G.frame(1 / 60, false);
  const p = R.toCell(h.pos.x, h.pos.y, h.pos.z), [x0, , z0, x1, , z1] = L.box;
  const away = !(p.x >= x0 - 0.3 && p.x <= x1 + 0.3 && p.z >= z0 - 0.3 && p.z <= z1 + 0.3);
  const back = { f: +L.f.toFixed(2), shown: meshes.filter((m) => m.visible).length, opacity: meshes.map((m) => +m.material.opacity.toFixed(2)), away, cols: cols() };
  return { lid: L.name || L.i, c0, cut, back };
});
check('the asylum: a lid over him is cut (its meshes hidden), and his walls stay solid (the same colliders)', !lid.err && lid.cut.f < 0.05 && lid.cut.shown === 0 && lid.cut.cols === lid.c0, lid);
check('the asylum: out and back in elsewhere, that lid stands again from the first frame (no cut left from last time)', !lid.err && lid.back.away && lid.back.f === 1 && lid.back.shown === lid.cut.n && lid.back.opacity.every((o) => o === 1) && lid.back.cols === lid.c0, lid);

// ---- Zeelich: the council house's porch, faded under it, solid on the next arrival
iso('he is put under the council house\'s porch, then a shuttle-style arrival at the street\'s spawn');
const porch = await ev(() => {
  const G = game; G.regions.ensure('zeelich', 'cutaway'); const R = G.rooms.zeelich, h = G.hero, PH = G.physics;
  G.enterRoom('zeelich', R.spawn, true, true); G.step(0.3);
  const faded = () => { const s = new Set(); R.group.traverse((m) => { if (!m.isMesh) return; for (const mm of [].concat(m.material)) if (mm && !mm.userData.alwaysTransparent && mm.transparent && mm.opacity < 0.9 && mm.depthWrite === false) s.add(mm); }); return s.size; };
  const base = faded();
  const d = R.councilDoor, ux = d.x, uz = d.z - 1.8;
  h.pos.set(ux, PH.groundAt(ux, uz, h.pos.y + 3), uz); G.camRig.snap(); G.doorCool = 9;
  for (let i = 0; i < 60; i++) G.frame(1 / 60, false);
  const under = faded();
  // a door elsewhere: into the bakehouse and out again, then a new arrival at the spawn
  G.enterRoom('zh_pelleck', null, true, true); G.step(0.2);
  G.enterRoom('zeelich', R.spawn, true, true); G.frame(1 / 60, false);
  return { base, under, after: faded() };
});
check('Zeelich: the council porch fades while he stands under it, and is solid again on the first frame of his next arrival', porch.under > porch.base && porch.after === porch.base, porch);
done();
await browser.close();
