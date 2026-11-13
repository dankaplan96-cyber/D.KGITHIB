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
// Automated runtime only (SwiftShader here): counts, never frame rates.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker({ info: 'always' });
const W = +process.env.W || 1366, H = +process.env.H || 768, Q = process.env.QUALITY || 'medium';
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await launch({ width: W, height: H });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev((Q) => {
  const G = game;
  G.settings.quality = Q; G.settings.qualityAuto = false; G.settings.qualityChosenByHand = true; G.applySettings();
  P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); P.settle();
  // counters: one rendered frame through renderBufferDirect (as tests/drawcalls.mjs and residents.mjs frameCost)
  window.taCost = () => {
    const R = G.renderer.renderer; const c = { main: 0, shadow: 0, tris: 0 };
    const orig = R.renderBufferDirect.bind(R);
    R.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => {
      c[scene ? 'main' : 'shadow']++;
      const n = grp ? grp.count : geo.index ? geo.index.count : geo.attributes.position?.count || 0;
      if (scene) c.tris += (obj.isInstancedMesh ? obj.count : 1) * n / 3;
      return orig(cam, scene, geo, mat, obj, grp);
    };
    G.perf?.beginFrame?.(); G.frame(1 / 30, true);
    R.renderBufferDirect = orig;
    const m = R.info.memory;
    return { draws: c.main + c.shadow, main: c.main, shadow: c.shadow, tris: Math.round(c.tris), geometries: m.geometries, textures: m.textures, programs: R.info.programs.length };
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
}

// the route by input: landing → the workshop door → in and out three times
const route = await ev(([lx, lz, la, dx, dz]) => {
  const G = game, Z = G.rooms.zeelich, o = Z.group.position;
  taAt(lx, lz, la);
  const t0 = G.time;
  const r1 = P.go(o.x + dx, o.z + dz - 2.5, { tol: 0.8, run: false, maxT: 120, fight: false }); P.settle();
  const walked = { ok: Math.hypot(G.hero.pos.x - o.x - dx, G.hero.pos.z - o.z - (dz - 2.5)) < 1.2, t: +(G.time - t0).toFixed(1), at: [+(G.hero.pos.x - o.x).toFixed(2), +(G.hero.pos.z - o.z).toFixed(2)] };
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
  return { walked, visits, r1: r1?.r || r1 };
}, [spots.land[0], spots.land[1], spots.land[2], dx, dz]);
console.log('ROUTE ' + JSON.stringify(route));
check('he walks by input from the landing to the workshop door', route.walked.ok, route.walked);
check('three visits: in to the workshop, out to Zeelich by its door', route.visits.every((v) => v.in === 'workshop' && v.out === 'zeelich' && v.near < 3.0), route.visits);
const tally = await ev(() => (window.__techart ? window.__techart() : null));
if (tally) console.log('TALLY ' + JSON.stringify(tally));
console.log('COUNTS ' + JSON.stringify(counts));
done();
await browser.close();
