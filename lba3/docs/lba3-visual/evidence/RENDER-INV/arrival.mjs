// RENDER-INV: the game's CPU per displayed frame (Game.advance: simulation steps + render submission; the GPU queue
// drained before each, so SwiftShader's raster is not charged) in the first seconds after arriving in an area whose
// map is not drawn yet, as on a first visit or after a new game / Continue. REAL = the displayed frame interval fed
// to advance (1/60: one simulation step a frame; 1/20: two, as on a slow machine). Frames over 16.7/33/50 ms of CPU.
//   GAME_URL=http://localhost:8176/ REAL=0.05 FRAMES=150 node arrival.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import os from 'node:os';
const quality = process.env.QUALITY || 'medium', REAL = +(process.env.REAL || 1 / 60), FR = +(process.env.FRAMES || 150);
const AREAS = (process.env.AREAS || 'citadel,zeelich,desert,hamalayi').split(',');
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const load = os.loadavg()[0];
const out = await page.evaluate(({ REAL, FR, AREAS }) => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const gl = G.renderer.renderer.getContext(), px = new Uint8Array(4), res = {};
  G.renderer.setAutoRes(false);   // (a fixed resolution on both sides)
  for (const id of AREAS) {
    if (id === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); else G.enterRoom(id, null, true, true);
    G.state = 'play';
    for (let i = 0; i < 6; i++) G.frame(1 / 30, true);           // (shadow batches, uploads: the black frame's work)
    G.hud._bases.delete(id);                                         // (its map not drawn yet: a first visit)
    const T = id === 'citadel' ? G.terrain : G.rooms[id]?.terrain; if (T) delete T._mapAlb;
    G.last = performance.now();
    const ms = [];
    for (let i = 0; i < FR; i++) {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t0 = performance.now(); G.advance(REAL); ms.push(performance.now() - t0);
    }
    const s = ms.slice().sort((a, b) => a - b), p = (q) => +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(1);
    res[id] = { p50: p(0.5), p95: p(0.95), p99: p(0.99), max: p(1), over16: ms.filter((x) => x > 16.7).length, over33: ms.filter((x) => x > 33.3).length, over50: ms.filter((x) => x > 50).length, mapDone: !!G.hud._bases.get(id)?.done };
  }
  return res;
}, { REAL, FR, AREAS });
console.log(JSON.stringify({ quality, REAL, FR, load, loadAfter: os.loadavg()[0], out, errors: errs.slice(0, 5) }));
await browser.close();
