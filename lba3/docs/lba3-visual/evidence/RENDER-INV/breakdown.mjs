// RENDER-INV: where one frame's CPU goes, inclusive per subsystem (simulation parts and the render's passes), per
// situation; medians over N frames with the GPU queue drained before each (SwiftShader: CPU proxy, not GPU time).
//   GAME_URL=http://localhost:8176/ QUALITY=medium N=40 SCENES=street,harbour,house,combat,zeelich node breakdown.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import os from 'node:os';
const quality = process.env.QUALITY || 'medium', N = +(process.env.N || 40);
const SCENES = (process.env.SCENES || 'street,harbour,house,combat,zeelich').split(',');
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const out = { quality, N, load: os.loadavg().map((x) => +x.toFixed(2)) };
out.res = await page.evaluate(async ({ N, SCENES }) => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const R = G.renderer, W = R.renderer, gl = W.getContext(), px = new Uint8Array(4);
  const T = {};
  const wrap = (obj, key, name) => { const f = obj[key]; if (typeof f !== 'function') return; obj[key] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { T[name] = (T[name] || 0) + performance.now() - t0; } }; };
  // simulation parts
  wrap(G.hero, 'update', 'hero');
  wrap(G.camRig, 'update', 'camera');
  wrap(G, 'occluders', 'occluders');
  wrap(G, 'findInteractable', 'findInteractable');
  wrap(G.world, 'update', 'world.update (Citadel updaters)');
  wrap(G.env, 'update', 'env');
  wrap(G.lightPool, 'update', 'lightPool');
  wrap(G.shadowCull, 'update', 'shadowCull');
  wrap(G.world, 'updateLod', 'LOD');
  wrap(G.particles, 'update', 'particles');
  wrap(G.pickups, 'update', 'pickups');
  wrap(G.hud, 'mapTick', 'hud.mapTick');
  wrap(G.hud, 'stats', 'hud.stats');
  wrap(G.hud, 'prompt', 'hud.prompt');
  wrap(G.hud, 'updateFloats', 'hud.floats');
  wrap(G.audio, 'updateSources', 'audio');
  wrap(G.story, 'update', 'story');
  wrap(G.combatDir, 'update', 'combatDir');
  wrap(G.targeting, 'update', 'targeting');
  wrap(G.ball, 'update', 'ball');
  wrap(G.weapons, 'update', 'weapons');
  wrap(G.gadgets, 'update', 'gadgets');
  wrap(G.gadgets, 'updateEnemies', 'enemies');
  wrap(G.bolts, 'update', 'bolts');
  wrap(G.behMenu, 'render', 'behMenu.render');
  for (const n of G.npcs) wrap(n, 'update', 'npcs');
  // render parts
  wrap(R, 'pre', 'r.pre (FarCull, blobs)');
  wrap(R, 'post', 'r.post');
  wrap(R.composer, 'render', 'r.composer');
  wrap(W.shadowMap, 'render', 'r.shadow pass');
  wrap(R.scenePass, 'render', 'r.scene pass (incl. shadow pass)');
  wrap(R.output, 'render', 'r.output pass');
  wrap(G.scene, 'updateMatrixWorld', 'r.matrices');
  const scenes = {
    street: () => { const r = G.bench.routes().find((x) => x.id === 'street'); r.setup(); return (t, dt) => r.drive(t + 2, dt); },
    harbour: () => { G.exitRoom({ x: -100, z: 40, a: -1.6 }, true, true); G.bench.camera(); G.camRig.yaw = -Math.PI / 2; G.camRig.pitch = 0.3; },
    house: () => { G.enterRoom('house', null, true, true); },
    combat: () => { const r = G.bench.routes().find((x) => x.id === 'combat'); r.setup(); return (t, dt) => r.drive(t, dt); },
    zeelich: () => { G.enterRoom('zeelich', null, true, true); },
    desert: () => { G.enterRoom('desert', null, true, true); },
  };
  const res = {};
  for (const s of SCENES) {
    G.state = 'play'; const drive = scenes[s](); G.state = 'play';
    // warm: the map of the area finished, shadow batches built
    if (!G.room || G.room.outdoor) G.hud._base(G.room ? G.room.id : 'citadel').finish();
    for (let i = 0; i < 30; i++) { drive?.(i / 30, 1 / 30); G.frame(1 / 30, i % 5 === 4); }
    const rows = [];
    for (let i = 0; i < N; i++) {
      drive?.(1 + i / 30, 1 / 30);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (const k in T) T[k] = 0;
      G.perf.beginFrame(); G._renderMs = 0;
      const t0 = performance.now(); G.frame(1 / 30, true); const t1 = performance.now();
      rows.push({ total: t1 - t0, render: G._renderMs, sim: t1 - t0 - G._renderMs, calls: W.info.render.calls, shadowCalls: G.perf.shadow, ...T });
    }
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const med = (k) => { const v = rows.map((r) => r[k] || 0).sort((a, b) => a - b); return +v[v.length >> 1].toFixed(2); };
    res[s] = Object.fromEntries(keys.map((k) => [k, med(k)]).sort((a, b) => b[1] - a[1]));
  }
  return res;
}, { N, SCENES });
out.loadAfter = os.loadavg().map((x) => +x.toFixed(2)); out.errors = errs.slice(0, 5);
console.log(JSON.stringify(out, null, 1));
await browser.close();
