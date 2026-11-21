// TECH-ART-1 (docs/lba-maturity/TECH-ART-1.md): the chapter-3 Zeelich landing, seen and counted the same way on any
// revision. Chapter 3 is reached by its flags (as tests/zeelich-doors.mjs does); the views are fixed hero spots with the
// game's own Follow camera (snapped, then settled for 60 frames), at the window size given (default 1366x768).
//   VIEWS: dock (the spaceport deck where the ship sets him down, facing the island), bridge (the footbridge's island end,
//   facing north), street (the street at the workshop, looking along it from the west), door (3 m from the workshop's
//   door, facing it), resident (Twinsen beside the nearest resident on the street), back (the street's south side,
//   facing the dock).
//   For each: submitted draws (main/shadow), triangles, the renderer's live geometries/textures/programs.
//   The route: the hero walks by input from the landing to the workshop door, in and out three times (the rebuilds of
//   the workshop's static batches are counted on each visit: TECH-ART-1's waste counter).
// SHOTS=dir writes x-<view>.jpg (Zeelich is chapter 3: x- pictures are for the team only).
// QUALITY=low|medium|high (default medium, by hand). W=, H= the window.
// LIVE=secs (off by default): at each view, after the counts, the game's own loop runs live (real requestAnimationFrame
// frames, the hero standing) for WARM s (default 3) and then LIVE s, and game.perf.stats() is printed as LIVE <view>:
// frame-time p50/p95/p99/max, CPU simulation and render submission p50/p95, draw calls, and the GPU's own time per frame
// where the browser offers a timer query (else null). Meant for a real GPU (CLOUD_ORDERS order 42, the Vega 8); on
// SwiftShader its times mean nothing.
// Automated runtime only (SwiftShader here): counts, never frame rates.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker({ info: 'always' });
const W = +process.env.W || 1366, H = +process.env.H || 768, Q = process.env.QUALITY || 'medium';
const SHOTS = process.env.SHOTS || null;
const LIVE = +process.env.LIVE || 0, WARM = process.env.WARM != null ? +process.env.WARM : 3;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await launch({ width: W, height: H });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(async () => {
  // the waste counter (TECH-ART-1): every BufferGeometry given its first position attribute, and how many of them came
  // from the walkers' carried props (walkers.js)
  const THREE = await import('three');
  const C = window.__taGeo = { all: 0, carry: 0, carryMat: 0 };
  const ps = THREE.BufferGeometry.prototype.setAttribute;
  THREE.BufferGeometry.prototype.setAttribute = function (n, a) {
    if (n === 'position' && !this.__ta) { this.__ta = 1; C.all++; if (/walkers\.js/.test(new Error().stack.split('\n').slice(2, 5).join(' '))) C.carry++; }
    return ps.call(this, n, a);
  };
  const sv = THREE.Material.prototype.setValues;   // (and the materials made from the carried props' code: a throwaway default material counts too)
  THREE.Material.prototype.setValues = function (v) { if (/walkers\.js/.test(new Error().stack.split('\n').slice(2, 9).join(' '))) C.carryMat++; return sv.call(this, v); };
});
await ev((Q) => {
  const G = game;
  G.settings.quality = Q; G.settings.qualityAuto = false; G.settings.qualityChosenByHand = true; G.applySettings();
  P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); P.settle();
  // counters: one rendered frame through renderBufferDirect (as tests/drawcalls.mjs and residents.mjs frameCost)
  window.taCost = () => {
    const R = G.renderer.renderer; const c = { main: 0, shadow: 0, tris: 0 }, drawnMats = new Set();
    const orig = R.renderBufferDirect.bind(R);
    R.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => {
      c[scene ? 'main' : 'shadow']++; if (scene) drawnMats.add(mat);
      const n = grp ? grp.count : geo.index ? geo.index.count : geo.attributes.position?.count || 0;
      if (scene) c.tris += (obj.isInstancedMesh ? obj.count : 1) * n / 3;
      return orig(cam, scene, geo, mat, obj, grp);
    };
    G.perf?.beginFrame?.(); G.frame(1 / 30, true);
    R.renderBufferDirect = orig;
    const m = R.info.memory;
    // (materials: three keeps no count, so the unique materials on every mesh in the scene graph, and those the main pass drew)
    const sceneMats = new Set(); G.scene.traverse((o) => { if (o.material) for (const q of [].concat(o.material)) sceneMats.add(q); });
    return { draws: c.main + c.shadow, main: c.main, shadow: c.shadow, tris: Math.round(c.tris), geometries: m.geometries, materials: sceneMats.size, drawnMaterials: drawnMats.size, textures: m.textures, programs: R.info.programs.length };
  };
  // the hero at a spot, the camera snapped and settled
  window.taAt = (lx, lz, a) => {
    const Z = G.rooms.zeelich, o = Z.group.position, h = G.hero;
    if (G.room?.id !== 'zeelich') G.enterRoom('zeelich', { x: o.x + lx, z: o.z + lz, a }, true, true);
    const x = o.x + lx, z = o.z + lz;
    h.pos.set(x, G.physics.groundAt(x, z, 20), z); h.angle = a; h.onGround = true; h.vy = 0;
    G.camRig.snap(); for (let i = 0; i < 60; i++) G.frame(1 / 30, i % 6 === 5);
    return { hero: [+h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2), +a.toFixed(3)], cam: G.camera.position.toArray().map((v) => +v.toFixed(2)) };
  };
}, Q);
const env = await ev(() => { const G = game, gl = G.renderer.renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); const R = G.renderer.renderer; return { room: G.room?.id, chapter: G.flags.chapterKey, quality: G.settings.quality, auto: G.settings.qualityAuto, camera: G.settings.camera, camDist: G.settings.camDist, visual: G.settings.visual, aa: G.settings.aa, pixelRatio: R.getPixelRatio(), size: [R.domElement.width, R.domElement.height], gpu: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?' }; });
console.log('ENV ' + JSON.stringify(env));
check('chapter 3 begins on Zeelich', env.room === 'zeelich' && env.chapter === 'zeelich', env);

// LIVE: the game's own loop, real frames, the hero standing at the view (the camera as the snap left it)
const live = async (name) => {
  if (!LIVE) return;
  await page.bringToFront();   // (a window in the background is drawn at 8 fps by design: PERF-BATTERY)
  await ev(() => { game.foreground?.(); game.testFreeze = false; game.perf.reset(); });
  await page.waitForTimeout(WARM * 1000);
  await ev(() => game.perf.reset());
  await page.waitForTimeout(LIVE * 1000);
  const st = await ev(() => { const s = game.perf.stats() || { frames: 0 }; game.testFreeze = true; const m = performance.memory; return { ...s, background: !!game.background, heapMB: m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null, geometries: game.renderer.renderer.info.memory.geometries }; });
  console.log(`LIVE ${name} ${JSON.stringify({ frames: st.frames, fps: st.fps, frameMs: st.frameMs, simMs: st.simMs, renderMs: st.renderMs, gpuMs: st.gpuMs, calls: st.calls, draws: st.draws, tris: st.tris, lostS: st.lostS, bgFrames: st.pace?.bg, background: st.background, heapMB: st.heapMB, geometries: st.geometries })}`);
  if (!st.frames || st.background) console.log(`LIVE ${name}: NOT VALID (${!st.frames ? 'no frame drawn in the window' : 'the window was in the background'})`);
};
const shot = async (name) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, 'x-' + name + '.jpg'), type: 'jpeg', quality: 82, timeout: 600000 }); };
// the workshop door (local), the nearest resident to it
const spots = await ev(() => { const G = game, Z = G.rooms.zeelich, o = Z.group.position, d = Z.workshopDoor; return { door: [d.x - o.x, d.z - o.z], land: [Z.spaceport.landing.x - o.x, Z.spaceport.landing.z - o.z, Z.spaceport.landing.a] }; });
const [dx, dz] = spots.door;
const VIEWS = [
  ['dock', spots.land[0], spots.land[1], spots.land[2]],
  ['bridge', -4, 24.5, Math.PI],
  ['street', -24, 1.5, Math.PI / 2],
  ['door', dx, dz - 3, 0],
  ['back', -6, 21, 0],
];
const counts = {};
for (const [name, x, z, a] of VIEWS) {
  const at = await ev(([x, z, a]) => taAt(x, z, a), [x, z, a]);
  const c = await ev(() => taCost());
  counts[name] = c;
  console.log(`VIEW ${name} ${JSON.stringify(at)} ${JSON.stringify(c)}`);
  await shot(name);
  await live(name);
}
// Twinsen beside a resident: the nearest present one to the workshop door, he stands 1.6 m from it, facing it
const rs = await ev(([dx, dz]) => {
  const G = game, o = G.rooms.zeelich.group.position;
  const near = G.npcs.filter((n) => n.present && !n.def.indoor && Math.abs(n.pos.x - o.x) < 70 && Math.abs(n.pos.z - o.z) < 35).map((n) => ({ id: n.def.id, x: n.pos.x - o.x, z: n.pos.z - o.z, d: Math.hypot(n.pos.x - o.x - dx, n.pos.z - o.z - dz) })).sort((a, b) => a.d - b.d);
  return near.slice(0, 3);
}, [dx, dz]);
if (rs.length) {
  const r = rs[0], hx = r.x - 1.6, hz = r.z + 0.6;
  const at = await ev(([x, z, a, id]) => { const n = game.npcs.find((q) => q.def.id === id); if (n) { n.pos.set(n.pos.x, n.pos.y, n.pos.z); } return taAt(x, z, a); }, [hx, hz, Math.atan2(r.x - hx, r.z - hz), r.id]);
  const c = await ev(() => taCost()); counts.resident = c;
  console.log(`VIEW resident ${r.id} ${JSON.stringify(at)} ${JSON.stringify(c)}`);
  await shot('resident');
  await live('resident');
}

// the route by input: landing → the workshop door → in and out three times. On the way, every 0.5 s of game time: is
// one of the workshop's marks (its door; its hanging sign; where the revision has them, R.workshopMarks: the hanging
// sign and the east board) in the Follow camera's view and not hidden by the island's own geometry (a ray from the lens
// to the mark against the drawn meshes of Zeelich's group)? The first time each is seen, and from how far.
const route = await ev(async ([lx, lz, la, dx, dz]) => {
  const THREE = await import('three');
  const G = game, Z = G.rooms.zeelich, o = Z.group.position;
  const marks = [{ id: 'door', x: Z.workshopDoor.x, y: 7.2, z: Z.workshopDoor.z }];
  if (Z.workshopMarks) Z.workshopMarks.forEach((m, i) => marks.push({ id: i ? 'east board' : 'hanging sign', ...m }));
  else marks.push({ id: 'hanging sign', x: o.x - 9.25, y: 8.62, z: o.z + 8.32 });   // (the base: zeelich.js workshopClutter's sign, as built there)
  const shown = (ob) => { for (let p = ob; p; p = p.parent) if (!p.visible) return false; return true; };
  const occ = []; Z.group.traverse((m) => { if (m.isMesh && m.layers.test(G.camera.layers) && shown(m) && !m.isSkinnedMesh) occ.push(m); });
  const rc = new THREE.Raycaster(), v = new THREE.Vector3(), seen = {}, last = {};
  let next = 0;
  const sample = () => {
    if (G.time < next) return false; next = G.time + 0.5;
    const cam = G.camera; cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();   // (stepped, not rendered: three sets the inverse in render())
    for (const m of marks) {
      if (seen[m.id]) continue;
      v.set(m.x, m.y, m.z).project(cam);
      if (Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95 || v.z > 1) continue;
      const d = cam.position.distanceTo(v.set(m.x, m.y, m.z));
      rc.set(cam.position, v.clone().sub(cam.position).normalize()); rc.far = d; rc.near = 0.1;
      const hit = rc.intersectObjects(occ, false)[0];
      if (hit) last[m.id] = { hero: [+(G.hero.pos.x - o.x).toFixed(1), +(G.hero.pos.z - o.z).toFixed(1)], cam: cam.position.toArray().map((q, i) => +(q - [o.x, 0, o.z][i]).toFixed(1)), hitAt: hit.point.toArray().map((q, i) => +(q - [o.x, 0, o.z][i]).toFixed(2)), of: +d.toFixed(1), by: hit.object.name || hit.object.parent?.name };
      if (!hit || hit.distance > d - 0.35) seen[m.id] = { t: +(G.time - t0).toFixed(1), heroToDoor: +Math.hypot(G.hero.pos.x - Z.workshopDoor.x, G.hero.pos.z - Z.workshopDoor.z).toFixed(1), camDist: +d.toFixed(1) };
    }
    return false;
  };
  taAt(lx, lz, la);
  const t0 = G.time;
  const r1 = P.go(o.x + dx, o.z + dz - 2.5, { tol: 0.8, run: false, maxT: 120, fight: false, stopWhen: sample });
  P.face(Z.workshopDoor.x, Z.workshopDoor.z);   // (he turns to the door, as a player would)
  for (let i = 0; i < 90; i++) { G.step(1 / 30); sample(); }   // (3 s standing at the door: the camera comes round behind him)
  P.settle();
  const walked = { ok: Math.hypot(G.hero.pos.x - o.x - dx, G.hero.pos.z - o.z - (dz - 2.5)) < 1.2, t: +(r1?.t ?? 0).toFixed(1), at: [+(G.hero.pos.x - o.x).toFixed(2), +(G.hero.pos.z - o.z).toFixed(2)] };
  const visits = [];
  window.__taRebuilds = window.__taRebuilds || 0;
  for (let k = 0; k < 3; k++) {
    const tin = P.through(o.x + dx, o.z + dz);
    const inRoom = G.room?.id;
    for (let i = 0; i < 20; i++) G.frame(1 / 30, i % 5 === 4);
    const e = G.room?.exits?.find((x) => !x.room || x.room === 'zeelich') || G.room?.exits?.[0];
    const tout = e ? P.through(e.x, e.z) : { to: 'no exit' };
    for (let i = 0; i < 20; i++) G.frame(1 / 30, i % 5 === 4);
    visits.push({ in: inRoom, out: G.room?.id, near: +Math.hypot(G.hero.pos.x - o.x - dx, G.hero.pos.z - o.z - dz).toFixed(2) });
  }
  return { walked, visits, r1: r1?.r || r1, marks: marks.map((m) => m.id), seen, lastBlocked: last };
}, [spots.land[0], spots.land[1], spots.land[2], dx, dz]);
console.log('ROUTE ' + JSON.stringify(route));
console.log('FIRST SEEN on the walk from the landing (s after setting off; his distance to the door; the lens\'s to the mark) ' + JSON.stringify(route.seen));
check('he walks by input from the landing to the workshop door', route.walked.ok, route.walked);
check('three visits: in to the workshop, out to Zeelich by its door', route.visits.every((v) => v.in === 'workshop' && v.out === 'zeelich' && v.near < 3.0), route.visits);
// street life: SECS s of game time on the street by the plaza (default 120), the hero standing: the geometries made,
// and the renderer's live geometries before and after
const SECS = +process.env.SECS || 120;
const life = await ev((SECS) => {
  const G = game, R = G.renderer.renderer, C = window.__taGeo;
  taAt(-24, 1.5, Math.PI / 2);
  const a = { all: C.all, carry: C.carry, carryMat: C.carryMat, live: R.info.memory.geometries };
  for (let s = 0; s < SECS; s++) for (let i = 0; i < 30; i++) G.frame(1 / 30, i === 29);
  return { secs: SECS, made: C.all - a.all, carried: C.carry - a.carry, walkersMaterials: C.carryMat - a.carryMat, liveGrowth: R.info.memory.geometries - a.live };
}, SECS);
// the carried props after the street life: every carrier holds its prop in its hand, drawn (meshes with geometry and a
// material, shown); carriers of one kind share one geometry per part (the candidate) or hold their own (the base)
const held = await ev(() => {
  const out = [];
  for (const n of game.npcs) {
    const m = n.carryMesh; if (!m) continue;
    const parts = []; m.traverse((o) => { if (o.isMesh) parts.push(o); });
    let shown = true; for (let p = m; p; p = p.parent) if (!p.visible) shown = false;
    out.push({ id: n.def.id, kind: n.carrying, inHand: !!m.parent && m.parent !== game.scene, parts: parts.length, drawable: parts.every((o) => o.geometry?.attributes?.position && o.material && !Array.isArray(o.material)), shown, geo0: parts[0]?.geometry.uuid });
  }
  const byKind = {}; for (const c of out) (byKind[c.kind] ??= new Set()).add(c.geo0);
  return { carriers: out.map(({ geo0, ...c }) => c), kinds: Object.fromEntries(Object.entries(byKind).map(([k, s]) => [k, { carriers: out.filter((c) => c.kind === k).length, firstPartGeometries: s.size }])) };
});
console.log('HELD ' + JSON.stringify(held));
check('carried props: each carrier holds a drawable prop in its hand', held.carriers.every((c) => c.inHand && c.parts > 0 && c.drawable), held);
const geoAll = await ev(() => window.__taGeo);
console.log('WASTE carried-prop geometries made over the whole run: ' + geoAll.carry + ' (of ' + geoAll.all + ' geometries made in all); materials made from walkers.js code: ' + geoAll.carryMat + '; street life ' + JSON.stringify(life));
console.log('COUNTS ' + JSON.stringify(counts));
done();
await browser.close();
