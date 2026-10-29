// PERF-CPU: the area's meshes the draw batches leave alone, and why (drawbatch.js eligible(): casts its own shadow,
// see-through, a shader material, under userData.keep, …). GAME_URL=http://localhost:8214/ ROUTE=combat Q=low node unbatched.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'low', ID = process.env.ROUTE || 'combat';
const { browser, page } = await launch({ width: 960, height: 540 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
const r = await ev((id) => {
  const G = game, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  for (let i = 0; i < 30; i++) { route.drive(i / 30, 1 / 30); G.frame(1 / 30, i % 5 === 0); }
  const root = G.room?.group || G.world.root, B = Object.getPrototypeOf(new G.camera.constructor()).constructor;
  const why = (o) => {
    if (o.userData.drawBatched) return null;
    if (!o.isMesh) return null;
    if (o.isSkinnedMesh) return 'skinned'; if (o.isInstancedMesh) return 'instanced'; if (o.isBatchedMesh) return 'batched';
    if (o.userData.shadowProxy || o.userData.drawBatch) return null;
    if (o.castShadow) return 'casts its own shadow';
    if (!o.frustumCulled) return 'not frustum-culled';
    if (o.onBeforeRender !== B.prototype.onBeforeRender && o.onBeforeRender.toString().length > 20) return 'onBeforeRender';
    if (Array.isArray(o.material)) return 'material array';
    const m = o.material; if (m.transparent) return 'transparent'; if (m.depthWrite === false) return 'no depth write'; if (m.isShaderMaterial) return 'shader material';
    if (m.onBeforeCompile && m.onBeforeCompile.toString().length > 20 && !m.userData?.twin) return 'onBeforeCompile (' + (m.name || m.type) + ')';
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep) return 'keep (' + (p.name || p.type) + ')';
    for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return 'hidden';
    return 'eligible but alone in its cell / other';
  };
  const out = {}; let n = 0;
  root.traverse((o) => { const w = why(o); if (!w) return; n++; out[w] = (out[w] || 0) + 1; });
  return { room: G.room?.id || 'citadel', n, out, batched: G.drawBatch.stats() };
}, ID);
console.log(JSON.stringify(r, null, 1));
await browser.close();
