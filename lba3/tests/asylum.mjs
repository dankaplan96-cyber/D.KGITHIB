// ASYLUM-1: FunFrock's asylum twelve years on (src/game/lba1places.js, src/game/lba1room.js lids, prologue.js as_cell).
//  - why it is there (chapters 1–2): Madam Rondo tells of the bricked-up asylum the project broke into; inside, the
//    bricking over the stair-well lies broken, the dig's breach gapes in the west wall with the project's cable;
//  - Twinsen's old cell: its broken door walked through by input (in and out), his marks, the look (three lines of
//    his), kashes once (flag as_cell), not offered again;
//  - LBA1's cut-away: the ceiling of the room he is in (and its walls on the camera's side) fades out, the others stay;
//    in the cell the beams over it go;
//  - no ghost: where the slab over a room used to hide him (the user's view), he is drawn, not his silhouette; where a
//    wall really hides him, the silhouette still shows;
//  - save → quit → Continue keeps the find, and the lids work again.
// SHOTS=<dir> keeps a picture of the cut-away rooms. GAME_URL as the other tests.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const SHOTS = process.env.SHOTS || '';
const { check, checkVisual, done } = checker({ info: 'always' });
let { browser, context, page } = await launch();
const ev = (fn, arg) => page.evaluate(fn, arg);
const snap = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
const helpers = () => ev(() => {
  const G = game;
  window.T = {
    talkAll(max = 80) { const said = []; for (let i = 0; i < max && G.state !== 'play'; i++) { G.step(0.6); const tx = document.querySelector('#dialog .text')?.textContent; if (tx && said[said.length - 1] !== tx) said.push(tx); G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); return said; },
    // stand at LBA1 cell (x, y, z) of the asylum, settle
    at(x, y, z, t = 1.5) { const R = G.rooms.asylum, c = R.cell(x, y, z), h = G.hero; h.pos.set(c.x, G.physics.groundAt(c.x, c.z, c.y + 1.5), c.z); h.onGround = true; h.vy = 0; G.doorCool = 2; G.camRig.lba.init = false; for (let i = 0; i < t * 30; i++) G.step(1 / 30); return T.cell(); },
    cell() { const p = G.rooms.asylum.toCell(G.hero.pos.x, G.hero.pos.y, G.hero.pos.z); return [p.x, p.y, p.z].map((v) => +v.toFixed(1)); },
    lids() { const R = G.rooms.asylum; return R.lids.map((l) => ({ name: l.name ?? (l.over ? 'over' : 'zone' + l.zone), active: l.active, f: +l.f.toFixed(2) })); },
    // (HOSTEL-CUT-2) the drawn cells cut now (R.cutAt, the shader's cut mirrored): those of the room he stands in, and
    // the others — each with its distance (m) from the line between his chest and the camera; `far`: those of the
    // others farther than `lim` from it (nothing far from him may go)
    cutCells(lim = 3.6) {
      const R = G.rooms.asylum, h = G.hero, cam = G.camera.position, L = R.layout;
      const E = [h.pos.x, h.pos.y + 1, h.pos.z], V0 = [cam.x - E[0], cam.y - E[1], cam.z - E[2]], vl = Math.hypot(...V0), V = V0.map((v) => v / vl);
      let own = 0, near = 0, far = 0, maxd = 0, mine = 0;
      for (const r of R.lidRooms) if (r.active) mine |= 1 << r.bit;
      for (const [k, runs] of Object.entries(L.cols)) {
        const [x, z] = k.split(',').map(Number);
        for (const [y0, len] of runs) for (let y = y0; y < y0 + len; y++) {
          if (R.cutAt(x, y, z) < 0.5) continue;
          if (R.roomBitsAt(x, y, z) & mine) { own++; continue; }
          const c = R.cell(x + 0.5, y + 0.5, z + 0.5), d = [c.x - E[0], c.y - E[1], c.z - E[2]], t = d[0] * V[0] + d[1] * V[1] + d[2] * V[2];
          const r = Math.hypot(d[0] - t * V[0], d[1] - t * V[1], d[2] - t * V[2]);
          if (r > lim) far++; else near++; maxd = Math.max(maxd, r);
        }
      }
      return { own, near, far, maxd: +maxd.toFixed(1) };
    },
    // the share of his body's pixels that the silhouette pass draws (1: he is drawn only as the silhouette)
    ghost() {
      const read = () => { G.renderer.render(); const c = G.renderer.renderer.domElement, o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.drawImage(c, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      const sil = G.hero.rig.silhouette, root = G.hero.rig.root;
      const A = read(); sil.visible = false; const B = read(); root.visible = false; const C = read(); root.visible = true; sil.visible = true;
      let s = 0, b = 0;
      for (let i = 0; i < A.length; i += 4) {
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 18) s++;
        if (Math.abs(A[i] - C[i]) + Math.abs(A[i + 1] - C[i + 1]) + Math.abs(A[i + 2] - C[i + 2]) > 18) b++;
      }
      return { sil: s, body: b, r: +(s / Math.max(1, b)).toFixed(2) };
    },
  };
});
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
// chapter 1, as the user's save
await ev(() => { const G = game; T.talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });

// ---- 1. the reason: Madam Rondo's line (her rotation picks it)
const rondo = await ev(() => {
  const G = game, n = G.npcs.find((x) => x.def.id === 'sphero2'), h = G.hero;
  if (!n?.present) return { present: false };
  G.exitRoom({ x: n.pos.x + Math.sin(n.angle) * 1.3, z: n.pos.z + Math.cos(n.angle) * 1.3, a: n.angle + Math.PI }, true, true); G.step(0.5);
  h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z);
  const rnd = Math.random; Math.random = () => 0.5;   // (her five lines: the third is the asylum's)
  G.input.taps.add('KeyE'); G.step(0.1); const st = G.state; Math.random = rnd;
  const said = T.talkAll();
  return { present: true, chapter: G.flags.chapter, st, said };
});
check("chapter 1: Madam Rondo tells of FunFrock's bricked-up asylum the project's diggers broke into", rondo.present && rondo.chapter === 1 && rondo.said.some((s) => /bricked up his asylum/.test(s) && /broken right back into it/.test(s)), rondo);

// ---- 2. the way in: the block-house door (its bricking knocked out), into the asylum at the stair-well
const way = await ev(() => {
  const G = game, h = G.hero;
  G.exitRoom({ x: -6, z: -65, a: 0 }, true, true); G.step(1);
  const d = G.story.doors().find((x) => x.room === 'asylum');
  h.pos.set(d.x, G.physics.groundAt(d.x, d.z, 20), d.z); h.onGround = true; G.doorCool = 0;
  for (let i = 0; i < 120 && !G.trans; i++) G.step(1 / 30);
  G.step(2.5); T.talkAll();
  const R = G.rooms.asylum;
  for (const e of G.enemies) if (e.group === 'asylum') e.setPresent(false);   // (look round in peace)
  const meshes = (pred) => { let n = 0; R.group.traverse((o) => { if (o.isMesh && pred(o)) n++; }); return n; };
  return { room: G.room?.id, wayIn: !!R.wayIn, breachDecal: meshes((o) => o.material?.map && o.material.transparent && Math.abs(o.position.x + R.group.position.x - R.wayIn.breach.x) < 0.2), cable: meshes((o) => o.geometry?.type === 'TubeGeometry'), cell: T.cell() };
});
check('in through the block-house on Citadel: the stair-well, the broken bricking, the breach in the west wall, the cable and pipes', way.room === 'asylum' && way.wayIn && way.breachDecal >= 1 && way.cable >= 3, way);
await snap('asylum-wayin');

// ---- 3. the cell: through its broken door by input, the look, the find once
const cell = await ev(() => {
  const G = game, R = G.rooms.asylum, out = {};
  T.at(56.5, 5, 47.5);   // the corridor north of the cell
  const lk = R.asylumCell.look;
  const r = P.go(lk.x, lk.z, { tol: 0.6, fight: false });
  out.go = r.r; out.inCell = T.cell();
  out.offered = G.findInteractable()?.kind;
  const k0 = G.hero.coins;
  G.input.taps.add('KeyE'); G.step(0.1); out.st = G.state;
  out.said = T.talkAll();
  for (let i = 0; i < 90; i++) G.step(1 / 30);   // (the kashes pop out and fly to him)
  out.kashes = (G.hero.coins) - k0;
  out.flag = !!G.flags.as_cell; out.searched = G.searched.includes('as_cell');
  out.again = G.findInteractable()?.kind ?? null;
  const c = R.cell(56.5, 5, 47.5), back = P.go(c.x, c.z, { tol: 0.6, fight: false });
  out.back = back.r; out.outCell = T.cell();
  return out;
});
check("Twinsen's cell: in through its broken door by input", cell.go === 'arrived' && cell.inCell[1] < 4.5 && cell.inCell[2] > 50.5, cell);
check('the look at his marks: his three short lines, then kashes (flag as_cell)', cell.st === 'dialog' && cell.said.some((s) => /Twelve years/.test(s)) && cell.said.some((s) => /pipe is warm/.test(s)) && cell.flag && cell.searched && cell.kashes > 0, cell);
// (the office's old register gave "Nothing here." from chapter 1 on: the generic search took it. Now in every chapter)
const reg = await ev(() => {
  const G = game, s = G.rooms.asylum.searches.find((x) => x.id === 'asylum_register'), h = G.hero, c0 = h.clovers;
  h.pos.set(s.x + 0.6, G.physics.groundAt(s.x + 0.6, s.z, 30), s.z); h.onGround = true; G.step(0.5);
  G.input.taps.add('KeyE'); G.step(0.1); const said = T.talkAll();
  return { chapter: G.flags.chapter, said, clover: h.clovers - c0 };
});
check('chapter 1: the old register in the office still gives its lines and clover', reg.clover === 1 && reg.said.some((x) => /Cell 2/.test(x)), reg);
check('the find is not offered again; out of the cell by input', cell.again !== 'roomsearch' && cell.back === 'arrived' && cell.outCell[2] < 50, cell);

// ---- 4. the cut-away and no ghost
const cut = await ev(() => {
  const G = game, R = G.rooms.asylum, out = {};
  T.at(20, 5, 10, 2);   // the room under the slab (the original's grid zone 1): the user's view
  out.room1 = { lids: T.lids(), ghost: T.ghost() };
  const lidMeshes = (name) => R.lidMeshes.filter(({ lids }) => lids.some((i) => (R.lids[i].name ?? 'zone' + R.lids[i].zone) === name));
  // (HOSTEL-CUT-2: zone 1 holds two halls under the upper floor; the one he stands in (the dorm) is cut — its ceiling,
  //  the upper floor over it —, the hall beside it stands, its ceiling and its camera-side wall)
  const z1 = R.lids.find((l) => l.zone === 1 && !l.name && !l.over), roomOf = (x, z) => z1.rooms.find((r) => r.cols.has(`${x},${z}`));
  Object.assign(out.room1, { rooms: z1.rooms.length, dorm: roomOf(20, 10)?.f, hall: roomOf(30, 10)?.f, dormCeil: R.cutAt(15, 13, 10), hallCeil: R.cutAt(30, 13, 10), hallWall: R.cutAt(30, 9, 19) });
  out.room1.hidden = out.room1.rooms === 2 && out.room1.dorm < 0.02 && out.room1.hall > 0.98 && out.room1.dormCeil > 0.98 && out.room1.hallCeil < 0.02 && out.room1.hallWall < 0.02;
  out.room1.othersShown = lidMeshes('cellB').some(({ mesh }) => mesh.visible && mesh.material.opacity > 0.98) && lidMeshes('zone3').some(({ mesh }) => mesh.visible);
  // the fade: a step in, part way
  T.at(29.5, 5, 24, 2);
  out.ghost3 = T.ghost();
  T.at(56, 3, 54, 2);   // his cell
  out.cellB = { lids: T.lids().filter((l) => /cell|zone1/.test(l.name)), ghost: T.ghost() };
  out.cellB.shownAgain = lidMeshes('zone1').every(({ mesh }) => mesh.visible && (!mesh.material.userData.lid || mesh.material.opacity > 0.98));   // (a pool under a lid keeps its water's own opacity: CUT-RESTORE)
  out.cellB.hidden = lidMeshes('cellB').every(({ mesh }) => !mesh.visible);
  // a fade takes a moment, not a frame: two frames after stepping back into room 1, its lid is on its way out
  T.at(20, 5, 10, 0.07); out.midFade = T.lids().find((l) => l.name === 'zone1').f;
  // where a wall does hide him (down in the store, behind the boiler — order 20: drawn as LBA1's round boiler now, not
  //  its cells' brick block, so a step further behind it): the silhouette stays
  T.at(8.5, 1, 49.5, 1.5); out.behind = T.ghost();
  return out;
});
check("in the room under the slab, its ceiling and near walls are cut away; the cell's, the next room's and the hall beside it under the same zone stay (HOSTEL-CUT-2)", cut.room1.hidden && cut.room1.othersShown && cut.room1.lids.find((l) => l.name === 'zone1')?.active, cut.room1);
check('in his cell, the beams and near walls over it are cut away, the room left behind has its ceiling back', cut.cellB.hidden && cut.cellB.shownAgain, cut.cellB);
check('the cut fades (not a jump): two frames in, the lid is part way', cut.midFade > 0.05 && cut.midFade < 0.95, { midFade: cut.midFade });
checkVisual('no ghost: under the cut-away ceiling he is drawn, not his silhouette (before: 100 % silhouette there)', cut.room1.ghost.r < 0.2 && cut.ghost3.r < 0.2 && cut.cellB.ghost.r < 0.2, { room1: cut.room1.ghost, room3: cut.ghost3, cell: cut.cellB.ghost });
checkVisual('where a wall really hides him, the silhouette still shows', cut.behind.r > 0.5, cut.behind);
// ---- 4b. HOSTEL-CUT-2 (the user, 17.11: "it still disappears, and that's not good"): only what hides him goes
const c2 = await ev(() => {
  const G = game, R = G.rooms.asylum, out = {};
  const z1 = R.lids.find((l) => l.zone === 1 && !l.name && !l.over), roomOf = (x, z) => z1.rooms.find((r) => r.cols.has(`${x},${z}`));
  // in the hall (the other half of the zone): the dorm's ceiling and the loft over it stand; the upper walk's things go
  // with the hall's ceiling under them
  T.at(30, 5, 10, 1.5);
  out.hall = { dorm: roomOf(20, 10)?.f, hall: roomOf(30, 10)?.f, dormCeil: R.cutAt(15, 13, 10), hallCeil: R.cutAt(30, 13, 10), cells: T.cutCells(), ghost: T.ghost() };
  // the stops of the user's walk where a lid stood between him and the camera: the upper walk by the laundry line (the
  // user's picture: the walk's beams were cut 14 m away), behind the loft's windowed wall, the kitchen under the roof
  // of the next room, the ward's corner by Vesk's office
  for (const [name, x, y, z] of [['laundry', 4, 15, 18], ['loftWall', 11, 15, 12], ['loftWall2', 12, 15, 18], ['kitchen', 24, 5, 24], ['wardCorner', 34, 5, 16], ['sideWay', 10.5, 5, 39.8]]) {
    T.at(x, y, z, 1.5); out[name] = { at: T.cell(), cells: T.cutCells(), ghost: T.ghost() };
  }
  // quick crossings of the doorway between the hall and the kitchen, then he stays in the kitchen: the hall stands again
  for (let i = 0; i < 8; i++) { T.at(24.5, 5, 18.0, 0.07); T.at(24.5, 5, 20.2, 0.07); }
  T.at(24.5, 5, 22, 1);
  out.cross = { at: T.cell(), hall: roomOf(30, 10)?.f, dorm: roomOf(20, 10)?.f, zone0: R.lids.find((l) => l.zone === 0 && !l.name).active, cells: T.cutCells() };
  // out of the asylum and back in: no hole nor room cut left from last time (the sight holes reset as the rooms)
  T.at(11, 15, 12, 1);
  out.before = { local: R.lids.filter((l) => l.local > 0.5).length };
  G.exitRoom({ x: G.world.well.x + 5, z: G.world.well.z + 5 }, true, true); G.step(0.5);
  G.enterRoom('asylum', null, true, true); G.frame(1 / 60, false);
  out.back = { at: T.cell(), local: R.lids.filter((l) => l.local > 0.01).map((l) => l.name ?? l.i), rooms: R.lidRooms.filter((r) => r.f < 0.99).length, uniform: [...R.cutU.uCutRooms.value].filter((v) => v > 0).length };
  return out;
});
check('HOSTEL-CUT-2: in the hall beside the dorm, the hall is cut and the dorm under the same zone stands (its ceiling, the loft); nothing else far from him is cut',
  c2.hall.hall < 0.02 && c2.hall.dorm > 0.98 && c2.hall.dormCeil < 0.02 && c2.hall.hallCeil > 0.98 && c2.hall.cells.far === 0, c2.hall);
check('HOSTEL-CUT-2: at the stops where a lid stands between him and the camera, the cut is a hole round his sight line (no cell cut farther than 3.6 m from it)',
  ['laundry', 'loftWall', 'loftWall2', 'kitchen', 'wardCorner', 'sideWay'].every((k) => c2[k].cells.far === 0), Object.fromEntries(['laundry', 'loftWall', 'loftWall2', 'kitchen', 'wardCorner', 'sideWay'].map((k) => [k, c2[k]])));
checkVisual('HOSTEL-CUT-2: behind the loft\'s windowed wall, in the kitchen under the next room\'s roof and at the ward\'s corner by Vesk\'s office he is drawn, not his silhouette (before: 1.0 and 0.58 behind the wall, 0.46 in the kitchen)',
  ['loftWall', 'loftWall2', 'kitchen', 'wardCorner', 'hall'].every((k) => c2[k].ghost.r < 0.2), Object.fromEntries(['loftWall', 'loftWall2', 'kitchen', 'wardCorner', 'hall'].map((k) => [k, c2[k].ghost.r])));
check('HOSTEL-CUT-2: quick crossings of the hall\'s doorway, then the kitchen: the hall stands again, the kitchen is cut, nothing far from him', c2.cross.hall > 0.98 && c2.cross.dorm > 0.98 && c2.cross.zone0 && c2.cross.cells.far === 0, c2.cross);
check('HOSTEL-CUT-2: out and back in, no hole and no room cut is left from last time', c2.before.local > 0 && c2.back.local.length === 0 && c2.back.rooms <= 1 && c2.back.uniform <= 1, { before: c2.before, back: c2.back });
await ev(() => T.at(20, 5, 10, 2)); await snap('asylum-room1');
await ev(() => T.at(55, 3, 54, 2)); await snap('asylum-cell');

// ---- 5. save → quit → Continue
await ev(() => { const G = game; T.at(56.5, 5, 47.5); G.save(false); });
const keepFile = path.join(os.tmpdir(), 'asylum-save-' + process.pid + '.json');
await quitAndKeep(page, context, keepFile);
await browser.close();
({ browser, context, page } = await launch({ storageState: keepFile }));
await open(page, '?nocine');
await menu(page, 'continue');
await helpers();
const re = await ev(() => {
  const G = game; for (let i = 0; i < 60 && G.trans; i++) G.step(0.1); T.talkAll();
  const R = G.rooms.asylum, out = { room: G.room?.id, flag: !!G.flags.as_cell, searched: G.searched.includes('as_cell') };
  for (const e of G.enemies) if (e.group === 'asylum') e.setPresent(false);
  if (R) { T.at(53.2, 3, 53.0, 1.5); out.offered = G.findInteractable()?.kind ?? null; out.cellLid = T.lids().find((l) => l.name === 'cellB'); T.at(20, 5, 10, 1.5); out.zone1 = T.lids().find((l) => l.name === 'zone1'); }
  return out;
});
try { fs.unlinkSync(keepFile); } catch { /* gone */ }
check('after save → quit → Continue: the find stays taken (as_cell), not offered again; the cut-away works', re.room === 'asylum' && re.flag && re.searched && re.offered !== 'roomsearch' && re.cellLid?.active && re.zone1?.active, re);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
