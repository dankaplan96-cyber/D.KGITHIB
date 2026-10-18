// VP-10 cost, same conditions before/after (node run.mjs perf.mjs 1280 720; TAG=before|after; quality as saved: a
// fresh profile, so the default "high"). SwiftShader (CPU-only WebGL): render times are not GPU times.
//  1) fixed spots: placed and settled, a fresh shot behind him, 3 warm-up renders, then 9 measured renders
//     (renderer.info reset before each; render() wall time with gl.finish()): draw calls, triangles, p50/p90 ms
//  2) CPU per frame of the camera (camRig.update) and of Game.occluders while walking a route by input through
//     the town (300 steps of 1/30 s): mean and p95 µs per call — the search and hidden test vs the old faders
const SPOTS = [
  ['square', { x: -42, z: -2, a: 0.6 }],
  ['lane', { x: -45.5, z: 52, a: Math.PI }],
  ['harbour-lane', { x: -80, z: 37, a: -1.5 }],
  ['customs', { x: -107, z: 37, a: -1.2 }],
  ['deck-wait-n', { x: -6.6, z: 33.76, a: 0, deckY: true }],
  ['door', { door: true }],
  ['fort-yard', { fort: true }],
];
import { DRIVE, FRAME } from './lib.mjs';
export default async ({ ev, log, EVD }) => {
  const T = process.env.TAG || 'x';
  await ev(`window.__F = ${JSON.stringify(FRAME)}; ${DRIVE}`);
  const out = {};
  for (const [name, s0] of SPOTS) {
    out[name] = await ev(([name, s]) => {
      const G = game, h = G.hero, W = G.world;
      if (s.door) { const hs = W.houses.find((q) => q.id === 'twinsen'); const a = Math.atan2(hs.door.x - hs.x, hs.door.z - hs.z); s = { x: hs.door.x + Math.sin(a) * 0.6, z: hs.door.z + Math.cos(a) * 0.6, a }; }
      if (s.fort) s = { x: W.station.x - 3, z: W.station.z + 8.4, a: Math.PI };
      G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true);
      if (s.deckY) h.pos.y = W.spaceport.deck.y;
      G.step(0.5); h.angle = s.a; G.camRig.lba.init = false; G.step(1.5);
      const R = G.renderer, info = R.renderer.info, gl = R.renderer.getContext();
      for (let i = 0; i < 3; i++) { info.reset(); R.render(); }
      gl.finish();
      const calls = [], tris = [], ms = [];
      for (let i = 0; i < 9; i++) { info.reset(); const t0 = performance.now(); R.render(); gl.finish(); ms.push(performance.now() - t0); calls.push(info.render.calls); tris.push(info.render.triangles); }
      ms.sort((a, b) => a - b);
      const pct = (p) => +ms[Math.min(ms.length - 1, Math.floor(p * ms.length))].toFixed(1);
      const c = G.camera.position;
      return { pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), pitch: +(Math.atan2(c.y - h.pos.y, Math.hypot(c.x - h.pos.x, c.z - h.pos.z)) * 57.3).toFixed(1), calls: Math.max(...calls), tris: Math.max(...tris), ms50: pct(0.5), ms90: pct(0.9), geos: info.memory.geometries, texs: info.memory.textures, progs: info.programs.length };
    }, [name, s0]);
    log(name, JSON.stringify(out[name]));
  }
  // CPU: the camera and the occluder hook while walking the town by input
  const cpu = await ev(() => {
    const G = game, acc = { cam: [], occ: [], step: [] };
    const wrap = (o, k, list) => { const f = o[k]; o[k] = function (...a) { const t0 = performance.now(); const r = f.apply(this, a); list.push(performance.now() - t0); return r; }; return () => { o[k] = f; }; };
    G.exitRoom({ x: -40, z: 8, a: Math.PI }, true, true); G.step(0.5); G.camRig.lba.init = false; G.step(0.5);
    const un1 = wrap(G.camRig, 'update', acc.cam), un2 = wrap(G, 'occluders', acc.occ);
    const route = [[-42, -6], [-55, -14], [-60, -22], [-36, -30], [-28, -20], [-30, 8], [-48, 18], [-48, 30]];
    let ri = 0; window.__drive(route[0][0], route[0][1], 1.0);
    for (let i = 0; i < 300; i++) {
      const h = G.hero.pos; if (Math.hypot(h.x - route[ri][0], h.z - route[ri][1]) < 1.2 && ri < route.length - 1) { ri++; window.__drive(route[ri][0], route[ri][1], 1.0); }
      const t0 = performance.now(); window.__driveStep(1 / 30); acc.step.push(performance.now() - t0);
    }
    un1(); un2(); P.release();
    const st = (l) => { const s = [...l].sort((a, b) => a - b); return { n: s.length, meanUs: +(1000 * s.reduce((a, b) => a + b, 0) / s.length).toFixed(1), p95Us: +(1000 * s[Math.floor(0.95 * (s.length - 1))]).toFixed(1), maxUs: +(1000 * s[s.length - 1]).toFixed(1) }; };
    return { camRigUpdate: st(acc.cam), occluders: st(acc.occ), gameStepMs: { mean: +(acc.step.reduce((a, b) => a + b, 0) / acc.step.length).toFixed(2) }, end: [G.hero.pos.x, G.hero.pos.z].map((v) => +v.toFixed(1)), leg: ri };
  });
  log('cpu', JSON.stringify(cpu));
  const fs = await import('node:fs');
  fs.mkdirSync(EVD + '/logs', { recursive: true });
  fs.writeFileSync(`${EVD}/logs/perf-${T}.json`, JSON.stringify({ spots: out, cpu, ua: await ev(() => navigator.userAgent), gpu: await ev(() => game.perf?.gpu || null), quality: await ev(() => game.settings.quality) }, null, 1));
};
